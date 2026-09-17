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
  type ActorCiclo,
  aplicarTransicion,
  AuditoriaService,
  type AuthUser,
  EstadoSolicitudRetiro,
  type OrigenPeticion,
  RolAdministrador,
  SolicitudRetiro,
  TipoActorAuditoria,
  TransicionInvalidaError,
  transicionesDisponibles,
} from '@arca/core';
import { FilterSolicitudesAdminDto } from './dto/filter-solicitudes-admin.dto';
import { UpdateSolicitudAdminDto } from './dto/update-solicitud-admin.dto';

/**
 * Campos de la solicitud que se auditan cuando cambian.
 *
 * La lista es explícita a propósito: si mañana se agrega una columna con datos
 * personales del vecino, no entra sola al registro de auditoría. Cualquier
 * campo nuevo se suma acá de forma deliberada.
 */
const CAMPOS_AUDITADOS = [
  'estado',
  'estadoPago',
  'monto',
  'revisadoPorId',
  'fechaCierre',
] as const;

type CampoAuditado = (typeof CAMPOS_AUDITADOS)[number];

/** Fotografía de los campos auditados, para comparar antes y después. */
type Fotografia = Record<CampoAuditado, unknown>;

export type SolicitudDetalle = SolicitudRetiro & {
  /** Estados a los que el usuario de la sesión puede mover la solicitud. */
  transicionesDisponibles: EstadoSolicitudRetiro[];
};

/**
 * Vista admin de solicitudes: sin filtro por dueño (el equivalente en
 * apps/backend/src/solicitudes-retiro/solicitudes-retiro.service.ts sí filtra
 * por usuarioCiudadanoId salvo acceso municipal). Servicio propio y simple,
 * como pide la Fase 3 del plan — no comparte código con el ciudadano.
 *
 * Los cambios de estado pasan por las reglas de `@arca/core`
 * (spec `ciclo-solicitud`): este service no decide qué transición es válida.
 */
@Injectable()
export class SolicitudesAdminService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRetiroRepository: Repository<SolicitudRetiro>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(filtros: FilterSolicitudesAdminDto = {}): Promise<SolicitudRetiro[]> {
    const where: FindOptionsWhere<SolicitudRetiro> = {};

    if (filtros.estado) {
      where.estado = filtros.estado;
    }

    return this.solicitudRetiroRepository.find({
      where,
      relations: { residuoCatalogo: true },
      order: { fechaSolicitud: 'DESC' },
    });
  }

  /**
   * Sin la relación `revisadoPor` a propósito: este es el objeto que `update`
   * guarda, y cuando una relación ManyToOne viene cargada TypeORM reescribe la
   * columna FK con ella al guardar — el revisor nuevo quedaría pisado por el
   * anterior.
   */
  async findOne(id: number): Promise<SolicitudRetiro> {
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

    return solicitud;
  }

  /** Detalle para el panel, con las acciones que la sesión puede ejecutar. */
  async detalle(id: number, user: AuthUser): Promise<SolicitudDetalle> {
    const solicitud = await this.solicitudRetiroRepository.findOne({
      where: { id },
      relations: {
        residuoCatalogo: true,
        usuarioCiudadano: true,
        revisadoPor: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de retiro ${id} no encontrada`);
    }

    return {
      ...solicitud,
      transicionesDisponibles: transicionesDisponibles(solicitud.estado, {
        actor: this.actorDe(user),
        estadoPago: solicitud.estadoPago,
      }),
    };
  }

  async update(
    id: number,
    dto: UpdateSolicitudAdminDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudRetiro> {
    const solicitud = await this.findOne(id);
    const antes = this.fotografiar(solicitud);

    try {
      aplicarTransicion(solicitud, dto.estado, {
        actor: this.actorDe(user),
        administradorId: user.administradorId,
        precioCatalogo: solicitud.residuoCatalogo?.precio,
        ahora: new Date(),
      });
    } catch (error) {
      if (error instanceof TransicionInvalidaError) {
        throw error.motivo === 'actor'
          ? new ForbiddenException(error.message)
          : new BadRequestException(error.message);
      }
      throw error;
    }

    const guardada = await this.solicitudRetiroRepository.save(solicitud);

    // La fotografía posterior sale de una lectura fresca, no del objeto que
    // devuelve `save`: la auditoría debe registrar lo que quedó persistido, no
    // lo que la aplicación creyó asignar.
    const persistida = await this.solicitudRetiroRepository.findOne({
      where: { id: guardada.id },
    });

    const despues = this.fotografiar(persistida ?? guardada);
    const cambios = this.diferencias(antes, despues);

    // Si no cambió ninguno de los campos auditados no se registra nada: una
    // fila de auditoría que dice "no pasó nada" solo agrega ruido.
    if (Object.keys(cambios.nuevos).length > 0) {
      await this.auditoriaService.registrar({
        tipoActor: TipoActorAuditoria.ADMINISTRADOR,
        actor: user,
        entidad: 'solicitudes_retiro',
        entidadId: guardada.id,
        accion: AccionAuditoria.UPDATE,
        datosAnteriores: cambios.anteriores,
        datosNuevos: cambios.nuevos,
        origen,
      });
    }

    return guardada;
  }

  /** `RolesGuard` ya garantiza que la sesión es admin o funcionario. */
  private actorDe(user: AuthUser): ActorCiclo {
    return user.rol === RolAdministrador.ADMIN ? 'admin' : 'funcionario';
  }

  /** Toma los campos auditados de la solicitud, para comparar antes y después. */
  private fotografiar(solicitud: SolicitudRetiro): Fotografia {
    return {
      estado: solicitud.estado,
      estadoPago: solicitud.estadoPago,
      monto: solicitud.monto,
      revisadoPorId: solicitud.revisadoPorId,
      fechaCierre: this.fechaIso(solicitud.fechaCierre),
    };
  }

  // mysql2 puede devolver la fecha como Date o como texto según la conexión.
  private fechaIso(fecha: Date | string | null): string | null {
    return fecha ? new Date(fecha).toISOString() : null;
  }

  /**
   * Devuelve solo los campos que efectivamente cambiaron.
   *
   * Es la regla de minimización aplicada: la auditoría guarda el campo
   * modificado, nunca la fila completa. Así los datos personales del vecino
   * —descripción, coordenadas— nunca se copian a un registro que después no se
   * puede borrar.
   */
  private diferencias(
    antes: Fotografia,
    despues: Fotografia,
  ): {
    anteriores: Record<string, unknown>;
    nuevos: Record<string, unknown>;
  } {
    const anteriores: Record<string, unknown> = {};
    const nuevos: Record<string, unknown> = {};

    for (const campo of CAMPOS_AUDITADOS) {
      if (antes[campo] !== despues[campo]) {
        anteriores[campo] = antes[campo];
        nuevos[campo] = despues[campo];
      }
    }

    return { anteriores, nuevos };
  }
}
