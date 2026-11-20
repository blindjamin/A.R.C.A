import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccionAuditoria,
  AuditoriaService,
  ESTADOS_FINALES,
  SolicitudRetiro,
  TipoActorAuditoria,
} from '../core';

/**
 * Días que se conserva la dirección de retiro después de cerrar la solicitud
 * (decisión 016). Da margen a que un admin reabra una rechazada o retirada.
 */
export const DIAS_CONSERVACION_DIRECCION = 30;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Borra la dirección de retiro de las solicitudes cerradas hace más de
 * `DIAS_CONSERVACION_DIRECCION` días. Corre al arrancar y una vez al día.
 *
 * La dirección puede ser de un tercero (el vecino pide el retiro para un
 * familiar): una vez cerrado el retiro no tiene finalidad (Ley 21.719).
 */
@Injectable()
export class ConservacionDireccionesService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ConservacionDireccionesService.name);
  private temporizador: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudes: Repository<SolicitudRetiro>,
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

  /** Devuelve cuántas solicitudes perdieron su dirección. */
  async borrarDireccionesVencidas(ahora: Date = new Date()): Promise<number> {
    const limite = new Date(
      ahora.getTime() - DIAS_CONSERVACION_DIRECCION * UN_DIA_MS,
    );
    const resultado = await this.solicitudes
      .createQueryBuilder()
      .update(SolicitudRetiro)
      .set({ direccionRetiro: null, direccionAnonimizada: null })
      .where('estado IN (:...finales)', { finales: [...ESTADOS_FINALES] })
      .andWhere('fecha_cierre < :limite', { limite })
      .andWhere(
        '(direccion_retiro IS NOT NULL OR direccion_anonimizada IS NOT NULL)',
      )
      .execute();
    const borradas = resultado.affected ?? 0;

    if (borradas > 0) {
      // Constancia de que se aplicó el plazo, sin ids ni direcciones.
      await this.auditoriaService.registrar({
        tipoActor: TipoActorAuditoria.SISTEMA,
        entidad: 'solicitudes_retiro',
        accion: AccionAuditoria.UPDATE,
        datosNuevos: {
          direccionesBorradas: borradas,
          plazoDias: DIAS_CONSERVACION_DIRECCION,
        },
      });
    }

    return borradas;
  }

  private async ejecutar(): Promise<void> {
    try {
      const borradas = await this.borrarDireccionesVencidas();
      if (borradas > 0) {
        this.logger.log(
          `Plazo de conservación: ${borradas} direcciones de retiro borradas.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `No se pudo aplicar el plazo de conservación de direcciones: ${String(error)}`,
      );
    }
  }
}
