import { EstadoPagoSolicitud, EstadoSolicitudRetiro } from '../../core';

/** Un año, inclusive. El mismo tope que las exportaciones del panel. */
export const DIAS_MAXIMO_REPORTE = 366;

export interface ObjetoReporte {
  categoria: string | null;
  cantidad: number;
}

export interface FilaReporte {
  fechaSolicitud: Date;
  estado: EstadoSolicitudRetiro;
  estadoPago: EstadoPagoSolicitud;
  monto: number | null;
  objetos: ObjetoReporte[];
}

export interface ReporteGestion {
  desde: string;
  hasta: string;
  /** Todas las solicitudes creadas en el rango, sea cual sea su estado. */
  solicitudesRecibidas: number;
  /** Solo las que llegaron a `retirada`. */
  retiros: number;
  /** Suma de `monto` de las que tienen el pago en `pagado`. */
  monto: number;
  porCategoria: { categoria: string; objetos: number }[];
}

const diaLocal = (fecha: Date): string => {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

/** Días entre dos fechas `AAAA-MM-DD`, inclusive. `null` si el texto no es una fecha. */
export function diasDelRango(desde: string, hasta: string): number | null {
  const inicio = new Date(`${desde}T00:00:00`);
  const fin = new Date(`${hasta}T00:00:00`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()))
    return null;
  if (fin < inicio) return null;
  return Math.round((fin.getTime() - inicio.getTime()) / 86_400_000) + 1;
}

/**
 * Agregados del rango. `solicitudesRecibidas` son todas; `retiros` solo las
 * de estado `retirada`; `monto` solo lo que tiene el pago en `pagado`.
 * Los objetos se cuentan sobre las recibidas. Ninguna fila trae vecino,
 * dirección ni identificador.
 */
export function calcularReporte(
  filas: FilaReporte[],
  desde: string,
  hasta: string,
): ReporteGestion {
  const enRango = filas.filter((fila) => {
    const dia = diaLocal(fila.fechaSolicitud);
    return dia >= desde && dia <= hasta;
  });
  const conteo = new Map<string, number>();
  for (const fila of enRango) {
    const objetos = fila.objetos.length
      ? fila.objetos
      : [{ categoria: null, cantidad: 1 }];
    for (const objeto of objetos) {
      const categoria = objeto.categoria?.trim() || 'Sin categoría';
      const cantidad =
        Number.isInteger(objeto.cantidad) && objeto.cantidad > 0
          ? objeto.cantidad
          : 1;
      conteo.set(categoria, (conteo.get(categoria) ?? 0) + cantidad);
    }
  }
  const pagadas = enRango.filter(
    (fila) => fila.estadoPago === EstadoPagoSolicitud.PAGADO,
  );
  return {
    desde,
    hasta,
    solicitudesRecibidas: enRango.length,
    retiros: enRango.filter(
      (fila) => fila.estado === EstadoSolicitudRetiro.RETIRADA,
    ).length,
    monto: pagadas.reduce((total, fila) => total + (fila.monto ?? 0), 0),
    porCategoria: [...conteo.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([categoria, objetos]) => ({ categoria, objetos })),
  };
}
