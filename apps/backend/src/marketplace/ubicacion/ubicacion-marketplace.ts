/**
 * Ubicación en el Marketplace: cómo se calcula la banda de distancia entre un
 * vecino y un artículo sin revelar dónde vive quien lo publica.
 *
 * Decisiones de Miguel Segovia, encargado de seguridad (2026-09-24 y 25; ver
 * docs/BACKEND_FASE1.md, sección "Rate limiting y ubicación del Marketplace"):
 *
 * 1. Solo se muestra una BANDA (menos de 1 km, 1 a 5, 5 a 10, más de 10). La
 *    API nunca devuelve la coordenada del artículo.
 * 2. Grilla de 250 m. Tanto el artículo como el punto de quien consulta se
 *    llevan al centro de su celda de 250 m antes de medir. Aunque alguien
 *    consulte desde muchos puntos falsos y ubique los bordes de las bandas
 *    (triangulación), lo máximo que recupera es esa celda: el sector, no la
 *    casa. Esta es la garantía de fondo; los límites de consultas solo
 *    encarecen el intento.
 *    El artículo se guarda YA aproximado (ver `aproximarParaGuardar`): si la
 *    base se filtra, tampoco trae la casa.
 * 3. Se descartó desplazar los bordes de las bandas con un valor fijo por
 *    artículo: el borde sigue siendo un círculo centrado en el artículo, y por
 *    tres puntos de un círculo se obtiene su centro sin conocer el radio.
 *
 * Los 20 m del Excel de derivación (backend-admin) no cambian: allí la empresa
 * operadora necesita encontrar el objeto; aquí solo se informa si está cerca.
 */

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export type BandaDistancia = 'menos_1km' | '1_5km' | '5_10km' | 'mas_10km';

/** Lado de la celda de la grilla del Marketplace, en metros. */
export const GRILLA_MARKETPLACE_M = 250;

const METROS_POR_GRADO_LATITUD = 111_320;
const RADIO_TIERRA_M = 6_371_000;
const DECIMALES = 6;

const aGrilla = (valor: number, paso: number): number =>
  Number((Math.round(valor / paso) * paso).toFixed(DECIMALES));

const esCoordenadaValida = ({ latitud, longitud }: Coordenadas): boolean =>
  Number.isFinite(latitud) &&
  Number.isFinite(longitud) &&
  Math.abs(latitud) <= 90 &&
  Math.abs(longitud) <= 180;

/**
 * Lleva el punto al centro de su celda de `pasoM` metros. Mismo método que
 * backend-admin/src/derivaciones/coordenadas-aproximadas.ts: redondear no se
 * puede revertir y es estable (el mismo punto da siempre la misma celda, así
 * que repetir consultas no permite promediar hacia el punto exacto).
 */
export function aproximarAGrilla(
  punto: Coordenadas,
  pasoM: number = GRILLA_MARKETPLACE_M,
): Coordenadas {
  const pasoLatitud = pasoM / METROS_POR_GRADO_LATITUD;
  const latitud = aGrilla(punto.latitud, pasoLatitud);

  // El paso de longitud se corrige por la latitud de la FILA (ya redondeada),
  // no por la del punto: así todos los puntos de una fila comparten las mismas
  // columnas y la grilla es una partición real (dos casas de la misma celda
  // caen siempre en el mismo centro).
  const coseno = Math.abs(Math.cos((latitud * Math.PI) / 180));
  const pasoLongitud = coseno < 1e-6 ? pasoLatitud : pasoLatitud / coseno;

  return { latitud, longitud: aGrilla(punto.longitud, pasoLongitud) };
}

/**
 * Coordenada que se debe PERSISTIR para un artículo del Marketplace. Nunca se
 * guarda el punto exacto que manda el teléfono. Devuelve null si el punto no
 * es válido.
 */
export function aproximarParaGuardar(punto: Coordenadas): Coordenadas | null {
  return esCoordenadaValida(punto) ? aproximarAGrilla(punto) : null;
}

/** Distancia en metros entre dos puntos (fórmula del haversine). */
export function distanciaMetros(a: Coordenadas, b: Coordenadas): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitud)) *
      Math.cos(rad(b.latitud)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Regla de corte entre bandas. La misma que usa el frontend en sus datos de
 * ejemplo (apps/frontend/src/features/marketplace/distancia.ts): los límites
 * caen en la banda más cercana (1000 m → "menos de 1 km").
 */
export function bandaPorMetros(metros: number): BandaDistancia {
  if (metros <= 1_000) return 'menos_1km';
  if (metros <= 5_000) return '1_5km';
  if (metros <= 10_000) return '5_10km';
  return 'mas_10km';
}

/**
 * Banda entre quien consulta y un artículo. Ambos puntos se llevan a la grilla
 * de 250 m: el del artículo por si se guardó con más precisión de la debida, y
 * el de quien consulta porque lo manda el cliente y no se confía en él.
 * Devuelve null si falta o no es válido alguno de los dos puntos.
 */
export function calcularBanda(
  origen: Coordenadas | null | undefined,
  articulo: Coordenadas | null | undefined,
): BandaDistancia | null {
  if (!origen || !articulo) return null;
  if (!esCoordenadaValida(origen) || !esCoordenadaValida(articulo)) return null;

  return bandaPorMetros(
    distanciaMetros(aproximarAGrilla(origen), aproximarAGrilla(articulo)),
  );
}

/** Clave estable de la celda de un punto, para contar orígenes distintos. */
export function celdaDe(punto: Coordenadas): string {
  const { latitud, longitud } = aproximarAGrilla(punto);
  return `${latitud},${longitud}`;
}
