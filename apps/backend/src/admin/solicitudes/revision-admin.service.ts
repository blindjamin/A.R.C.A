import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { avisoDeSolicitud } from '../../notificaciones/avisos-solicitud';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccionAuditoria,
  aplicarTransicion,
  AuditoriaService,
  type AuthUser,
  EstadoSolicitudRetiro,
  NotaSolicitud,
  type OrigenPeticion,
  ResiduoCatalogo,
  RevisionSolicitud,
  SolicitudRetiro,
  TipoActorAuditoria,
  validarRevision,
} from '../../core';
import {
  actorDe,
  comoHttp,
  diferencias,
  fotografiar,
} from './auditoria-solicitud';
import { CorregirCategoriaDto } from './dto/corregir-categoria.dto';
import { CrearNotaDto } from './dto/crear-nota.dto';
import { RevisarSolicitudDto } from './dto/revisar-solicitud.dto';

/** Cuánto dura la toma de una solicitud (spec `revision-solicitudes` §6). */
const DURACION_TOMA_MS = 15 * 60 * 1000;

const nombreDe = (f?: { nombre: string; apellido: string } | null) =>
  f ? `${f.nombre} ${f.apellido}` : 'Funcionario';

export interface RevisionHistorial {
  id: number;
  decision: EstadoSolicitudRetiro;
  motivo: string | null;
  comentario: string | null;
  checklist: Record<string, boolean> | null;
  revisor: string;
  createdAt: Date;
}

export interface NotaHistorial {
  id: number;
  texto: string;
  autor: string;
  createdAt: Date;
}

/**
 * Revisión de solicitudes por el funcionario (spec `revision-solicitudes`):
 * toma temporal, decisión con motivo y checklist, corrección de categoría y
 * notas internas.
 */
@Injectable()
export class RevisionAdminService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRetiroRepository: Repository<SolicitudRetiro>,
    @InjectRepository(ResiduoCatalogo)
    private readonly residuoCatalogoRepository: Repository<ResiduoCatalogo>,
    @InjectRepository(RevisionSolicitud)
    private readonly revisionRepository: Repository<RevisionSolicitud>,
    @InjectRepository(NotaSolicitud)
    private readonly notaRepository: Repository<NotaSolicitud>,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificaciones: NotificacionesService,
    @Optional()
    private readonly mailService?: MailService,
  ) {}

  async tomar(id: number, user: AuthUser): Promise<{ tomadaHasta: Date }> {
    const solicitud = await this.cargar(id);

    if (solicitud.estado !== EstadoSolicitudRetiro.EN_REVISION) {
      throw new BadRequestException(
        'Solo se toman solicitudes que están en revisión',
      );
    }

    const ahora = new Date();
    this.asegurarNoTomadaPorOtro(solicitud, user, ahora);

    const tomadaHasta = new Date(ahora.getTime() + DURACION_TOMA_MS);
    // `update` y no `save`: la entidad trae relaciones cargadas y solo cambian
    // dos columnas.
    await this.solicitudRetiroRepository.update(id, {
      tomadaPorId: user.administradorId,
      tomadaHasta,
    });

    return { tomadaHasta };
  }

  async liberar(id: number, user: AuthUser): Promise<void> {
    const solicitud = await this.cargar(id);

    if (solicitud.tomadaPorId === user.administradorId) {
      await this.solicitudRetiroRepository.update(id, {
        tomadaPorId: null,
        tomadaHasta: null,
      });
    }
  }

  async revisar(
    id: number,
    dto: RevisarSolicitudDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<SolicitudRetiro> {
    const solicitud = await this.cargar(id);
    const ahora = new Date();

    this.asegurarNoTomadaPorOtro(solicitud, user, ahora);

    const antes = fotografiar(solicitud);

    try {
      validarRevision(dto);
      aplicarTransicion(solicitud, dto.decision, {
        actor: actorDe(user),
        administradorId: user.administradorId,
        precioCatalogo: solicitud.residuoCatalogo?.precio,
        montoFinal: dto.montoFinal,
        ahora,
      });
    } catch (error) {
      throw comoHttp(error);
    }

    solicitud.tomadaPorId = null;
    solicitud.tomadaHasta = null;

    // La decisión y su fila de historial se guardan juntas: una solicitud
    // aprobada sin registro de quién y por qué no debe poder existir.
    await this.solicitudRetiroRepository.manager.transaction(async (m) => {
      await m.save(solicitud);
      await m.save(RevisionSolicitud, {
        solicitudRetiroId: id,
        revisadoPorId: user.administradorId as string,
        decision: dto.decision,
        motivo: dto.motivo ?? null,
        comentario: dto.comentario?.trim() || null,
        checklist:
          dto.decision === EstadoSolicitudRetiro.APROBADA
            ? (dto.checklist ?? null)
            : null,
      });
    });

    const cambios = diferencias(antes, fotografiar(solicitud));

    // El motivo es un código y se audita; el comentario es texto libre y no.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'solicitudes_retiro',
      entidadId: id,
      accion: AccionAuditoria.UPDATE,
      datosAnteriores: cambios.anteriores,
      datosNuevos: {
        ...cambios.nuevos,
        decision: dto.decision,
        ...(dto.motivo ? { motivo: dto.motivo } : {}),
        ...(dto.montoFinal !== undefined ? { montoFinal: dto.montoFinal } : {}),
      },
      origen,
    });

    // Campanita: además del correo, ya con la decisión persistida y auditada.
    const aviso = avisoDeSolicitud(id, dto.decision);
    if (aviso) {
      void this.notificaciones.notificar(solicitud.usuarioCiudadanoId, aviso);
    }

    // Notificación por correo al vecino si tiene email verificado/registrado
    if (this.mailService) {
      this.mailService
        .obtenerCorreoCiudadano(solicitud.usuarioCiudadanoId)
        .then((correo) => {
          if (correo) {
            return this.mailService!.notificarCambioEstado(
              correo,
              {
                id: solicitud.id,
                residuoNombre: solicitud.residuoCatalogo?.nombre,
                categoria: solicitud.residuoCatalogo?.categoria,
                direccion: solicitud.direccionAnonimizada,
                fechaSolicitud: solicitud.fechaSolicitud,
              },
              dto.decision,
              dto.comentario,
            );
          }
        })
        .catch(() => {
          // El fallo de correo no interrumpe el guardado municipal
        });
    }

    return solicitud;
  }

  async corregirCategoria(
    id: number,
    dto: CorregirCategoriaDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<void> {
    const solicitud = await this.cargar(id);

    if (solicitud.estado !== EstadoSolicitudRetiro.EN_REVISION) {
      throw new BadRequestException(
        'La categoría solo se corrige mientras la solicitud está en revisión',
      );
    }

    this.asegurarNoTomadaPorOtro(solicitud, user, new Date());

    const residuo = await this.residuoCatalogoRepository.findOne({
      where: { id: dto.residuoCatalogoId },
    });
    if (!residuo) {
      throw new NotFoundException(
        `Residuo de catálogo ${dto.residuoCatalogoId} no encontrado`,
      );
    }

    if (solicitud.residuoCatalogoId === dto.residuoCatalogoId) return;

    // `update` y no `save`: con la relación `residuoCatalogo` cargada, TypeORM
    // volvería a escribir el residuo anterior en la columna.
    // Además se limpia nombreResiduoOtro para que la solicitud deje de figurar como fuera de catálogo.
    await this.solicitudRetiroRepository.update(id, {
      residuoCatalogoId: dto.residuoCatalogoId,
      nombreResiduoOtro: null,
    });

    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'solicitudes_retiro',
      entidadId: id,
      accion: AccionAuditoria.UPDATE,
      datosAnteriores: {
        residuoCatalogoId: solicitud.residuoCatalogoId,
        nombreResiduoOtro: solicitud.nombreResiduoOtro,
      },
      datosNuevos: {
        residuoCatalogoId: dto.residuoCatalogoId,
        nombreResiduoOtro: null,
      },
      origen,
    });
  }

  async historial(id: number): Promise<RevisionHistorial[]> {
    await this.cargar(id);

    const filas = await this.revisionRepository.find({
      where: { solicitudRetiroId: id },
      relations: { revisadoPor: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return filas.map((r) => ({
      id: r.id,
      decision: r.decision,
      motivo: r.motivo,
      comentario: r.comentario,
      checklist: r.checklist,
      revisor: nombreDe(r.revisadoPor),
      createdAt: r.createdAt,
    }));
  }

  async notas(id: number): Promise<NotaHistorial[]> {
    await this.cargar(id);

    const filas = await this.notaRepository.find({
      where: { solicitudRetiroId: id },
      relations: { autor: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return filas.map((n) => ({
      id: n.id,
      texto: n.texto,
      autor: nombreDe(n.autor),
      createdAt: n.createdAt,
    }));
  }

  async crearNota(
    id: number,
    dto: CrearNotaDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<NotaSolicitud> {
    await this.cargar(id);

    const nota = await this.notaRepository.save({
      solicitudRetiroId: id,
      autorId: user.administradorId as string,
      texto: dto.texto.trim(),
    });

    // Se registra que existe la nota, nunca su contenido.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'notas_solicitud',
      entidadId: nota.id,
      accion: AccionAuditoria.CREATE,
      datosNuevos: { solicitudRetiroId: id },
      origen,
    });

    return nota;
  }

  private async cargar(id: number): Promise<SolicitudRetiro> {
    const solicitud = await this.solicitudRetiroRepository.findOne({
      where: { id },
      relations: { residuoCatalogo: true },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de retiro ${id} no encontrada`);
    }

    return solicitud;
  }

  private asegurarNoTomadaPorOtro(
    solicitud: SolicitudRetiro,
    user: AuthUser,
    ahora: Date,
  ): void {
    const vigente =
      !!solicitud.tomadaHasta && new Date(solicitud.tomadaHasta) > ahora;

    if (
      vigente &&
      solicitud.tomadaPorId &&
      solicitud.tomadaPorId !== user.administradorId
    ) {
      throw new ConflictException(
        'Otro funcionario está revisando esta solicitud',
      );
    }
  }
}
