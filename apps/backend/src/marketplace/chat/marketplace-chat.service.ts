import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Not, Repository } from 'typeorm';
import {
  ArticuloMarketplace,
  type AuthUser,
  MensajeMarketplace,
} from '../../core';
import { PushService } from '../../push/push.service';
import { esVisiblePara } from '../articulo-publico';
import type { ConversacionDto, HistorialDto } from '../dto/conversacion.dto';
import { MarketplaceChatGateway } from './marketplace-chat.gateway';
import {
  aArticuloDelChat,
  aMensajePublico,
  type ConversacionResumen,
  type HistorialChat,
  LARGO_RESUMEN,
  MENSAJES_POR_PAGINA,
  type MensajeEnviado,
  puedeEscribir,
} from './reglas-chat';

interface Resolucion {
  articulo: ArticuloMarketplace;
  interesadoId: string;
  soyPublicador: boolean;
  /** MIN(id) de los mensajes de la conversación; null si aún no hay. */
  conversacionId: number | null;
}

@Injectable()
export class MarketplaceChatService {
  constructor(
    @InjectRepository(ArticuloMarketplace)
    private readonly articuloRepo: Repository<ArticuloMarketplace>,
    @InjectRepository(MensajeMarketplace)
    private readonly mensajeRepo: Repository<MensajeMarketplace>,
    private readonly gateway: MarketplaceChatGateway,
    private readonly pushService: PushService,
  ) {}

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

    const primerMensaje = (interesadoId: string) =>
      this.mensajeRepo.findOne({
        where: { articuloId, interesadoId },
        order: { id: 'ASC' },
        select: { id: true },
      });

    if (articulo.usuarioPublicadorId === user.ciudadanoId) {
      if (conversacion === undefined) {
        throw new BadRequestException('Indica la conversación');
      }
      // Quien publica no inicia conversaciones: solo responde las existentes.
      const m = await this.mensajeRepo.findOne({
        where: { id: conversacion, articuloId },
      });
      if (!m) throw new NotFoundException('Conversación no encontrada');
      const primero = await primerMensaje(m.interesadoId);
      return {
        articulo,
        interesadoId: m.interesadoId,
        soyPublicador: true,
        conversacionId: primero?.id ?? m.id,
      };
    }

    const primero = await primerMensaje(user.ciudadanoId);
    if (!primero && !esVisiblePara(articulo, user.ciudadanoId, new Date())) {
      throw new NotFoundException(`Artículo ${articuloId} no encontrado`);
    }
    return {
      articulo,
      interesadoId: user.ciudadanoId,
      soyPublicador: false,
      conversacionId: primero?.id ?? null,
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
      puedoEscribir: puedeEscribir(articulo, interesadoId, ahora),
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
    if (!puedeEscribir(articulo, interesadoId, ahora)) {
      throw new ConflictException('Esta conversación es solo de lectura');
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
    const idConversacion = conversacionId ?? guardado.id;
    const destinatario = soyPublicador
      ? interesadoId
      : articulo.usuarioPublicadorId;
    // Cada participante recibe el mensaje con su propio `esMio`.
    for (const vecino of [user.ciudadanoId, destinatario]) {
      this.gateway.emitirMensaje(vecino, {
        articuloId,
        conversacionId: idConversacion,
        mensaje: aMensajePublico(guardado, vecino),
      });
    }
    // Sin pestañas abiertas: aviso al celular. Nunca bloquea ni hace fallar el envío.
    if (!this.gateway.estaConectado(destinatario)) {
      void this.pushService.enviarA(destinatario, {
        titulo: articulo.titulo,
        cuerpo: contenido.slice(0, 80),
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
      this.gateway.emitirLeidos(
        soyPublicador ? interesadoId : articulo.usuarioPublicadorId,
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
      .select('m.articulo_id', 'articuloId')
      .addSelect('m.interesado_id', 'interesadoId')
      .addSelect('MIN(m.id)', 'conversacionId')
      .addSelect('MAX(m.id)', 'ultimoId')
      .addSelect(
        'SUM(CASE WHEN m.leido = 0 AND m.usuario_remitente_id <> :yo THEN 1 ELSE 0 END)',
        'noLeidos',
      )
      .where('(m.interesado_id = :yo OR a.usuario_publicador_id = :yo)', { yo })
      .groupBy('m.articulo_id')
      .addGroupBy('m.interesado_id')
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
            contenido: ultimo.contenido.slice(0, LARGO_RESUMEN),
            fecha: ultimo.fechaMensaje,
            esMio: ultimo.usuarioRemitenteId === yo,
          },
          noLeidos: Number(g.noLeidos ?? 0),
        },
      ];
    });
  }
}
