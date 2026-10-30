import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AccionAuditoria,
  AuditoriaService,
  type AuthUser,
  Denuncia,
  EstadoDenuncia,
  type MensajeAdjunto,
  type OrigenPeticion,
  SesionService,
  TipoActorAuditoria,
} from '../../core';
import { primerNombre } from '../../marketplace/articulo-publico';
import type { CambiarEstadoDenunciaDto } from './dto/cambiar-estado-denuncia.dto';

const ESTADOS: string[] = Object.values(EstadoDenuncia);
const CERRADAS: EstadoDenuncia[] = [
  EstadoDenuncia.RESUELTA,
  EstadoDenuncia.RECHAZADA,
];

/** Tope de filas del listado: el panel todavía no pagina. */
const LIMITE_LISTADO = 200;

export interface DenunciaResumenAdmin {
  id: number;
  fecha: Date;
  motivo: string;
  estado: EstadoDenuncia;
  origen: string;
  denuncianteNombre: string;
  denunciadoNombre: string;
  articuloTitulo: string | null;
  /** Cuántas denuncias acumula el denunciado, en cualquier estado. */
  denunciasDelDenunciado: number;
}

export interface DenunciaDetalleAdmin extends DenunciaResumenAdmin {
  descripcion: string | null;
  /** Solo los mensajes que adjuntó el denunciante, nunca la conversación. */
  mensajes: MensajeAdjunto[];
  resolucion: string | null;
  fechaResolucion: Date | null;
}

/** Revisión de denuncias en el panel municipal (HU-18). */
@Injectable()
export class DenunciasAdminService {
  constructor(
    @InjectRepository(Denuncia)
    private readonly denunciaRepo: Repository<Denuncia>,
    private readonly sesionService: SesionService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  ahora = (): Date => new Date();

  /** `estado` admite varios separados por coma: las cerradas son dos. */
  async listar(estado?: string): Promise<DenunciaResumenAdmin[]> {
    const estados = estado ? estado.split(',').map((e) => e.trim()) : [];
    const invalido = estados.find((e) => !ESTADOS.includes(e));
    if (invalido !== undefined) {
      throw new BadRequestException(
        `Estado de denuncia desconocido: ${invalido}`,
      );
    }
    const filas = await this.denunciaRepo.find({
      where: estados.length
        ? { estado: In(estados as EstadoDenuncia[]) }
        : undefined,
      relations: { articulo: true },
      order: { fechaDenuncia: 'DESC' },
      take: LIMITE_LISTADO,
    });
    return this.resumir(filas);
  }

  async detalle(id: number): Promise<DenunciaDetalleAdmin> {
    const d = await this.denunciaRepo.findOne({
      where: { id },
      relations: { articulo: true },
    });
    if (!d) throw new NotFoundException(`Denuncia ${id} no encontrada`);
    const [resumen] = await this.resumir([d]);
    return {
      ...resumen,
      descripcion: d.descripcion,
      mensajes: d.mensajesAdjuntos ?? [],
      resolucion: d.resolucion,
      fechaResolucion: d.fechaResolucion,
    };
  }

  /**
   * Abierta pasa a investigación; abierta o en investigación pasa a resuelta
   * o rechazada, con resolución. Una cerrada no se reabre.
   */
  async cambiarEstado(
    id: number,
    dto: CambiarEstadoDenunciaDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<DenunciaDetalleAdmin> {
    const cierra = CERRADAS.includes(dto.estado);
    if (cierra && !dto.resolucion) {
      throw new BadRequestException(
        'Escribe la resolución para resolver o rechazar la denuncia',
      );
    }

    // Con la fila bloqueada: dos funcionarios no pueden cerrarla a la vez.
    const anterior = await this.denunciaRepo.manager.transaction(async (m) => {
      const d = await m.findOne(Denuncia, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!d) throw new NotFoundException(`Denuncia ${id} no encontrada`);
      if (CERRADAS.includes(d.estado)) {
        throw new ConflictException('La denuncia ya está cerrada');
      }
      if (d.estado === dto.estado) {
        throw new ConflictException('La denuncia ya está en ese estado');
      }
      const estadoAnterior = d.estado;
      d.estado = dto.estado;
      d.resolucion = dto.resolucion ?? d.resolucion;
      d.revisadoPorAdministradorId = user.administradorId ?? null;
      if (cierra) d.fechaResolucion = this.ahora();
      await m.save(d);
      return estadoAnterior;
    });

    // Sin el texto de la resolución, igual que la denuncia no audita la descripción.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'denuncias',
      entidadId: id,
      accion: AccionAuditoria.UPDATE,
      datosAnteriores: { estado: anterior },
      datosNuevos: {
        estado: dto.estado,
        revisadoPorAdministradorId: user.administradorId,
      },
      origen,
    });
    return this.detalle(id);
  }

  // ponytail: un nombre por vecino y un find para los conteos; si el listado
  // crece, pasar a un GROUP BY y paginar.
  private async resumir(filas: Denuncia[]): Promise<DenunciaResumenAdmin[]> {
    const vecinos = [
      ...new Set(
        filas.flatMap((d) => [d.usuarioDenuncianteId, d.usuarioDenunciadoId]),
      ),
    ];
    const nombres = new Map<string, string>();
    await Promise.all(
      vecinos.map(async (v) => {
        nombres.set(
          v,
          primerNombre(await this.sesionService.nombreSesionActiva(v)),
        );
      }),
    );

    const denunciados = [...new Set(filas.map((d) => d.usuarioDenunciadoId))];
    const contra = denunciados.length
      ? await this.denunciaRepo.find({
          where: { usuarioDenunciadoId: In(denunciados) },
          select: { id: true, usuarioDenunciadoId: true },
        })
      : [];
    const conteo = new Map<string, number>();
    for (const c of contra) {
      conteo.set(
        c.usuarioDenunciadoId,
        (conteo.get(c.usuarioDenunciadoId) ?? 0) + 1,
      );
    }

    return filas.map((d) => ({
      id: d.id,
      fecha: d.fechaDenuncia,
      motivo: d.motivo,
      estado: d.estado,
      origen: d.origen,
      denuncianteNombre: nombres.get(d.usuarioDenuncianteId) ?? '',
      denunciadoNombre: nombres.get(d.usuarioDenunciadoId) ?? '',
      articuloTitulo: d.articulo?.titulo ?? null,
      denunciasDelDenunciado: conteo.get(d.usuarioDenunciadoId) ?? 0,
    }));
  }
}
