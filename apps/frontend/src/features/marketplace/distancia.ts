import { useEffect, useState } from 'react';

// Distancia en el Marketplace — decisión de privacidad, no de diseño.
//
// Un vecino nunca ve a cuántos metros está un artículo, solo una banda. Y la
// banda la calcula el BACKEND: la API no le entrega a nadie la coordenada del
// artículo, ni siquiera la aproximada, porque con ella se ubica la casa de
// quien publica. El navegador solo envía su propio punto, ya redondeado a 20 m.
//
// La regla que vale es la del backend
// (apps/backend/src/marketplace/ubicacion/ubicacion-marketplace.ts): mide sobre
// una grilla de 250 m —vuelve a aproximar este punto, porque no confía en el
// cliente— y limita cuántos orígenes distintos puede usar cada vecino, para
// que no se pueda triangular la ubicación de un artículo. Lo de este archivo
// solo alimenta los datos de ejemplo y la privacidad del lado del navegador.

export type BandaDistancia = 'menos_1km' | '1_5km' | '5_10km' | 'mas_10km';

export const ETIQUETA_BANDA: Record<BandaDistancia, string> = {
  menos_1km: 'Menos de 1 km',
  '1_5km': '1 a 5 km',
  '5_10km': '5 a 10 km',
  mas_10km: 'Más de 10 km',
};

/**
 * Regla de corte entre bandas, la misma que `bandaPorMetros` del backend. Aquí
 * solo la usan los datos de ejemplo; la banda real llega calculada en la API
 * sobre la grilla de 250 m. Los límites caen en la banda más cercana
 * (1000 m → "menos de 1 km").
 */
export function bandaPorMetros(metros: number): BandaDistancia {
  if (metros <= 1_000) return 'menos_1km';
  if (metros <= 5_000) return '1_5km';
  if (metros <= 10_000) return '5_10km';
  return 'mas_10km';
}

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

const RADIO_APROXIMACION_M = 20;
const METROS_POR_GRADO_LATITUD = 111_320;
const DECIMALES = 6;

const aGrilla = (valor: number, paso: number): number =>
  Number((Math.round(valor / paso) * paso).toFixed(DECIMALES));

/**
 * Lleva el punto al centro de su celda de 20 m antes de que salga del teléfono.
 * Es el mismo algoritmo que
 * apps/backend-admin/src/derivaciones/coordenadas-aproximadas.ts (copiado, no
 * importado: son apps distintas). Redondear no se puede revertir y es estable,
 * así que enviar el punto varias veces no permite promediarlo hacia el exacto.
 * El backend después lo lleva a su grilla de 250 m; esto solo evita que el
 * punto exacto viaje por la red o quede en logs.
 */
export function aproximarA20m(latitud: number, longitud: number): Coordenadas {
  const pasoLatitud = RADIO_APROXIMACION_M / METROS_POR_GRADO_LATITUD;
  const coseno = Math.abs(Math.cos((latitud * Math.PI) / 180));
  const pasoLongitud = coseno < 1e-6 ? pasoLatitud : pasoLatitud / coseno;

  return {
    latitud: aGrilla(latitud, pasoLatitud),
    longitud: aGrilla(longitud, pasoLongitud),
  };
}

export type EstadoUbicacion = 'pidiendo' | 'ok' | 'denegado';

/**
 * Pide la ubicación del navegador una sola vez y la devuelve ya aproximada.
 * El punto exacto nunca sale de este hook. Sin permiso (o sin GPS) devuelve
 * `origen: null` y las tarjetas se muestran sin banda.
 */
export function useOrigenAproximado(): {
  origen: Coordenadas | null;
  estado: EstadoUbicacion;
} {
  const [origen, setOrigen] = useState<Coordenadas | null>(null);
  const [estado, setEstado] = useState<EstadoUbicacion>(() =>
    'geolocation' in navigator ? 'pidiendo' : 'denegado',
  );

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigen(aproximarA20m(pos.coords.latitude, pos.coords.longitude));
        setEstado('ok');
      },
      () => setEstado('denegado'),
      // Precisión baja basta: el punto se redondea a 20 m y la banda más fina
      // es de 1 km. Se acepta una posición cacheada de hasta 10 minutos.
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: 10_000 },
    );
  }, []);

  return { origen, estado };
}
