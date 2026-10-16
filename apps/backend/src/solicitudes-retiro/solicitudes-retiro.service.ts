import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  AccionAuditoria,
  aplicarTransicion,
  AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  FotoRetiro,
  type OrigenPeticion,
  RevisionSolicitud,
  RolAdministrador,
  SolicitudRetiro,
  TipoActorAuditoria,
  TipoFotoRetiro,
  TransicionInvalidaError,
  UsuarioCiudadano,
} from '../core';
import {
  ArchivosService,
  type ArchivoParaEnviar,
  type ArchivoSubido,
} from '../archivos/archivos.service';
import { ResiduosService } from '../residuos/residuos.service';
import { CancelarSolicitudRetiroDto } from './dto/cancelar-solicitud-retiro.dto';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { FilterSolicitudesRetiroDto } from './dto/filter-solicitudes-retiro.dto';
import { ReenviarSolicitudRetiroDto } from './dto/reenviar-solicitud-retiro.dto';
import {
  aSolicitudPublica,
  fotoAntesPath,
  type RevisionVisible,
  type SolicitudPublica,
} from './solicitud-publica';

export type { RevisionVisible, SolicitudPublica };

/** Subcarpeta de `UPLOADS_DIR` para las fotos de solicitudes. */
const SUBCARPETA_FOTOS = 'solicitudes-retiro';

@Injectable()
export class SolicitudesRetiroService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRetiroRepository: Repository<SolicitudRetiro>,
    @InjectRepository(UsuarioCiudadano)
    private readonly usuarioCiudadanoRepository: Repository<UsuarioCiudadano>,
    @InjectRepository(RevisionSolicitud)
    private readonly revisionRepository: Repository<RevisionSolicitud>,
    @InjectRepository(FotoRetiro)
    private readonly fotoRetiroRepository: Repository<FotoRetiro>,
    private readonly residuosService: ResiduosService,
    private readonly auditoriaService: AuditoriaService,
    private readonly archivosService: ArchivosService,
    @Optional()
    private readonly mailService?: MailService,
  ) {}

  async create(
    dto: CreateSolicitudRetiroDto,
    foto: ArchivoSubido | undefined,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudPublica> {
    if (dto.usuarioCiudadanoId !== user.ciudadanoId) {
      throw new ForbiddenException(
        'No puedes crear solicitudes en nombre de otro ciudadano',
      );
    }

    if (!foto) {
      throw new BadRequestException('La foto de la solicitud es obligatoria');
    }

    const direccionRetiro = dto.direccionRetiro.trim();
    if (!direccionRetiro) {
      throw new BadRequestException('La dirección de retiro es obligatoria');
    }

    const usuario = await this.usuarioCiudadanoRepository.findOne({
      where: { id: dto.usuarioCiudadanoId },
    });

    if (!usuario) {
      throw new NotFoundException(
        `Usuario ciudadano ${dto.usuarioCiudadanoId} no encontrado`,
      );
    }

    if (!usuario.activo) {
      throw new BadRequestException('El usuario ciudadano no está activo');
    }

    const residuo = await this.residuosService.findCatalogoById(
      dto.residuoCatalogoId,
    );

    if (!residuo) {
      throw new NotFoundException(
        `Residuo de catálogo ${dto.residuoCatalogoId} no encontrado`,
      );
    }

    // Puente temporal: panel/Excel/mail aún leen direccionAnonimizada.
    const direccionAnonimizada = (
      dto.direccionAnonimizada?.trim() || direccionRetiro
    ).slice(0, 255);

    const fotoPath = await this.archivosService.guardarImagen(
      foto,
      SUBCARPETA_FOTOS,
    );

    try {
      const solicitud = this.solicitudRetiroRepository.create({
        usuarioCiudadanoId: dto.usuarioCiudadanoId,
        residuoCatalogoId: dto.residuoCatalogoId,
        descripcion: dto.descripcion ?? null,
        direccionRetiro,
        direccionAnonimizada,
        latitudCapturada: dto.latitudCapturada ?? null,
        longitudCapturada: dto.longitudCapturada ?? null,
        fechaSolicitud: new Date(),
        estado: EstadoSolicitudRetiro.EN_REVISION,
        estadoPago: EstadoPagoSolicitud.NO_APLICA,
      });

      const guardada = await this.solicitudRetiroRepository.save(solicitud);

      await this.fotoRetiroRepository.save(
        this.fotoRetiroRepository.create({
          solicitudRetiroId: guardada.id,
          rutaArchivo: fotoPath,
          tipoFoto: TipoFotoRetiro.ANTES,
          hashIntegridad: null,
          fechaCaptura: new Date(),
        }),
      );

      await this.auditoriaService.registrar({
        tipoActor: TipoActorAuditoria.CIUDADANO,
        actor: user,
        entidad: 'solicitudes_retiro',
        entidadId: guardada.id,
        accion: AccionAuditoria.CREATE,
        datosNuevos: { estado: guardada.estado },
        origen,
      });

      if (dto.emailContacto && this.mailService) {
        this.mailService
          .registrarCorreoCiudadano(user.ciudadanoId, dto.emailContacto)
          .catch(() => {});
      }

      return this.findOnePublica(guardada.id, user);
    } catch (error) {
      await this.archivosService.borrar(fotoPath);
      throw error;
    }
  }

  async findAll(
    filtros: FilterSolicitudesRetiroDto = {},
    user?: AuthUser,
  ): Promise<SolicitudPublica[]> {
    const where: FindOptionsWhere<SolicitudRetiro> = {};

    if (user && !this.tieneAccesoLecturaMunicipal(user)) {
      where.usuarioCiudadanoId = user.ciudadanoId;
    } else if (filtros.usuarioCiudadanoId) {
      where.usuarioCiudadanoId = filtros.usuarioCiudadanoId;
    }

    if (filtros.estado) {
      where.estado = filtros.estado;
    }

    const filas = await this.solicitudRetiroRepository.find({
      where,
      relations: { residuoCatalogo: true, fotos: true },
      order: { fechaSolicitud: 'DESC' },
    });

    return filas.map((s) => aSolicitudPublica(s));
  }

  async findOne(id: number, user?: AuthUser): Promise<SolicitudRetiro> {
    const solicitud = await this.solicitudRetiroRepository.findOne({
      where: { id },
      relations: {
        residuoCatalogo: true,
        usuarioCiudadano: true,
        fotos: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de retiro ${id} no encontrada`);
    }

    if (user) {
      this.verificarAccesoLectura(solicitud, user);
    }

    return solicitud;
  }

  async findOnePublica(id: number, user: AuthUser): Promise<SolicitudPublica> {
    const solicitud = await this.findOne(id, user);
    return aSolicitudPublica(solicitud, {
      ultimaRevision: await this.ultimaRevision(id),
    });
  }

  /** Detalle con la última decisión de revisión. */
  async findOneConUltimaRevision(
    id: number,
    user: AuthUser,
  ): Promise<SolicitudPublica> {
    return this.findOnePublica(id, user);
  }

  async foto(id: number, user: AuthUser): Promise<ArchivoParaEnviar> {
    const solicitud = await this.findOne(id, user);
    const ruta = fotoAntesPath(solicitud);
    if (!ruta) {
      throw new NotFoundException('Foto no encontrada');
    }
    return this.archivosService.abrir(ruta);
  }

  /**
   * El vecino corrige y reenvía una solicitud en `requiere_modificacion`: vuelve
   * a `en_revision` por el ciclo del núcleo, con actor `vecino`.
   */
  async reenviarPorCiudadano(
    id: number,
    dto: ReenviarSolicitudRetiroDto,
    foto: ArchivoSubido | undefined,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudPublica> {
    const solicitud = await this.solicitudRetiroRepository.findOne({
      where: { id },
      relations: { fotos: true },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de retiro ${id} no encontrada`);
    }

    if (solicitud.usuarioCiudadanoId !== user.ciudadanoId) {
      throw new ForbiddenException(
        'No puedes reenviar una solicitud que no es tuya',
      );
    }

    const estadoAnterior = solicitud.estado;
    const residuoAnterior = solicitud.residuoCatalogoId;

    try {
      aplicarTransicion(solicitud, EstadoSolicitudRetiro.EN_REVISION, {
        actor: 'vecino',
        ahora: new Date(),
      });
    } catch (error) {
      throw this.comoHttp(error);
    }

    if (dto.residuoCatalogoId !== undefined) {
      const residuo = await this.residuosService.findCatalogoById(
        dto.residuoCatalogoId,
      );
      if (!residuo) {
        throw new NotFoundException(
          `Residuo de catálogo ${dto.residuoCatalogoId} no encontrado`,
        );
      }
      solicitud.residuoCatalogoId = dto.residuoCatalogoId;
    }

    if (dto.descripcion !== undefined) {
      solicitud.descripcion = dto.descripcion;
    }

    if (dto.direccionRetiro !== undefined) {
      const direccionRetiro = dto.direccionRetiro.trim();
      if (!direccionRetiro) {
        throw new BadRequestException(
          'La dirección de retiro no puede quedar vacía',
        );
      }
      solicitud.direccionRetiro = direccionRetiro;
      solicitud.direccionAnonimizada = direccionRetiro.slice(0, 255);
    }

    let fotoNuevaPath: string | undefined;
    const fotoAntes = solicitud.fotos?.find(
      (f) => f.tipoFoto === TipoFotoRetiro.ANTES,
    );

    if (foto) {
      fotoNuevaPath = await this.archivosService.guardarImagen(
        foto,
        SUBCARPETA_FOTOS,
      );
    }

    try {
      await this.solicitudRetiroRepository.save(solicitud);

      if (fotoNuevaPath) {
        if (fotoAntes) {
          const rutaVieja = fotoAntes.rutaArchivo;
          fotoAntes.rutaArchivo = fotoNuevaPath;
          fotoAntes.fechaCaptura = new Date();
          await this.fotoRetiroRepository.save(fotoAntes);
          await this.archivosService.borrar(rutaVieja);
        } else {
          await this.fotoRetiroRepository.save(
            this.fotoRetiroRepository.create({
              solicitudRetiroId: id,
              rutaArchivo: fotoNuevaPath,
              tipoFoto: TipoFotoRetiro.ANTES,
              hashIntegridad: null,
              fechaCaptura: new Date(),
            }),
          );
        }
      }
    } catch (error) {
      if (fotoNuevaPath) {
        await this.archivosService.borrar(fotoNuevaPath);
      }
      throw error;
    }

    const datosAnteriores: Record<string, unknown> = { estado: estadoAnterior };
    const datosNuevos: Record<string, unknown> = { estado: solicitud.estado };
    if (solicitud.residuoCatalogoId !== residuoAnterior) {
      datosAnteriores.residuoCatalogoId = residuoAnterior;
      datosNuevos.residuoCatalogoId = solicitud.residuoCatalogoId;
    }

    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: user,
      entidad: 'solicitudes_retiro',
      entidadId: id,
      accion: AccionAuditoria.UPDATE,
      datosAnteriores,
      datosNuevos,
      origen,
    });

    return this.findOnePublica(id, user);
  }

  async cancelarPorCiudadano(
    id: number,
    dto: CancelarSolicitudRetiroDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudPublica> {
    const solicitud = await this.findOne(id);

    if (solicitud.usuarioCiudadanoId !== user.ciudadanoId) {
      throw new ForbiddenException(
        'No puedes cancelar una solicitud que no es tuya',
      );
    }

    if (dto.usuarioCiudadanoId && dto.usuarioCiudadanoId !== user.ciudadanoId) {
      throw new ForbiddenException(
        'usuarioCiudadanoId no coincide con la sesión autenticada',
      );
    }

    const estadoAnterior = solicitud.estado;

    try {
      aplicarTransicion(solicitud, EstadoSolicitudRetiro.CANCELADA, {
        actor: 'vecino',
        ahora: new Date(),
      });
    } catch (error) {
      throw this.comoHttp(error);
    }

    if (dto.motivo !== undefined) {
      solicitud.razonRechazo = dto.motivo;
    } else if (!solicitud.razonRechazo) {
      solicitud.razonRechazo = 'Cancelada por el ciudadano';
    }

    const guardada = await this.solicitudRetiroRepository.save(solicitud);

    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: user,
      entidad: 'solicitudes_retiro',
      entidadId: guardada.id,
      accion: AccionAuditoria.UPDATE,
      datosAnteriores: { estado: estadoAnterior },
      datosNuevos: { estado: guardada.estado },
      origen,
    });

    return this.findOnePublica(guardada.id, user);
  }

  findByUsuarioCiudadanoId(
    usuarioCiudadanoId: string,
  ): Promise<SolicitudPublica[]> {
    return this.findAll({ usuarioCiudadanoId });
  }

  private async ultimaRevision(
    solicitudRetiroId: number,
  ): Promise<RevisionVisible | null> {
    const revision = await this.revisionRepository.findOne({
      where: { solicitudRetiroId },
      select: {
        decision: true,
        motivo: true,
        comentario: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    if (!revision) return null;

    return {
      decision: revision.decision,
      motivo: revision.motivo,
      comentario: revision.comentario,
      fecha: revision.createdAt,
    };
  }

  private comoHttp(error: unknown): Error {
    if (error instanceof TransicionInvalidaError) {
      return error.motivo === 'actor'
        ? new ForbiddenException(error.message)
        : new BadRequestException(error.message);
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  private tieneAccesoLecturaMunicipal(user: AuthUser): boolean {
    if (!user.esAdministrador || !user.rol) {
      return false;
    }

    return [RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO].includes(
      user.rol,
    );
  }

  private verificarAccesoLectura(
    solicitud: SolicitudRetiro,
    user: AuthUser,
  ): void {
    if (solicitud.usuarioCiudadanoId === user.ciudadanoId) {
      return;
    }

    if (this.tieneAccesoLecturaMunicipal(user)) {
      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para ver esta solicitud de retiro',
    );
  }
}
