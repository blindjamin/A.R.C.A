/**
 * Aproximación de las coordenadas que salen del municipio
 * (spec `derivacion-excel` §2.2).
 *
 * Decisión del Product Owner (2026-09-21): el Excel que recibe la empresa
 * operadora **no lleva la ubicación exacta del vecino**. La columna guardaba
 * `latitud_capturada` y `longitud_capturada` con precisión de centímetros, que
 * es la puerta de la casa; eso dejaba sin efecto la dirección aproximada que va
 * en la misma fila.
 *
 * El punto se lleva a una grilla de 20 metros. Dos propiedades importan:
 *
 * - **No se puede revertir.** Redondear destruye los decimales finos; no hay
 *   clave que permita recuperar el punto original desde el Excel. Si en vez de
 *   esto se desplazara el punto con una fórmula, quien conociera la fórmula
 *   podría deshacerla.
 * - **Es estable.** El mismo lote descargado dos veces da el mismo punto. Si
 *   cada descarga moviera el punto al azar, promediar varias descargas
 *   devolvería la ubicación exacta.
 *
 * La empresa recibe entonces el cuadrado de 20 metros donde está el objeto, no
 * la vivienda. El desplazamiento máximo es de unos 14 metros (la mitad de la
 * diagonal de la celda), siempre dentro del radio acordado.
 */

/** Radio dentro del cual queda el punto entregado, en metros. */
export const RADIO_APROXIMACION_M = 20;

/** Un grado de latitud, en metros. Constante en toda la Tierra. */
const METROS_POR_GRADO_LATITUD = 111_320;

/** Seis decimales son ~0,11 m: ruido despreciable frente a la grilla. */
const DECIMALES = 6;

export interface CoordenadasAproximadas {
  latitud: number | null;
  longitud: number | null;
}

const aNumero = (valor: string | number | null): number | null => {
  if (valor === null || valor === undefined || valor === '') return null;

  const numero = typeof valor === 'number' ? valor : Number(valor);

  return Number.isFinite(numero) ? numero : null;
};

const aGrilla = (valor: number, paso: number): number =>
  Number((Math.round(valor / paso) * paso).toFixed(DECIMALES));

/**
 * Lleva el punto al centro de su celda de 20 metros.
 *
 * Si falta cualquiera de las dos coordenadas devuelve ambas en `null`: media
 * ubicación no sirve para ubicar nada y sí revela una franja del mapa.
 */
export function aproximarCoordenadas(
  latitud: string | number | null,
  longitud: string | number | null,
): CoordenadasAproximadas {
  const lat = aNumero(latitud);
  const lon = aNumero(longitud);

  if (lat === null || lon === null) {
    return { latitud: null, longitud: null };
  }

  const pasoLatitud = RADIO_APROXIMACION_M / METROS_POR_GRADO_LATITUD;

  // Los meridianos se juntan hacia los polos: un grado de longitud mide menos
  // cuanto más lejos del ecuador, así que el paso se corrige por la latitud.
  const coseno = Math.abs(Math.cos((lat * Math.PI) / 180));
  const pasoLongitud = coseno < 1e-6 ? pasoLatitud : pasoLatitud / coseno;

  return {
    latitud: aGrilla(lat, pasoLatitud),
    longitud: aGrilla(lon, pasoLongitud),
  };
}
