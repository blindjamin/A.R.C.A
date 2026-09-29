/**
 * Reglas de Circular Credits (spec `marketplace` §7).
 *
 * VALORES DE PRUEBA, pendientes de la regla definitiva de Miguel: por ahora
 * todos los objetos valen lo mismo. La regla final será proporcional al precio
 * del catálogo (`residuos_catalogo.precio`) y reemplaza solo `creditosPorEntrega`.
 */

/** Créditos por objeto entregado entre vecinos. */
export const VALOR_BASE = 100;

/** Bono por una calificación de 4 estrellas. Con 5, el doble; con 3 o menos, nada. */
export const BONO_4_ESTRELLAS = 50;

/** Máximo que gana un vecino en un mes calendario (hora de Chile). */
export const TOPE_MENSUAL = 1000;

/** Máximo que generan, en un mes, los intercambios entre los mismos dos vecinos. */
export const TOPE_PAREJA = 400;

/** Porcentaje de `VALOR_BASE` por una solicitud de retiro que llegó a `retirada`. */
export const PORCENTAJE_RETIRADA = 50;

export const ZONA_HORARIA_CHILE = 'America/Santiago';

/** Créditos que otorga la entrega de un objeto. */
export function creditosPorEntrega(): number {
  return VALOR_BASE;
}

export function bonoPorEstrellas(puntuacion: number): number {
  if (puntuacion >= 5) return BONO_4_ESTRELLAS * 2;
  if (puntuacion === 4) return BONO_4_ESTRELLAS;
  return 0;
}

export function creditosPorRetirada(): number {
  return Math.floor((VALOR_BASE * PORCENTAJE_RETIRADA) / 100);
}

export type TopeAlcanzado = 'mensual' | 'pareja';

export interface ResultadoTopes {
  monto: number;
  /** El tope que recortó el monto, o null si se otorgó completo. */
  tope: TopeAlcanzado | null;
}

/**
 * Recorta el monto para no pasar los topes: se otorga hasta completarlos y el
 * resto se pierde. `generadoPareja` es null cuando el tope por pareja no aplica
 * (retiro municipal).
 */
export function aplicarTopes(
  monto: number,
  ganadoMes: number,
  generadoPareja: number | null,
): ResultadoTopes {
  const disponibleMes = Math.max(0, TOPE_MENSUAL - ganadoMes);
  const disponiblePareja =
    generadoPareja === null
      ? Infinity
      : Math.max(0, TOPE_PAREJA - generadoPareja);

  const otorgado = Math.floor(Math.min(monto, disponibleMes, disponiblePareja));
  if (otorgado >= monto) return { monto: otorgado, tope: null };
  return {
    monto: otorgado,
    tope: disponiblePareja < disponibleMes ? 'pareja' : 'mensual',
  };
}

/** Desfase en ms de la hora de Chile respecto de UTC en ese instante. */
function desfaseChile(instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA_CHILE,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes): number =>
    Number(partes.find((p) => p.type === tipo)?.value);

  const comoUtc = Date.UTC(
    valor('year'),
    valor('month') - 1,
    valor('day'),
    valor('hour'),
    valor('minute'),
    valor('second'),
  );
  return comoUtc - Math.floor(instante.getTime() / 1000) * 1000;
}

/**
 * Instante en que empezó, en hora de Chile, el mes calendario de `ahora`. Las
 * fechas se guardan en UTC (`timezone: 'Z'`), así que el corte se calcula acá.
 */
export function inicioDeMesEnChile(ahora: Date): Date {
  const local = new Date(ahora.getTime() + desfaseChile(ahora));
  const primeroComoUtc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    1,
  );
  // El desfase del día 1 puede no ser el de hoy (cambio de horario de por medio).
  let inicio = primeroComoUtc - desfaseChile(new Date(primeroComoUtc));
  const corregido = primeroComoUtc - desfaseChile(new Date(inicio));
  if (corregido !== inicio) inicio = corregido;
  return new Date(inicio);
}
