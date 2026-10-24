import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt, timingSafeEqual } from 'node:crypto';
import {
  type EntityManager,
  FindOptionsWhere,
  In,
  LessThan,
  Like,
  MoreThan,
  QueryFailedError,
  Repository,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  AccionAuditoria,
  ArticuloMarketplace,
  AuditoriaService,
  type AuthUser,
  Calificacion,
  EstadoArticuloMarketplace,
  InteresadoMarketplace,
  type OrigenPeticion,
  SesionService,
  TipoActorAuditoria,
  type TransaccionCircularCredits,
} from '../core';
import {
  type ArchivoParaEnviar,
  type ArchivoSubido,
  ArchivosService,
} from '../archivos/archivos.service';
import { CreditosService } from '../creditos/creditos.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ResiduosService } from '../residuos/residuos.service';
import {
  aArticuloPublico,
  type ArticuloPublico,
  calcularReputaciones,
  coordenadasDe,
  esVisiblePara,
  fechaExpiracionDesde,
  LARGO_TITULO_AVISO,
  primerNombre,
  recortar,
} from './articulo-publico';
import type { CalificarArticuloDto } from './dto/calificar-articulo.dto';
import type { FiltrarArticulosDto } from './dto/filtrar-articulos.dto';
import type { OrigenDto } from './dto/origen.dto';
import type { PublicarArticuloDto } from './dto/publicar-articulo.dto';
import { LimiteOrigenesService } from './ubicacion/limite-origenes.service';
import {
  aproximarParaGuardar,
  type BandaDistancia,
  type Coordenadas,
} from './ubicacion/ubicacion-marketplace';

/** Fallos del código de entrega que bloquean la entrega hasta liberar y volver a reservar. */
export const MAX_INTENTOS_CODIGO = 5;

/** Subcarpeta de `UPLOADS_DIR` para las fotos de los artículos. */
export const SUBCARPETA_FOTOS = 'marketplace';

interface ArticuloConBanda {
  articulo: ArticuloMarketplace;
  banda: BandaDistancia | null;
}

/** Respuesta de `POST /marketplace/articulos/:id/calificacion`. */
export interface CalificacionPublica {
  puntuacion: number;
  comentario: string | null;
  fecha: Date;
}

function esClaveDuplicada(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const { code } = error.driverError as { code?: string };
  return code === 'ER_DUP_ENTRY';
}

const origenDe = ({ lat, lon }: OrigenDto): Coordenadas | null =>
  lat !== undefined && lon !== undefined
    ? { latitud: lat, longitud: lon }
    : null;

/** Escapa los comodines de LIKE para que el texto se busque tal cual. */
const patronLike = (texto: string): string =>
  `%${texto.replace(/[\\%_]/g, '\\$&')}%`;

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(ArticuloMarketplace)
    private readonly articuloRepository: Repository<ArticuloMarketplace>,
    @InjectRepository(Calificacion)
    private readonly calificacionRepository: Repository<Calificacion>,
    private readonly residuosService: ResiduosService,
    private readonly archivosService: ArchivosService,
    private readonly limiteOrigenes: LimiteOrigenesService,
    private readonly creditosService: CreditosService,
    @InjectRepository(InteresadoMarketplace)
    private readonly interesadoRepository: Repository<InteresadoMarketplace>,
    private readonly sesionService: SesionService,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** Aviso de la campanita; el servicio nunca lanza, así que no bloquea la operación. */
  private avisar(
    ciudadanoId: string,
    tipo: string,
    titulo: string,
    cuerpo: string,
    articuloId: number,
    sufijoUrl = '',
  ): void {
    void this.notificaciones.notificar(ciudadanoId, {
      tipo,
      titulo,
      cuerpo,
      url: `/marketplace/${articuloId}${sufijoUrl}`,
    });
  }

  private async nombreDe(ciudadanoId: string): Promise<string> {
    return primerNombre(
      await this.sesionService.nombreSesionActiva(ciudadanoId),
    );
  }

  /** Los vecinos con interés en el artículo, salvo `excepto`. */
  private async interesadosDe(
    articuloId: number,
    excepto?: string,
  ): Promise<string[]> {
    const filas = await this.interesadoRepository.find({
      where: { articuloId },
    });
    return filas
      .map((f) => f.usuarioInteresadoId)
      .filter((id) => id !== excepto);
  }

  /** Constancia del cambio de estado; solo el estado, nunca el código. */
  private auditarEstado(
    user: AuthUser,
    id: number,
    estado: EstadoArticuloMarketplace,
    origen?: OrigenPeticion,
  ): Promise<void> {
    return this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: user,
      entidad: 'articulos_marketplace',
      entidadId: id,
      accion: AccionAuditoria.UPDATE,
      datosNuevos: { estado },
      origen,
    });
  }

  async publicar(
    dto: PublicarArticuloDto,
    foto: ArchivoSubido | undefined,
    user: AuthUser,
  ): Promise<ArticuloPublico> {
    const residuo = await this.residuosService.findCatalogoById(
      dto.residuoCatalogoId,
    );
    if (!residuo) {
      throw new NotFoundException(
        `Residuo de catálogo ${dto.residuoCatalogoId} no encontrado`,
      );
    }

    // Nunca se guarda el punto exacto que manda el teléfono.
    const origen = origenDe(dto);
    const punto = origen ? aproximarParaGuardar(origen) : null;

    const fotoPath = foto
      ? await this.archivosService.guardarImagen(foto, SUBCARPETA_FOTOS)
      : null;

    const ahora = new Date();
    const articulo = this.articuloRepository.create({
      usuarioPublicadorId: user.ciudadanoId,
      residuoCatalogoId: residuo.id,
      tipo: dto.tipo,
      titulo: dto.titulo.trim(),
      descripcion: dto.descripcion?.trim() || null,
      estado: EstadoArticuloMarketplace.DISPONIBLE,
      fotoPath,
      latitud: punto ? String(punto.latitud) : null,
      longitud: punto ? String(punto.longitud) : null,
      fechaPublicacion: ahora,
      fechaExpiracion: fechaExpiracionDesde(ahora),
      usuarioCompradorId: null,
      fechaTransaccion: null,
    });

    let guardado: ArticuloMarketplace;
    try {
      guardado = await this.articuloRepository.save(articulo);
    } catch (error) {
      if (fotoPath) await this.archivosService.borrar(fotoPath);
      throw error;
    }

    guardado.residuoCatalogo = residuo;
    const [publico] = await this.presentar(
      [{ articulo: guardado, banda: null }],
      user,
    );
    return publico;
  }

  /** Solo artículos disponibles y vigentes, más recientes primero. */
  async listar(
    filtros: FiltrarArticulosDto,
    user: AuthUser,
  ): Promise<ArticuloPublico[]> {
    const base: FindOptionsWhere<ArticuloMarketplace> = {
      estado: EstadoArticuloMarketplace.DISPONIBLE,
      fechaExpiracion: MoreThan(new Date()),
    };
    if (filtros.tipo) base.tipo = filtros.tipo;
    if (filtros.categoria)
      base.residuoCatalogo = { categoria: filtros.categoria };

    const texto = filtros.texto?.trim();
    const where = texto
      ? [
          { ...base, titulo: Like(patronLike(texto)) },
          { ...base, descripcion: Like(patronLike(texto)) },
        ]
      : base;

    const articulos = await this.articuloRepository.find({
      where,
      relations: { residuoCatalogo: true },
      order: { fechaPublicacion: 'DESC', id: 'DESC' },
    });

    const origen = origenDe(filtros);
    let conBanda = articulos.map((articulo) => ({
      articulo,
      banda: this.bandaPara(articulo, origen, user),
    }));
    if (filtros.banda) {
      conBanda = conBanda.filter(({ banda }) => banda === filtros.banda);
    }

    return this.presentar(conBanda, user);
  }

  async obtener(
    id: number,
    origen: OrigenDto,
    user: AuthUser,
  ): Promise<ArticuloPublico> {
    const articulo = await this.buscarVisible(id, user, true);
    const [publico] = await this.presentar(
      [{ articulo, banda: this.bandaPara(articulo, origenDe(origen), user) }],
      user,
    );
    return publico;
  }

  /** Los de la sesión, en todos los estados, más recientes primero. */
  async misArticulos(user: AuthUser): Promise<ArticuloPublico[]> {
    const articulos = await this.articuloRepository.find({
      where: { usuarioPublicadorId: user.ciudadanoId },
      relations: { residuoCatalogo: true },
      order: { fechaPublicacion: 'DESC', id: 'DESC' },
    });
    return this.presentar(
      articulos.map((articulo) => ({ articulo, banda: null })),
      user,
    );
  }

  /** Quien publicó saca del Marketplace un artículo todavía disponible. */
  async retirar(id: number, user: AuthUser): Promise<ArticuloPublico> {
    await this.buscarPropio(
      id,
      user,
      'Solo puedes retirar tus propias publicaciones',
    );
    await this.transicionar(
      id,
      { estado: EstadoArticuloMarketplace.DISPONIBLE },
      { estado: EstadoArticuloMarketplace.RETIRADO },
      'Solo se puede retirar un artículo disponible',
    );
    return this.obtener(id, {}, user);
  }

  /**
   * Quien publicó elige a uno de los interesados: el artículo queda reservado
   * y se genera el código de entrega, que solo verá quien recibe.
   */
  async reservar(
    id: number,
    conversacionId: number,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<ArticuloPublico> {
    const articulo = await this.buscarPropio(
      id,
      user,
      'Solo puedes reservar tus propias publicaciones',
    );
    const interesado = await this.interesadoRepository.findOne({
      where: { id: conversacionId, articuloId: id },
    });
    if (!interesado) throw new NotFoundException('Interesado no encontrado');

    const ahora = new Date();
    await this.transicionar(
      id,
      {
        estado: EstadoArticuloMarketplace.DISPONIBLE,
        fechaExpiracion: MoreThan(ahora),
      },
      {
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: interesado.usuarioInteresadoId,
        fechaReserva: ahora,
        codigoEntrega: String(randomInt(0, 1_000_000)).padStart(6, '0'),
        intentosCodigo: 0,
      },
      'Este artículo ya no está disponible',
    );
    await this.auditarEstado(
      user,
      id,
      EstadoArticuloMarketplace.EN_NEGOCIACION,
      origen,
    );
    const titulo = recortar(articulo.titulo, LARGO_TITULO_AVISO);
    const receptor = interesado.usuarioInteresadoId;
    this.avisar(
      receptor,
      'reserva',
      'Te reservaron un artículo',
      `${await this.nombreDe(user.ciudadanoId)} te reservó el ${titulo}`,
      id,
    );
    for (const otro of await this.interesadosDe(id, receptor)) {
      this.avisar(
        otro,
        'reserva_otro',
        'Ya fue reservado',
        `El ${titulo} fue reservado por otro vecino`,
        id,
        '/chat',
      );
    }
    return this.obtener(id, {}, user);
  }

  /** Quien publicó rechaza al interesado y el artículo vuelve a estar disponible. */
  async liberar(
    id: number,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<ArticuloPublico> {
    const articulo = await this.buscarPropio(
      id,
      user,
      'Solo puedes liberar tus propias publicaciones',
    );
    await this.transicionar(
      id,
      { estado: EstadoArticuloMarketplace.EN_NEGOCIACION },
      {
        estado: EstadoArticuloMarketplace.DISPONIBLE,
        usuarioCompradorId: null,
        codigoEntrega: null,
        fechaReserva: null,
      },
      'Solo se puede liberar un artículo reservado',
    );
    await this.auditarEstado(
      user,
      id,
      EstadoArticuloMarketplace.DISPONIBLE,
      origen,
    );
    // Quien tenía la reserva también es un interesado; el Set evita repetirlo.
    const destinatarios = new Set([
      ...(articulo.usuarioCompradorId ? [articulo.usuarioCompradorId] : []),
      ...(await this.interesadosDe(id)),
    ]);
    for (const vecino of destinatarios) {
      this.avisar(
        vecino,
        'liberado',
        'Volvió a estar disponible',
        `El ${recortar(articulo.titulo, LARGO_TITULO_AVISO)} está disponible otra vez`,
        id,
      );
    }
    return this.obtener(id, {}, user);
  }

  /**
   * Quien publicó cierra el intercambio con el código que le dicta quien
   * recibe, y recibe los créditos de la entrega, en la misma transacción: o
   * pasan las dos cosas o ninguna. 5 códigos errados bloquean la entrega.
   */
  async entregar(
    id: number,
    codigo: string,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<ArticuloPublico> {
    const articulo = await this.buscarPropio(
      id,
      user,
      'Solo puedes entregar tus propias publicaciones',
    );
    const mensajeConflicto = 'Solo se puede entregar un artículo reservado';
    if (
      articulo.estado !== EstadoArticuloMarketplace.EN_NEGOCIACION ||
      !articulo.usuarioCompradorId ||
      !articulo.codigoEntrega
    ) {
      throw new ConflictException(mensajeConflicto);
    }
    const mensajeBloqueado = 'Código bloqueado: libera y vuelve a reservar';
    if (articulo.intentosCodigo >= MAX_INTENTOS_CODIGO) {
      throw new ConflictException(mensajeBloqueado);
    }

    const esperado = Buffer.from(articulo.codigoEntrega);
    const recibido = Buffer.from(codigo);
    if (
      esperado.length !== recibido.length ||
      !timingSafeEqual(esperado, recibido)
    ) {
      // Atómico: dos intentos a la vez no se pisan el contador.
      const { affected } = await this.articuloRepository
        .createQueryBuilder()
        .update(ArticuloMarketplace)
        .set({ intentosCodigo: () => 'intentos_codigo + 1' })
        .where('id = :id AND estado = :estado AND intentos_codigo < :max', {
          id,
          estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
          max: MAX_INTENTOS_CODIGO,
        })
        .execute();
      if (!affected || articulo.intentosCodigo + 1 >= MAX_INTENTOS_CODIGO) {
        throw new ConflictException(mensajeBloqueado);
      }
      throw new BadRequestException('Código incorrecto');
    }

    const receptorId = articulo.usuarioCompradorId;
    const abono = await this.articuloRepository.manager.transaction(
      async (manager) => {
        // También con el mismo receptor: si entre la lectura y el UPDATE se liberó
        // y lo reservó otra persona, no se le entrega a alguien que no se eligió.
        await this.transicionar(
          id,
          {
            estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
            usuarioCompradorId: receptorId,
            intentosCodigo: LessThan(MAX_INTENTOS_CODIGO),
          },
          {
            estado: EstadoArticuloMarketplace.COMPLETADO,
            fechaTransaccion: new Date(),
            codigoEntrega: null,
          },
          mensajeConflicto,
          manager,
        );
        return this.creditosService.otorgarPorEntrega(manager, articulo);
      },
    );
    await this.auditarEstado(
      user,
      id,
      EstadoArticuloMarketplace.COMPLETADO,
      origen,
    );
    // Tras el commit: nada de esto bloquea ni deshace la entrega.
    this.avisar(
      receptorId,
      'entrega',
      'Entrega confirmada',
      `Recibiste el ${recortar(articulo.titulo, LARGO_TITULO_AVISO)}`,
      id,
    );
    this.creditosService.avisarAbono(abono);
    return this.obtener(id, {}, user);
  }

  /**
   * Quien recibió el artículo califica a quien lo publicó, una sola vez. Con 4
   * o 5 estrellas, quien publicó recibe el bono en la misma transacción.
   */
  async calificar(
    id: number,
    dto: CalificarArticuloDto,
    user: AuthUser,
  ): Promise<CalificacionPublica> {
    const articulo = await this.buscarVisible(id, user, false);

    if (articulo.usuarioCompradorId !== user.ciudadanoId) {
      throw new ForbiddenException(
        'Solo quien recibió el artículo puede calificarlo',
      );
    }
    if (articulo.estado !== EstadoArticuloMarketplace.COMPLETADO) {
      throw new ConflictException(
        'Solo se puede calificar un intercambio entregado',
      );
    }

    const calificacion = this.calificacionRepository.create({
      usuarioCalificadorId: user.ciudadanoId,
      usuarioCalificadoId: articulo.usuarioPublicadorId,
      articuloId: articulo.id,
      puntuacion: dto.puntuacion,
      comentario: dto.comentario?.trim() || null,
      fechaCalificacion: new Date(),
    });

    let guardada: {
      nueva: Calificacion;
      abono: TransaccionCircularCredits | null;
    };
    try {
      guardada = await this.articuloRepository.manager.transaction(
        async (manager) => {
          const nueva = await manager.save(Calificacion, calificacion);
          const abono = await this.creditosService.otorgarPorEstrellas(
            manager,
            articulo,
            dto.puntuacion,
          );
          return { nueva, abono };
        },
      );
    } catch (error) {
      if (esClaveDuplicada(error)) {
        throw new ConflictException('Ya calificaste este intercambio');
      }
      throw error;
    }

    this.avisar(
      articulo.usuarioPublicadorId,
      'calificacion',
      'Te calificaron',
      `Recibiste ${dto.puntuacion} ${dto.puntuacion === 1 ? 'estrella' : 'estrellas'} por el ${recortar(articulo.titulo, LARGO_TITULO_AVISO)}`,
      id,
    );
    if (guardada.abono) this.creditosService.avisarAbono(guardada.abono);

    return {
      puntuacion: guardada.nueva.puntuacion,
      comentario: guardada.nueva.comentario,
      fecha: guardada.nueva.fechaCalificacion,
    };
  }

  /** La foto del artículo, con la misma visibilidad que el detalle. */
  async foto(id: number, user: AuthUser): Promise<ArchivoParaEnviar> {
    const articulo = await this.buscarVisible(id, user, false);
    if (!articulo.fotoPath) {
      throw new NotFoundException('Foto no encontrada');
    }
    return this.archivosService.abrir(articulo.fotoPath);
  }

  /**
   * El artículo si la sesión puede verlo. Si no puede, 404 y no 403: así no
   * se revela que existe un artículo reservado o retirado de otra persona.
   */
  private async buscarVisible(
    id: number,
    user: AuthUser,
    conResiduo: boolean,
  ): Promise<ArticuloMarketplace> {
    const articulo = await this.articuloRepository.findOne({
      where: { id },
      relations: { residuoCatalogo: conResiduo },
    });
    if (!articulo || !esVisiblePara(articulo, user.ciudadanoId, new Date())) {
      throw new NotFoundException(`Artículo ${id} no encontrado`);
    }
    return articulo;
  }

  /** El artículo si es de la sesión: 404 si no puede verlo, 403 si es ajeno. */
  private async buscarPropio(
    id: number,
    user: AuthUser,
    mensajeAjeno: string,
  ): Promise<ArticuloMarketplace> {
    const articulo = await this.buscarVisible(id, user, false);
    if (articulo.usuarioPublicadorId !== user.ciudadanoId) {
      throw new ForbiddenException(mensajeAjeno);
    }
    return articulo;
  }

  /**
   * Cambia el estado con un solo UPDATE condicionado al estado esperado. Si
   * otra petición lo movió antes (dos "Lo quiero" a la vez, o retirar mientras
   * alguien lo pide), no se toca nada y responde 409.
   */
  private async transicionar(
    id: number,
    esperado: FindOptionsWhere<ArticuloMarketplace>,
    cambios: QueryDeepPartialEntity<ArticuloMarketplace>,
    mensajeConflicto: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repositorio =
      manager?.getRepository(ArticuloMarketplace) ?? this.articuloRepository;
    const { affected } = await repositorio.update({ ...esperado, id }, cambios);
    if (!affected) {
      throw new ConflictException(mensajeConflicto);
    }
  }

  /**
   * Banda entre quien mira y el artículo. Lo propio no lleva banda: la
   * distancia a tu propia casa no aporta. Siempre por `LimiteOrigenesService`,
   * que aplica el límite de orígenes distintos contra la triangulación.
   */
  private bandaPara(
    articulo: ArticuloMarketplace,
    origen: Coordenadas | null,
    user: AuthUser,
  ): BandaDistancia | null {
    if (!origen || articulo.usuarioPublicadorId === user.ciudadanoId) {
      return null;
    }
    return this.limiteOrigenes.bandaPara(
      user.ciudadanoId,
      origen,
      coordenadasDe(articulo),
    );
  }

  /** Agrega la reputación de cada publicador y si la sesión ya calificó. */
  private async presentar(
    items: ArticuloConBanda[],
    user: AuthUser,
  ): Promise<ArticuloPublico[]> {
    if (items.length === 0) return [];

    const publicadores = [
      ...new Set(items.map(({ articulo }) => articulo.usuarioPublicadorId)),
    ];
    const calificaciones = await this.calificacionRepository.find({
      where: { usuarioCalificadoId: In(publicadores) },
      select: { usuarioCalificadoId: true, puntuacion: true },
    });
    const reputaciones = calcularReputaciones(calificaciones);

    const recibidos = items
      .map(({ articulo }) => articulo)
      .filter(
        (a) =>
          a.estado === EstadoArticuloMarketplace.COMPLETADO &&
          a.usuarioCompradorId === user.ciudadanoId,
      )
      .map((a) => a.id);
    const calificados = new Set(
      recibidos.length === 0
        ? []
        : (
            await this.calificacionRepository.find({
              where: {
                articuloId: In(recibidos),
                usuarioCalificadorId: user.ciudadanoId,
              },
              select: { articuloId: true },
            })
          ).map((c) => c.articuloId),
    );

    // Solo quien publicó ve el nombre de a quién reservó.
    const nombres = new Map<string, string>();
    for (const { articulo } of items) {
      const receptor = articulo.usuarioCompradorId;
      if (
        receptor &&
        articulo.usuarioPublicadorId === user.ciudadanoId &&
        articulo.estado === EstadoArticuloMarketplace.EN_NEGOCIACION &&
        !nombres.has(receptor)
      ) {
        nombres.set(
          receptor,
          primerNombre(await this.sesionService.nombreSesionActiva(receptor)),
        );
      }
    }

    return items.map(({ articulo, banda }) =>
      aArticuloPublico(articulo, {
        ciudadanoId: user.ciudadanoId,
        banda,
        reputacion: reputaciones.get(articulo.usuarioPublicadorId),
        yaCalifico: calificados.has(articulo.id),
        reservadoPara: articulo.usuarioCompradorId
          ? nombres.get(articulo.usuarioCompradorId)
          : null,
      }),
    );
  }
}
