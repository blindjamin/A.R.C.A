import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  AccionAuditoria,
  aplicarTransicion,
  AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  type MotivoRevision,
  type OrigenPeticion,
  RevisionSolicitud,
  RolAdministrador,
  SolicitudRetiro,
  TipoActorAuditoria,
  TransicionInvalidaError,
  UsuarioCiudadano,
} from '../core';
import { ResiduosService } from '../residuos/residuos.service';
import { CancelarSolicitudRetiroDto } from './dto/cancelar-solicitud-retiro.dto';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { FilterSolicitudesRetiroDto } from './dto/filter-solicitudes-retiro.dto';
import { ReenviarSolicitudRetiroDto } from './dto/reenviar-solicitud-retiro.dto';

/**
 * Lo que la API ciudadana muestra de una revisión (spec
 * `revision-solicitudes` §3): nunca el revisor, el checklist ni las notas
 * internas.
 */
export interface RevisionVisible {
  decision: EstadoSolicitudRetiro;
  motivo: MotivoRevision | null;
  comentario: string | null;
  fecha: Date;
}

export type SolicitudConRevision = SolicitudRetiro & {
  ultimaRevision: RevisionVisible | null;
};

@Injectable()
export class SolicitudesRetiroService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRetiroRepository: Repository<SolicitudRetiro>,
    @InjectRepository(UsuarioCiudadano)
    private readonly usuarioCiudadanoRepository: Repository<UsuarioCiudadano>,
    @InjectRepository(RevisionSolicitud)
    private readonly revisionRepository: Repository<RevisionSolicitud>,
    private readonly residuosService: ResiduosService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async create(
    dto: CreateSolicitudRetiroDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudRetiro> {
    if (dto.usuarioCiudadanoId !== user.ciudadanoId) {
      throw new ForbiddenException(
        'No puedes crear solicitudes en nombre de otro ciudadano',
      );
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

    const solicitud = this.solicitudRetiroRepository.create({
      usuarioCiudadanoId: dto.usuarioCiudadanoId,
      residuoCatalogoId: dto.residuoCatalogoId,
      descripcion: dto.descripcion ?? null,
      direccionAnonimizada: dto.direccionAnonimizada ?? null,
      latitudCapturada: dto.latitudCapturada ?? null,
      longitudCapturada: dto.longitudCapturada ?? null,
      fechaSolicitud: new Date(),
      estado: EstadoSolicitudRetiro.EN_REVISION,
      estadoPago: EstadoPagoSolicitud.NO_APLICA,
    });

    const guardada = await this.solicitudRetiroRepository.save(solicitud);

    // Se registra el estado inicial y nada más. La descripción y las
    // coordenadas que trae el DTO son datos personales del vecino: quedan en
    // `solicitudes_retiro`, donde el borrado los alcanza, y no se copian a la
    // auditoría, que por su naturaleza se conserva.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: user,
      entidad: 'solicitudes_retiro',
      entidadId: guardada.id,
      accion: AccionAuditoria.CREATE,
      datosNuevos: { estado: guardada.estado },
      origen,
    });

    return guardada;
  }

  findAll(
    filtros: FilterSolicitudesRetiroDto = {},
    user?: AuthUser,
  ): Promise<SolicitudRetiro[]> {
    const where: FindOptionsWhere<SolicitudRetiro> = {};

    if (user && !this.tieneAccesoLecturaMunicipal(user)) {
      where.usuarioCiudadanoId = user.ciudadanoId;
    } else if (filtros.usuarioCiudadanoId) {
      where.usuarioCiudadanoId = filtros.usuarioCiudadanoId;
    }

    if (filtros.estado) {
      where.estado = filtros.estado;
    }

    return this.solicitudRetiroRepository.find({
      where,
      relations: { residuoCatalogo: true },
      order: { fechaSolicitud: 'DESC' },
    });
  }

  async findOne(id: number, user?: AuthUser): Promise<SolicitudRetiro> {
    const solicitud = await this.solicitudRetiroRepository.findOne({
      where: { id },
      relations: {
        residuoCatalogo: true,
        usuarioCiudadano: true,
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

  /** Detalle con la última decisión de revisión, para que el vecino sepa qué corregir. */
  async findOneConUltimaRevision(
    id: number,
    user: AuthUser,
  ): Promise<SolicitudConRevision> {
    const solicitud = await this.findOne(id, user);
    return { ...solicitud, ultimaRevision: await this.ultimaRevision(id) };
  }

  /**
   * El vecino corrige y reenvía una solicitud en `requiere_modificacion`: vuelve
   * a `en_revision` por el ciclo del núcleo, con actor `vecino`.
   */
  async reenviarPorCiudadano(
    id: number,
    dto: ReenviarSolicitudRetiroDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudConRevision> {
    // Sin relaciones: con `residuoCatalogo` cargado, `save` volvería a escribir
    // el residuo anterior en la columna.
    const solicitud = await this.solicitudRetiroRepository.findOne({
      where: { id },
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

    await this.solicitudRetiroRepository.save(solicitud);

    // La descripción no se audita: es texto libre del vecino y puede llevar
    // datos personales. La categoría sí, igual que cuando la corrige el panel.
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

    return this.findOneConUltimaRevision(id, user);
  }

  async cancelarPorCiudadano(
    id: number,
    dto: CancelarSolicitudRetiroDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudRetiro> {
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

    // Motivo opcional del vecino: queda en la solicitud (borrable), no en
    // auditoría. El ciclo solo mueve el estado; el texto libre es aparte.
    if (dto.motivo !== undefined) {
      solicitud.razonRechazo = dto.motivo;
    } else if (!solicitud.razonRechazo) {
      solicitud.razonRechazo = 'Cancelada por el ciudadano';
    }

    const guardada = await this.solicitudRetiroRepository.save(solicitud);

    // Solo el estado. `razonRechazo` también cambia, pero su contenido es texto
    // libre escrito por el vecino y puede llevar datos personales; por la regla
    // de minimización se deja constancia de que cambió, no de qué dice.
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

    return guardada;
  }

  findByUsuarioCiudadanoId(
    usuarioCiudadanoId: string,
  ): Promise<SolicitudRetiro[]> {
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

  /** Traduce errores del ciclo del núcleo a respuestas HTTP. */
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
