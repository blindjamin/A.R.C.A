import {
  BadRequestException,
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
  DECISIONES_REVISION,
  EstadoSolicitudRetiro,
  type OrigenPeticion,
  SolicitudRetiro,
  TipoActorAuditoria,
  transicionesDisponibles,
  UsuarioAdministrador,
} from '@arca/core';
import {
  actorDe,
  comoHttp,
  diferencias,
  fotografiar,
} from './auditoria-solicitud';
import { FilterSolicitudesAdminDto } from './dto/filter-solicitudes-admin.dto';
import { UpdateSolicitudAdminDto } from './dto/update-solicitud-admin.dto';

export interface FuncionarioResumen {
  id: string;
  nombre: string;
  apellido: string;
}

export type SolicitudDetalle = Omit<
  SolicitudRetiro,
  'revisadoPor' | 'tomadaPor'
> & {
  revisadoPor: FuncionarioResumen | null;
  /** Funcionario con la toma vigente, si la hay. */
  tomadaPor: FuncionarioResumen | null;
  /**
   * Estados a los que la sesión puede mover la solicitud con `PATCH`. Las
   * decisiones de revisión no aparecen: se toman con `POST /revision`.
   */
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
    @InjectRepository(UsuarioAdministrador)
    private readonly usuarioAdministradorRepository: Repository<UsuarioAdministrador>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  findAll(filtros: FilterSolicitudesAdminDto = {}): Promise<SolicitudRetiro[]> {
    const where: FindOptionsWhere<SolicitudRetiro> = {};

    if (filtros.estado) {
      where.estado = filtros.estado;
    }

    // La cola de revisión se atiende por orden de llegada: primero lo que más
    // lleva esperando.
    const orden =
      filtros.estado === EstadoSolicitudRetiro.EN_REVISION ? 'ASC' : 'DESC';

    return this.solicitudRetiroRepository.find({
      where,
      relations: { residuoCatalogo: true },
      order: { fechaSolicitud: orden },
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
    const solicitud = await this.findOne(id);

    const tomaVigente =
      !!solicitud.tomadaPorId &&
      !!solicitud.tomadaHasta &&
      new Date(solicitud.tomadaHasta) > new Date();

    const disponibles = transicionesDisponibles(solicitud.estado, {
      actor: actorDe(user),
      estadoPago: solicitud.estadoPago,
    }).filter((hacia) => !this.esDecisionDeRevision(solicitud.estado, hacia));

    return {
      ...solicitud,
      revisadoPor: await this.resumenFuncionario(solicitud.revisadoPorId),
      tomadaPor: tomaVigente
        ? await this.resumenFuncionario(solicitud.tomadaPorId)
        : null,
      transicionesDisponibles: disponibles,
    };
  }

  async update(
    id: number,
    dto: UpdateSolicitudAdminDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudRetiro> {
    const solicitud = await this.findOne(id);

    if (this.esDecisionDeRevision(solicitud.estado, dto.estado)) {
      throw new BadRequestException(
        'Las decisiones de revisión se registran con POST /admin/solicitudes/:id/revision',
      );
    }

    const antes = fotografiar(solicitud);

    try {
      aplicarTransicion(solicitud, dto.estado, {
        actor: actorDe(user),
        administradorId: user.administradorId,
        precioCatalogo: solicitud.residuoCatalogo?.precio,
        ahora: new Date(),
      });
    } catch (error) {
      throw comoHttp(error);
    }

    const guardada = await this.solicitudRetiroRepository.save(solicitud);

    // La fotografía posterior sale de una lectura fresca, no del objeto que
    // devuelve `save`: la auditoría debe registrar lo que quedó persistido, no
    // lo que la aplicación creyó asignar.
    const persistida = await this.solicitudRetiroRepository.findOne({
      where: { id: guardada.id },
    });

    const cambios = diferencias(antes, fotografiar(persistida ?? guardada));

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

  private esDecisionDeRevision(
    desde: EstadoSolicitudRetiro,
    hacia: EstadoSolicitudRetiro,
  ): boolean {
    return (
      desde === EstadoSolicitudRetiro.EN_REVISION &&
      (DECISIONES_REVISION as readonly EstadoSolicitudRetiro[]).includes(hacia)
    );
  }

  private async resumenFuncionario(
    id: string | null,
  ): Promise<FuncionarioResumen | null> {
    if (!id) return null;
    const funcionario = await this.usuarioAdministradorRepository.findOne({
      where: { id },
    });
    return funcionario
      ? {
          id: funcionario.id,
          nombre: funcionario.nombre,
          apellido: funcionario.apellido,
        }
      : null;
  }
}
