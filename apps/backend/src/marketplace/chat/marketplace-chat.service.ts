import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, MoreThan, Not, Repository } from 'typeorm';
import {
  AccionAuditoria,
  ArticuloMarketplace,
  AuditoriaService,
  type AuthUser,
  Calificacion,
  EstadoArticuloMarketplace,
  InteresadoMarketplace,
  MensajeMarketplace,
  type OrigenPeticion,
  SesionService,
  TipoActorAuditoria,
} from '../../core';
import { PushService } from '../../push/push.service';
import { TiempoRealGateway } from '../../tiempo-real/tiempo-real.gateway';
import {
  calcularReputaciones,
  esVisiblePara,
  estaVencido,
  primerNombre,
} from '../articulo-publico';
import type { ConversacionDto, HistorialDto } from '../dto/conversacion.dto';
import {
  aArticuloDelChat,
  aMensajePublico,
  type ConversacionResumen,
  type HistorialChat,
  type InteresadoResumen,
  LARGO_RESUMEN,
  MENSAJES_POR_PAGINA,
  TOPE_INTERESES_POR_DIA,
  TOPE_MENSAJES_POR_MINUTO,
  type MensajeEnviado,
  puedeEscribir,
} from './reglas-chat';

/** Recorta por caracteres y no por unidades UTF-16: no parte emojis. */
function recortar(texto: string, largo: number): string {
  return Array.from(texto).slice(0, largo).join('');
}

interface Resolucion {
  articulo: ArticuloMarketplace;
  interesadoId: string;
  soyPublicador: boolean;
  /** `interesados_marketplace.id`; null si el vecino aún no dice que le interesa. */
  conversacionId: number | null;
}

@Injectable()
export class MarketplaceChatService {
  constructor(
    @InjectRepository(ArticuloMarketplace)
    private readonly articuloRepo: Repository<ArticuloMarketplace>,
    @InjectRepository(MensajeMarketplace)
    private readonly mensajeRepo: Repository<MensajeMarketplace>,
    @InjectRepository(InteresadoMarketplace)
    private readonly interesadoRepo: Repository<InteresadoMarketplace>,
    @InjectRepository(Calificacion)
    private readonly calificacionRepo: Repository<Calificacion>,
    private readonly gateway: TiempoRealGateway,
    private readonly pushService: PushService,
    private readonly sesionService: SesionService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  private async nombreDe(ciudadanoId: string): Promise<string> {
    return primerNombre(
      await this.sesionService.nombreSesionActiva(ciudadanoId),
    );
  }

  /**
   * «Me interesa» / «Quiero intercambiar»: registra el interés y devuelve la
   * conversación, que queda abierta. Idempotente; el tope diario solo cuenta
   * altas nuevas.
   */
  async registrarInteres(
    articuloId: number,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<{ conversacionId: number }> {
    const articulo = await this.articuloRepo.findOne({
      where: { id: articuloId },
    });
    if (!articulo) {
      throw new NotFoundException(`Artículo ${articuloId} no encontrado`);
    }
    if (articulo.usuarioPublicadorId === user.ciudadanoId) {
      throw new ForbiddenException('No puedes mostrar interés en tu artículo');
    }
    const yo = user.ciudadanoId;
    const existente = await this.interesadoRepo.findOne({
      where: { articuloId, usuarioInteresadoId: yo },
    });
    if (existente) return { conversacionId: existente.id };

    const ahora = new Date();
    if (
      articulo.estado !== EstadoArticuloMarketplace.DISPONIBLE ||
      estaVencido(articulo, ahora)
    ) {
      throw new ConflictException('Este artículo ya no está disponible');
    }
    const hoy = await this.interesadoRepo.count({
      where: {
        usuarioInteresadoId: yo,
        createdAt: MoreThan(new Date(ahora.getTime() - 24 * 3_600_000)),
      },
    });
    if (hoy >= TOPE_INTERESES_POR_DIA) {
      throw new HttpException(
        `Llegaste al máximo de ${TOPE_INTERESES_POR_DIA} artículos de interés por día. Inténtalo mañana.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Si dos peticiones llegan a la vez, la UNIQUE deja pasar solo una alta.
    const resultado = await this.interesadoRepo
      .createQueryBuilder()
      .insert()
      .values({ articuloId, usuarioInteresadoId: yo })
      .orIgnore()
      .execute();
    const fila = await this.interesadoRepo.findOneOrFail({
      where: { articuloId, usuarioInteresadoId: yo },
    });
    if ((resultado.raw as { affectedRows?: number }).affectedRows) {
      await this.auditoriaService.registrar({
        tipoActor: TipoActorAuditoria.CIUDADANO,
        actor: user,
        entidad: 'interesados_marketplace',
        entidadId: fila.id,
        accion: AccionAuditoria.CREATE,
        datosNuevos: { articuloId },
        origen,
      });
    }
    return { conversacionId: fila.id };
  }

  /** Interesados de un artículo propio, con lo más reciente primero. */
  async interesados(
    articuloId: number,
    user: AuthUser,
  ): Promise<InteresadoResumen[]> {
    const articulo = await this.articuloRepo.findOne({
      where: { id: articuloId },
    });
    if (!articulo) {
      throw new NotFoundException(`Artículo ${articuloId} no encontrado`);
    }
    if (articulo.usuarioPublicadorId !== user.ciudadanoId) {
      throw new ForbiddenException('Solo quien publicó ve a los interesados');
    }
    const filas = await this.interesadoRepo.find({ where: { articuloId } });
    if (filas.length === 0) return [];
    const ids = filas.map((f) => f.usuarioInteresadoId);

    const mensajes = await this.mensajeRepo.find({
      where: { articuloId, interesadoId: In(ids) },
      order: { id: 'ASC' },
    });
    const calificaciones = await this.calificacionRepo.find({
      where: { usuarioCalificadoId: In(ids) },
      select: { usuarioCalificadoId: true, puntuacion: true },
    });
    const reputaciones = calcularReputaciones(calificaciones);

    const resumenes = await Promise.all(
      filas.map(async (f) => {
        const propios = mensajes.filter(
          (m) => m.interesadoId === f.usuarioInteresadoId,
        );
        const ultimo = propios.at(-1);
        const rep = reputaciones.get(f.usuarioInteresadoId);
        return {
          orden: (ultimo?.fechaMensaje ?? f.createdAt).getTime(),
          resumen: {
            conversacionId: f.id,
            nombre: await this.nombreDe(f.usuarioInteresadoId),
            calificacionPromedio: rep?.calificacionPromedio ?? null,
            cantidadCalificaciones: rep?.cantidadCalificaciones ?? 0,
            identidadVerificada: true as const,
            noLeidos: propios.filter(
              (m) => !m.leido && m.usuarioRemitenteId !== user.ciudadanoId,
            ).length,
            ultimoMensaje: ultimo
              ? {
                  contenido: recortar(ultimo.contenido, LARGO_RESUMEN),
                  fecha: ultimo.fechaMensaje,
                  esMio: ultimo.usuarioRemitenteId === user.ciudadanoId,
                }
              : null,
            reservado:
              articulo.estado === EstadoArticuloMarketplace.EN_NEGOCIACION &&
              articulo.usuarioCompradorId === f.usuarioInteresadoId,
          },
        };
      }),
    );
    return resumenes.sort((a, b) => b.orden - a.orden).map((r) => r.resumen);
  }

  /**
   * Traduce (artículo, conversación opaca, sesión) a los participantes. El id
   * del interesado nunca sale del servidor.
   */
  private async resolver(
    articuloId: number,
    conversacion: number | undefined,
    user: AuthUser,
  ): Promise<Resolucion> {
    const articulo = await this.articuloRepo.findOne({
      where: { id: articuloId },
    });
    if (!articulo) {
      throw new NotFoundException(`Artículo ${articuloId} no encontrado`);
    }

    if (articulo.usuarioPublicadorId === user.ciudadanoId) {
      if (conversacion === undefined) {
        throw new BadRequestException('Indica la conversación');
      }
      // Quien publica elige con cuál interesado habla, haya mensajes o no.
      const fila = await this.interesadoRepo.findOne({
        where: { id: conversacion, articuloId },
      });
      if (!fila) throw new NotFoundException('Conversación no encontrada');
      return {
        articulo,
        interesadoId: fila.usuarioInteresadoId,
        soyPublicador: true,
        conversacionId: fila.id,
      };
    }

    const fila = await this.interesadoRepo.findOne({
      where: { articuloId, usuarioInteresadoId: user.ciudadanoId },
    });
    if (!fila && !esVisiblePara(articulo, user.ciudadanoId, new Date())) {
      throw new NotFoundException(`Artículo ${articuloId} no encontrado`);
    }
    return {
      articulo,
      interesadoId: user.ciudadanoId,
      soyPublicador: false,
      conversacionId: fila?.id ?? null,
    };
  }

  async historial(
    articuloId: number,
    dto: HistorialDto,
    user: AuthUser,
  ): Promise<HistorialChat> {
    const ahora = new Date();
    const { articulo, interesadoId, soyPublicador, conversacionId } =
      await this.resolver(articuloId, dto.conversacion, user);

    const filas = await this.mensajeRepo.find({
      where: {
        articuloId,
        interesadoId,
        ...(dto.antesDe ? { id: LessThan(dto.antesDe) } : {}),
      },
      order: { id: 'DESC' },
      take: MENSAJES_POR_PAGINA + 1,
    });

    return {
      articulo: aArticuloDelChat(articulo, user.ciudadanoId, ahora),
      conversacionId,
      soyPublicador,
      otroNombre: await this.nombreDe(
        soyPublicador ? interesadoId : articulo.usuarioPublicadorId,
      ),
      // Sin fila de interés (aún no dice «Me interesa») tampoco puede escribir.
      puedoEscribir:
        conversacionId !== null && puedeEscribir(articulo, interesadoId, ahora),
      mensajes: filas
        .slice(0, MENSAJES_POR_PAGINA)
        .reverse()
        .map((m) => aMensajePublico(m, user.ciudadanoId)),
      hayMas: filas.length > MENSAJES_POR_PAGINA,
    };
  }

  async enviar(
    articuloId: number,
    dto: ConversacionDto,
    contenido: string,
    user: AuthUser,
  ): Promise<MensajeEnviado> {
    const ahora = new Date();
    const { articulo, interesadoId, soyPublicador, conversacionId } =
      await this.resolver(articuloId, dto.conversacion, user);
    if (conversacionId === null) {
      throw new ForbiddenException(
        'Indica primero que te interesa el artículo',
      );
    }
    if (!puedeEscribir(articulo, interesadoId, ahora)) {
      throw new ConflictException('Esta conversación es solo de lectura');
    }
    const ultimoMinuto = await this.mensajeRepo.count({
      where: {
        usuarioRemitenteId: user.ciudadanoId,
        fechaMensaje: MoreThan(new Date(ahora.getTime() - 60_000)),
      },
    });
    if (ultimoMinuto >= TOPE_MENSAJES_POR_MINUTO) {
      throw new HttpException(
        'Estás enviando mensajes muy rápido. Espera un momento.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const guardado = await this.mensajeRepo.save(
      this.mensajeRepo.create({
        articuloId,
        interesadoId,
        usuarioRemitenteId: user.ciudadanoId,
        contenido,
        fechaMensaje: ahora,
        leido: false,
      }),
    );
    const idConversacion = conversacionId;
    const destinatario = soyPublicador
      ? interesadoId
      : articulo.usuarioPublicadorId;
    // Cada participante recibe el mensaje con su propio `esMio`.
    for (const vecino of [user.ciudadanoId, destinatario]) {
      this.gateway.emitir(vecino, 'mensaje', {
        articuloId,
        conversacionId: idConversacion,
        mensaje: aMensajePublico(guardado, vecino),
      });
    }
    // Sin pestañas abiertas: aviso al celular. Nunca bloquea ni hace fallar el envío.
    if (!this.gateway.estaConectado(destinatario)) {
      // Sin el texto del mensaje: solo quién escribió.
      const nombre = await this.nombreDe(user.ciudadanoId);
      void this.pushService.enviarA(destinatario, {
        titulo: articulo.titulo,
        cuerpo: `${nombre} te escribió`,
        url: soyPublicador
          ? `/marketplace/${articulo.id}/chat`
          : `/marketplace/${articulo.id}/chat/${idConversacion}`,
        tag: `chat-${idConversacion}`,
      });
    }
    return {
      conversacionId: idConversacion,
      mensaje: aMensajePublico(guardado, user.ciudadanoId),
    };
  }

  /** Marca como leído solo lo recibido, nunca lo propio. */
  async marcarLeidos(
    articuloId: number,
    dto: ConversacionDto,
    user: AuthUser,
  ): Promise<{ marcados: number }> {
    const { articulo, interesadoId, soyPublicador, conversacionId } =
      await this.resolver(articuloId, dto.conversacion, user);
    const { affected } = await this.mensajeRepo.update(
      {
        articuloId,
        interesadoId,
        usuarioRemitenteId: Not(user.ciudadanoId),
        leido: false,
      },
      { leido: true },
    );
    const marcados = affected ?? 0;
    if (marcados > 0 && conversacionId !== null) {
      this.gateway.emitir(
        soyPublicador ? interesadoId : articulo.usuarioPublicadorId,
        'leidos',
        { articuloId, conversacionId },
      );
    }
    return { marcados };
  }

  async conversaciones(user: AuthUser): Promise<ConversacionResumen[]> {
    const yo = user.ciudadanoId;
    const ahora = new Date();

    // ponytail: OR sobre el join impide usar índice; con cientos de conversaciones por vecino, separar en UNION.
    const grupos = await this.mensajeRepo
      .createQueryBuilder('m')
      .innerJoin('m.articulo', 'a')
      .innerJoin(
        InteresadoMarketplace,
        'i',
        'i.articulo_id = m.articulo_id AND i.usuario_interesado_id = m.interesado_id',
      )
      .select('m.articulo_id', 'articuloId')
      .addSelect('m.interesado_id', 'interesadoId')
      .addSelect('i.id', 'conversacionId')
      .addSelect('MAX(m.id)', 'ultimoId')
      .addSelect(
        'SUM(CASE WHEN m.leido = 0 AND m.usuario_remitente_id <> :yo THEN 1 ELSE 0 END)',
        'noLeidos',
      )
      .where('(m.interesado_id = :yo OR a.usuario_publicador_id = :yo)', { yo })
      .groupBy('m.articulo_id')
      .addGroupBy('m.interesado_id')
      .addGroupBy('i.id')
      .orderBy('ultimoId', 'DESC')
      .limit(100)
      .getRawMany<{
        articuloId: string | number;
        conversacionId: string | number;
        ultimoId: string | number;
        noLeidos: string | number | null;
      }>();
    if (grupos.length === 0) return [];

    const [ultimos, articulos] = await Promise.all([
      this.mensajeRepo.find({
        where: { id: In(grupos.map((g) => Number(g.ultimoId))) },
      }),
      this.articuloRepo.find({
        where: { id: In(grupos.map((g) => Number(g.articuloId))) },
      }),
    ]);
    const ultimoPorId = new Map(ultimos.map((m) => [m.id, m]));
    const articuloPorId = new Map(articulos.map((a) => [a.id, a]));

    return grupos.flatMap((g) => {
      const ultimo = ultimoPorId.get(Number(g.ultimoId));
      const articulo = articuloPorId.get(Number(g.articuloId));
      if (!ultimo || !articulo) return [];
      return [
        {
          conversacionId: Number(g.conversacionId),
          articulo: aArticuloDelChat(articulo, yo, ahora),
          soyPublicador: articulo.usuarioPublicadorId === yo,
          ultimoMensaje: {
            contenido: recortar(ultimo.contenido, LARGO_RESUMEN),
            fecha: ultimo.fechaMensaje,
            esMio: ultimo.usuarioRemitenteId === yo,
          },
          noLeidos: Number(g.noLeidos ?? 0),
        },
      ];
    });
  }
}
