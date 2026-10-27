import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  AccionAuditoria,
  AuditoriaService,
  Notificacion,
  TipoActorAuditoria,
} from '../core';

/** Días que se conserva un aviso de la campanita. */
export const DIAS_CONSERVACION_AVISOS = 90;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** Borra los avisos de más de `DIAS_CONSERVACION_AVISOS` días. Al arrancar y cada 24 h. */
@Injectable()
export class ConservacionAvisosService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ConservacionAvisosService.name);
  private temporizador: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Notificacion)
    private readonly avisos: Repository<Notificacion>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  onApplicationBootstrap(): void {
    void this.ejecutar();
    this.temporizador = setInterval(() => void this.ejecutar(), UN_DIA_MS);
    // No mantiene vivo el proceso solo por esta tarea.
    this.temporizador.unref();
  }

  onApplicationShutdown(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /** Devuelve cuántos avisos se borraron. */
  async borrarAvisosVencidos(ahora: Date = new Date()): Promise<number> {
    const limite = new Date(
      ahora.getTime() - DIAS_CONSERVACION_AVISOS * UN_DIA_MS,
    );
    const { affected } = await this.avisos.delete({
      createdAt: LessThan(limite),
    });
    const borrados = affected ?? 0;

    if (borrados > 0) {
      // Constancia de que se aplicó el plazo, sin ids ni texto.
      await this.auditoriaService.registrar({
        tipoActor: TipoActorAuditoria.SISTEMA,
        entidad: 'notificaciones',
        accion: AccionAuditoria.DELETE,
        datosNuevos: { avisos: borrados, plazoDias: DIAS_CONSERVACION_AVISOS },
      });
    }
    return borrados;
  }

  private async ejecutar(): Promise<void> {
    try {
      const borrados = await this.borrarAvisosVencidos();
      if (borrados > 0) {
        this.logger.log(`Plazo de conservación: ${borrados} avisos borrados.`);
      }
    } catch (error) {
      this.logger.error(
        `No se pudo aplicar el plazo de conservación de avisos: ${String(error)}`,
      );
    }
  }
}
