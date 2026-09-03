import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  AccionAuditoria,
  AuditoriaService,
  type AuthUser,
  EstadoSolicitudRetiro,
  type OrigenPeticion,
  SolicitudRetiro,
  TipoActorAuditoria,
  UsuarioAdministrador,
} from '@arca/core';

/**
 * Campos de la solicitud que se auditan cuando cambian.
 *
 * La lista es explícita a propósito: si mañana se agrega una columna con datos
 * personales del vecino, no entra sola al registro de auditoría. Cualquier
 * campo nuevo se suma acá de forma deliberada.
 */
const CAMPOS_AUDITADOS = [
  'estado',
  'operadorAsignadoId',
  'fechaProgramada',
] as const;

type CampoAuditado = (typeof CAMPOS_AUDITADOS)[number];

/** Fotografía de los campos auditados, para comparar antes y después. */
type Fotografia = Record<CampoAuditado, unknown>;
import { FilterSolicitudesAdminDto } from './dto/filter-solicitudes-admin.dto';
import { UpdateSolicitudAdminDto } from './dto/update-solicitud-admin.dto';

/**
 * Vista admin de solicitudes: sin filtro por dueño (el equivalente en
 * apps/backend/src/solicitudes-retiro/solicitudes-retiro.service.ts sí filtra
 * por usuarioCiudadanoId salvo acceso municipal). Servicio propio y simple,
 * como pide la Fase 3 del plan — no comparte código con el ciudadano.
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

    return this.solicitudRetiroRepository.find({
      where,
      relations: { residuoCatalogo: true },
      order: { fechaSolicitud: 'DESC' },
    });
  }

  async findOne(id: number): Promise<SolicitudRetiro> {
    const solicitud = await this.solicitudRetiroRepository.findOne({
      where: { id },
      relations: {
        residuoCatalogo: true,
        usuarioCiudadano: true,
        operadorAsignado: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de retiro ${id} no encontrada`);
    }

    return solicitud;
  }

  async update(
    id: number,
    dto: UpdateSolicitudAdminDto,
    user?: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudRetiro> {
    const solicitud = await this.findOne(id);
    const antes = this.fotografiar(solicitud);

    if (dto.operadorAsignadoId !== undefined) {
      await this.validarOperador(dto.operadorAsignadoId);
      solicitud.operadorAsignadoId = dto.operadorAsignadoId;
    }

    if (dto.fechaProgramada !== undefined) {
      solicitud.fechaProgramada = new Date(dto.fechaProgramada);
    }

    if (dto.razonRechazo !== undefined) {
      solicitud.razonRechazo = dto.razonRechazo;
    }

    if (dto.estado !== undefined) {
      this.aplicarCambioEstado(solicitud, dto.estado);
    }

    const guardada = await this.solicitudRetiroRepository.save(solicitud);

    // La fotografía posterior sale de una lectura fresca, no del objeto que
    // devuelve `save`. Cuando `findOne` trae cargada la relación
    // `operadorAsignado`, TypeORM reconstruye la columna FK a partir de esa
    // relación después de guardar: el UPDATE escribe el operador nuevo en la
    // base, pero la entidad en memoria vuelve a mostrar el anterior. Auditar
    // ese objeto haría que las asignaciones de operador no quedaran
    // registradas — en silencio, porque la operación responde 200.
    //
    // Además es lo correcto de fondo: la auditoría debe registrar lo que quedó
    // persistido, no lo que la aplicación creyó asignar.
    const persistida = await this.solicitudRetiroRepository.findOne({
      where: { id: guardada.id },
    });

    const despues = this.fotografiar(persistida ?? guardada);
    const cambios = this.diferencias(antes, despues);

    // Si el PATCH no cambió ninguno de los campos auditados no se registra
    // nada: una fila de auditoría que dice "no pasó nada" solo agrega ruido a
    // la pantalla que después alguien tiene que leer.
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

  /** Toma los campos auditados de la solicitud, para comparar antes y después. */
  private fotografiar(solicitud: SolicitudRetiro): Fotografia {
    return {
      estado: solicitud.estado,
      operadorAsignadoId: solicitud.operadorAsignadoId,
      fechaProgramada: solicitud.fechaProgramada?.toISOString() ?? null,
    };
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

  private aplicarCambioEstado(
    solicitud: SolicitudRetiro,
    nuevoEstado: EstadoSolicitudRetiro,
  ): void {
    if (nuevoEstado === solicitud.estado) {
      return;
    }

    if (
      nuevoEstado === EstadoSolicitudRetiro.ASIGNADA &&
      !solicitud.operadorAsignadoId
    ) {
      throw new BadRequestException(
        'Para asignar la solicitud debe indicar un operador (operadorAsignadoId)',
      );
    }

    if (nuevoEstado === EstadoSolicitudRetiro.COMPLETADA) {
      solicitud.fechaCompletada = new Date();
    } else {
      solicitud.fechaCompletada = null;
    }

    solicitud.estado = nuevoEstado;
  }

  private async validarOperador(operadorId: string): Promise<void> {
    const operador = await this.usuarioAdministradorRepository.findOne({
      where: { id: operadorId },
    });

    if (!operador) {
      throw new NotFoundException(`Operador ${operadorId} no encontrado`);
    }

    if (!operador.activo) {
      throw new BadRequestException('El operador asignado no está activo');
    }
  }
}
