import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  In,
  Like,
  MoreThan,
  QueryFailedError,
  Repository,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  ArticuloMarketplace,
  type AuthUser,
  Calificacion,
  EstadoArticuloMarketplace,
} from '../core';
import {
  type ArchivoParaEnviar,
  type ArchivoSubido,
  ArchivosService,
} from '../archivos/archivos.service';
import { ResiduosService } from '../residuos/residuos.service';
import {
  aArticuloPublico,
  type ArticuloPublico,
  calcularReputaciones,
  coordenadasDe,
  esVisiblePara,
  fechaExpiracionDesde,
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
  ) {}

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

  /** "Lo quiero": reserva el artículo para la sesión (spec §4). */
  async solicitar(id: number, user: AuthUser): Promise<ArticuloPublico> {
    const articulo = await this.articuloRepository.findOne({ where: { id } });
    if (!articulo) {
      throw new NotFoundException(`Artículo ${id} no encontrado`);
    }
    if (articulo.usuarioPublicadorId === user.ciudadanoId) {
      throw new ForbiddenException('No puedes pedir tu propio artículo');
    }

    await this.transicionar(
      id,
      {
        estado: EstadoArticuloMarketplace.DISPONIBLE,
        fechaExpiracion: MoreThan(new Date()),
      },
      {
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: user.ciudadanoId,
      },
      'Este artículo ya no está disponible',
    );
    return this.obtener(id, {}, user);
  }

  /** Quien publicó rechaza al interesado y el artículo vuelve a estar disponible. */
  async liberar(id: number, user: AuthUser): Promise<ArticuloPublico> {
    await this.buscarPropio(
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
      },
      'Solo se puede liberar un artículo reservado',
    );
    return this.obtener(id, {}, user);
  }

  /** Quien publicó cierra el intercambio con quien lo reservó. */
  async entregar(id: number, user: AuthUser): Promise<ArticuloPublico> {
    const articulo = await this.buscarPropio(
      id,
      user,
      'Solo puedes entregar tus propias publicaciones',
    );
    const mensajeConflicto = 'Solo se puede entregar un artículo reservado';
    if (
      articulo.estado !== EstadoArticuloMarketplace.EN_NEGOCIACION ||
      !articulo.usuarioCompradorId
    ) {
      throw new ConflictException(mensajeConflicto);
    }

    // También con el mismo receptor: si entre la lectura y el UPDATE se liberó
    // y lo reservó otra persona, no se le entrega a alguien que no se eligió.
    await this.transicionar(
      id,
      {
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: articulo.usuarioCompradorId,
      },
      {
        estado: EstadoArticuloMarketplace.COMPLETADO,
        fechaTransaccion: new Date(),
      },
      mensajeConflicto,
    );
    return this.obtener(id, {}, user);
  }

  /** Quien recibió el artículo califica a quien lo publicó, una sola vez. */
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

    let guardada: Calificacion;
    try {
      guardada = await this.calificacionRepository.save(calificacion);
    } catch (error) {
      if (esClaveDuplicada(error)) {
        throw new ConflictException('Ya calificaste este intercambio');
      }
      throw error;
    }

    return {
      puntuacion: guardada.puntuacion,
      comentario: guardada.comentario,
      fecha: guardada.fechaCalificacion,
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
  ): Promise<void> {
    const { affected } = await this.articuloRepository.update(
      { ...esperado, id },
      cambios,
    );
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

    return items.map(({ articulo, banda }) =>
      aArticuloPublico(articulo, {
        ciudadanoId: user.ciudadanoId,
        banda,
        reputacion: reputaciones.get(articulo.usuarioPublicadorId),
        yaCalifico: calificados.has(articulo.id),
      }),
    );
  }
}
