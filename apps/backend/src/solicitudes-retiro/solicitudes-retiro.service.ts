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
  AuditoriaService,
  type AuthUser,
  EstadoSolicitudRetiro,
  type OrigenPeticion,
  RolAdministrador,
  SolicitudRetiro,
  TipoActorAuditoria,
  UsuarioAdministrador,
  UsuarioCiudadano,
} from '@arca/core';
import { ResiduosService } from '../residuos/residuos.service';
import { CancelarSolicitudRetiroDto } from './dto/cancelar-solicitud-retiro.dto';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { FilterSolicitudesRetiroDto } from './dto/filter-solicitudes-retiro.dto';
import { UpdateSolicitudRetiroDto } from './dto/update-solicitud-retiro.dto';

@Injectable()
export class SolicitudesRetiroService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRetiroRepository: Repository<SolicitudRetiro>,
    @InjectRepository(UsuarioCiudadano)
    private readonly usuarioCiudadanoRepository: Repository<UsuarioCiudadano>,
    @InjectRepository(UsuarioAdministrador)
    private readonly usuarioAdministradorRepository: Repository<UsuarioAdministrador>,
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
      estado: EstadoSolicitudRetiro.PENDIENTE,
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
        operadorAsignado: true,
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

  // PENDIENTE (avisar a Javier, HU-13): sin llamador desde que el @Patch(':id')
  // del controller se movió a apps/backend-admin (Fase 3, migración admin). No
  // se borra por cuenta propia (regla A.4) — la lógica de cambio de estado es
  // suya; que decida si queda, se borra o se comparte con el nuevo service.
  async update(
    id: number,
    dto: UpdateSolicitudRetiroDto,
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
      this.aplicarCambioEstado(solicitud, dto);
    }

    return this.solicitudRetiroRepository.save(solicitud);
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

    const cancelablesPorCiudadano = [
      EstadoSolicitudRetiro.PENDIENTE,
      EstadoSolicitudRetiro.ASIGNADA,
    ];

    if (!cancelablesPorCiudadano.includes(solicitud.estado)) {
      throw new BadRequestException(
        `No se puede cancelar una solicitud en estado "${solicitud.estado}"`,
      );
    }

    const estadoAnterior = solicitud.estado;

    solicitud.estado = EstadoSolicitudRetiro.CANCELADA;
    solicitud.razonRechazo = dto.motivo ?? 'Cancelada por el ciudadano';

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

  private aplicarCambioEstado(
    solicitud: SolicitudRetiro,
    dto: UpdateSolicitudRetiroDto,
  ): void {
    const nuevoEstado = dto.estado as EstadoSolicitudRetiro;

    if (nuevoEstado === solicitud.estado) {
      return;
    }

    // El panel municipal puede mover el estado en cualquier dirección (incl.
    // revertir) para operar/probar. Solo se conservan invariantes de datos:
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
      // Al salir de "completada" la fecha de cierre deja de tener sentido.
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

  findByUsuarioCiudadanoId(
    usuarioCiudadanoId: string,
  ): Promise<SolicitudRetiro[]> {
    return this.findAll({ usuarioCiudadanoId });
  }

  private tieneAccesoLecturaMunicipal(user: AuthUser): boolean {
    if (!user.esAdministrador || !user.rol) {
      return false;
    }

    return [
      RolAdministrador.ADMIN,
      RolAdministrador.OPERADOR,
      RolAdministrador.PATROCINADOR,
    ].includes(user.rol);
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
