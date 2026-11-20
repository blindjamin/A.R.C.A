// Fechas compartidas por las pantallas del panel que filtran por rango.

// El backend no acepta rangos de más de un año.
const RANGO_MAXIMO_DIAS = 366;
const DIA_MS = 24 * 60 * 60 * 1000;

// Las fechas de los <input type="date"> son días de Chile: se mandan como el
// primer y el último instante de ese día en la hora del navegador.
export const inicioDelDia = (dia: string): string =>
  new Date(`${dia}T00:00:00`).toISOString();
export const finDelDia = (dia: string): string =>
  new Date(`${dia}T23:59:59.999`).toISOString();

/** Mensaje si el rango de días no es válido para el backend; `null` si está bien. */
export function errorDeRango(diaDesde: string, diaHasta: string): string | null {
  if (!diaDesde || !diaHasta) return null;
  const dias = (Date.parse(diaHasta) - Date.parse(diaDesde)) / DIA_MS;
  if (dias < 0) return 'La fecha «desde» es posterior a «hasta».';
  if (dias > RANGO_MAXIMO_DIAS) return 'El rango no puede superar un año.';
  return null;
}

export const formatoFechaHora = (iso: string): string =>
  new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
