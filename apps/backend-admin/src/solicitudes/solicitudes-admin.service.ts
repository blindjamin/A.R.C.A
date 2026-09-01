import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  EstadoSolicitudRetiro,
  SolicitudRetiro,
  UsuarioAdministrador,
} from '@arca/core';
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
  ): Promise<SolicitudRetiro> {
    const solicitud = await this.findOne(id);

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

    return this.solicitudRetiroRepository.save(solicitud);
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
