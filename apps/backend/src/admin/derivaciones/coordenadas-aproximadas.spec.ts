import {
  aproximarCoordenadas,
  RADIO_APROXIMACION_M,
} from './coordenadas-aproximadas';

/** Distancia en metros entre dos puntos cercanos (plano local, basta acá). */
function metrosEntre(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const metrosPorGrado = 111_320;
  const dLat = (latB - latA) * metrosPorGrado;
  const dLon =
    (lonB - lonA) * metrosPorGrado * Math.cos((latA * Math.PI) / 180);

  return Math.hypot(dLat, dLon);
}

// Puntos repartidos por Santo Domingo, incluyendo bordes de celda.
const PUNTOS: ReadonlyArray<[number, number]> = [
  [-33.6167, -71.6167],
  [-33.61671, -71.61671],
  [-33.6295, -71.6301],
  [-33.6001, -71.5999],
  [-33.645123, -71.634567],
  [-33.65, -71.65],
];

describe('aproximarCoordenadas', () => {
  it('nunca mueve el punto más allá del radio acordado', () => {
    for (const [lat, lon] of PUNTOS) {
      const { latitud, longitud } = aproximarCoordenadas(lat, lon);

      expect(latitud).not.toBeNull();
      expect(
        metrosEntre(lat, lon, latitud as number, longitud as number),
      ).toBeLessThanOrEqual(RADIO_APROXIMACION_M);
    }
  });

  it('mueve el punto: no devuelve la ubicación exacta', () => {
    // Un punto elegido para caer lejos del centro de su celda.
    const [lat, lon] = [-33.645123, -71.634567];
    const { latitud, longitud } = aproximarCoordenadas(lat, lon);

    expect(
      metrosEntre(lat, lon, latitud as number, longitud as number),
    ).toBeGreaterThan(0);
  });

  it('es estable: dos descargas del mismo lote dan el mismo punto', () => {
    // Si variara, promediar varias descargas recuperaría el punto original.
    const primera = aproximarCoordenadas('-33.6167', '-71.6167');
    const segunda = aproximarCoordenadas('-33.6167', '-71.6167');

    expect(primera).toEqual(segunda);
  });

  it('acepta los decimales como texto, que es como llegan de MySQL', () => {
    expect(aproximarCoordenadas('-33.6167', '-71.6167')).toEqual(
      aproximarCoordenadas(-33.6167, -71.6167),
    );
  });

  it('sin una de las dos coordenadas no entrega ninguna', () => {
    expect(aproximarCoordenadas(null, '-71.6167')).toEqual({
      latitud: null,
      longitud: null,
    });
    expect(aproximarCoordenadas('-33.6167', null)).toEqual({
      latitud: null,
      longitud: null,
    });
    expect(aproximarCoordenadas('', '')).toEqual({
      latitud: null,
      longitud: null,
    });
  });

  it('descarta valores que no son números', () => {
    expect(aproximarCoordenadas('abc', '-71.6167')).toEqual({
      latitud: null,
      longitud: null,
    });
  });
});
