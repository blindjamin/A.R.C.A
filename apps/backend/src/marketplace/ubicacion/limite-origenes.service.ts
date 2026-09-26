import { Injectable, Logger } from '@nestjs/common';
import {
  calcularBanda,
  celdaDe,
  type BandaDistancia,
  type Coordenadas,
} from './ubicacion-marketplace';

/** Ventana en la que se cuentan los orígenes distintos de un vecino. */
export const VENTANA_ORIGENES_MS = 60 * 60 * 1000;

/**
 * Celdas de 250 m distintas desde las que un vecino puede consultar distancias
 * en una hora. Alguien que se mueve por la comuna cambia de celda unas pocas
 * veces; triangular un artículo exige consultarlo desde muchas.
 */
export const MAX_ORIGENES_POR_VENTANA = 10;

/**
 * Límite de orígenes distintos por vecino (defensa contra triangulación).
 *
 * El rate limiting general cuenta peticiones por IP; esto cuenta DESDE DÓNDE
 * dice estar cada vecino. Si supera el máximo de celdas distintas en la
 * ventana, sus consultas siguen funcionando pero sin banda de distancia (null),
 * igual que si no hubiera compartido su ubicación: no se le da un error que le
 * indique cómo esquivar el límite. Volver a una celda ya usada sí se permite.
 *
 * Vive en memoria del proceso, igual que el rate limiting: suficiente con una
 * instancia por backend.
 */
@Injectable()
export class LimiteOrigenesService {
  private readonly logger = new Logger(LimiteOrigenesService.name);
  private readonly celdasPorVecino = new Map<string, Map<string, number>>();
  private ultimaLimpieza = Date.now();

  /**
   * Banda entre `origen` y `articulo` para el vecino `ciudadanoId`, o null si
   * falta un punto o si el vecino superó el límite de orígenes distintos.
   */
  bandaPara(
    ciudadanoId: string,
    origen: Coordenadas | null | undefined,
    articulo: Coordenadas | null | undefined,
  ): BandaDistancia | null {
    if (!origen || !this.registrarOrigen(ciudadanoId, origen)) return null;
    return calcularBanda(origen, articulo);
  }

  /** true si el vecino puede consultar desde `origen`; lo deja registrado. */
  registrarOrigen(ciudadanoId: string, origen: Coordenadas): boolean {
    const ahora = Date.now();
    this.limpiarVencidos(ahora);
    const celdas = this.vigentes(ciudadanoId, ahora);
    const celda = celdaDe(origen);

    if (!celdas.has(celda) && celdas.size >= MAX_ORIGENES_POR_VENTANA) {
      this.logger.warn(
        `Vecino superó ${MAX_ORIGENES_POR_VENTANA} orígenes distintos en una hora; se omite la banda de distancia.`,
      );
      return false;
    }

    celdas.set(celda, ahora);
    this.celdasPorVecino.set(ciudadanoId, celdas);
    return true;
  }

  /**
   * Una vez por ventana recorre todos los vecinos y suelta los que ya no tienen
   * celdas vigentes; si no, quien deja de consultar quedaría en memoria.
   */
  private limpiarVencidos(ahora: number): void {
    if (ahora - this.ultimaLimpieza < VENTANA_ORIGENES_MS) return;
    this.ultimaLimpieza = ahora;
    for (const ciudadanoId of [...this.celdasPorVecino.keys()]) {
      this.vigentes(ciudadanoId, ahora);
    }
  }

  /** Celdas del vecino todavía dentro de la ventana; descarta las vencidas. */
  private vigentes(ciudadanoId: string, ahora: number): Map<string, number> {
    const celdas =
      this.celdasPorVecino.get(ciudadanoId) ?? new Map<string, number>();
    for (const [celda, vista] of celdas) {
      if (ahora - vista >= VENTANA_ORIGENES_MS) celdas.delete(celda);
    }
    if (celdas.size === 0) this.celdasPorVecino.delete(ciudadanoId);
    return celdas;
  }
}
