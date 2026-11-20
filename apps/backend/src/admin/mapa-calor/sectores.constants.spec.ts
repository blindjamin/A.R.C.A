import {
  NOMBRES_SECTOR,
  SECTORES_PROVISIONALES,
  sectorMasCercano,
} from './sectores.constants';

describe('sectores.constants', () => {
  it.each(SECTORES_PROVISIONALES)(
    'el centroide de $nombre cae en su propio sector',
    ({ nombre, lat, lng }) => {
      expect(sectorMasCercano(lat, lng).nombre).toBe(nombre);
    },
  );

  it('un punto cercano a San Enrique cae en San Enrique', () => {
    const { lat, lng } = SECTORES_PROVISIONALES.find(
      (s) => s.nombre === 'San Enrique',
    )!;
    expect(sectorMasCercano(lat + 0.001, lng + 0.001).nombre).toBe(
      'San Enrique',
    );
  });

  it('NOMBRES_SECTOR agrega «Sin ubicación» al final', () => {
    expect(NOMBRES_SECTOR.at(-1)).toBe('Sin ubicación');
    expect(NOMBRES_SECTOR).toHaveLength(SECTORES_PROVISIONALES.length + 1);
  });
});
