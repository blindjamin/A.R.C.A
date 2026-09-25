import {
  GRILLA_MARKETPLACE_M,
  aproximarAGrilla,
  aproximarParaGuardar,
  bandaPorMetros,
  calcularBanda,
  distanciaMetros,
  type Coordenadas,
} from './ubicacion-marketplace';

// Plaza de Santo Domingo (aprox.), punto de referencia para las pruebas.
const CENTRO: Coordenadas = { latitud: -33.6365, longitud: -71.6296 };

const METROS_POR_GRADO_LATITUD = 111_320;

/** Desplaza un punto `norte` y `este` metros (aproximación plana, basta a esta escala). */
const mover = (p: Coordenadas, norte: number, este: number): Coordenadas => ({
  latitud: p.latitud + norte / METROS_POR_GRADO_LATITUD,
  longitud:
    p.longitud +
    este / (METROS_POR_GRADO_LATITUD * Math.cos((p.latitud * Math.PI) / 180)),
});

describe('aproximarAGrilla', () => {
  it('deja el punto a menos de media diagonal de celda (~177 m)', () => {
    for (let i = 0; i < 200; i++) {
      const p = mover(CENTRO, (i * 37) % 900, (i * 53) % 900);
      const aprox = aproximarAGrilla(p);
      expect(distanciaMetros(p, aprox)).toBeLessThanOrEqual(
        (GRILLA_MARKETPLACE_M * Math.SQRT2) / 2 + 1,
      );
    }
  });

  it('es estable: el mismo punto siempre da la misma celda', () => {
    expect(aproximarAGrilla(CENTRO)).toEqual(aproximarAGrilla({ ...CENTRO }));
  });
});

describe('aproximarParaGuardar', () => {
  it('guarda el punto ya llevado a la grilla, nunca el exacto', () => {
    const guardado = aproximarParaGuardar(CENTRO);
    expect(guardado).toEqual(aproximarAGrilla(CENTRO));
    expect(guardado).not.toEqual(CENTRO);
  });

  it('rechaza coordenadas inválidas', () => {
    expect(aproximarParaGuardar({ latitud: 91, longitud: 0 })).toBeNull();
    expect(
      aproximarParaGuardar({ latitud: 0, longitud: Number.NaN }),
    ).toBeNull();
  });
});

describe('distanciaMetros', () => {
  it('un grado de latitud mide ~111 km', () => {
    const d = distanciaMetros(
      { latitud: 0, longitud: 0 },
      { latitud: 1, longitud: 0 },
    );
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });
});

describe('bandaPorMetros', () => {
  it.each([
    [0, 'menos_1km'],
    [1_000, 'menos_1km'],
    [1_001, '1_5km'],
    [5_000, '1_5km'],
    [5_001, '5_10km'],
    [10_000, '5_10km'],
    [10_001, 'mas_10km'],
  ])('%i m → %s', (metros, banda) => {
    expect(bandaPorMetros(metros)).toBe(banda);
  });
});

describe('calcularBanda', () => {
  it('sin origen o sin artículo no hay banda', () => {
    expect(calcularBanda(null, CENTRO)).toBeNull();
    expect(calcularBanda(CENTRO, undefined)).toBeNull();
    expect(calcularBanda({ latitud: 200, longitud: 0 }, CENTRO)).toBeNull();
  });

  it('calcula la banda esperada a distancias claras', () => {
    expect(calcularBanda(CENTRO, mover(CENTRO, 300, 0))).toBe('menos_1km');
    expect(calcularBanda(CENTRO, mover(CENTRO, 3_000, 0))).toBe('1_5km');
    expect(calcularBanda(CENTRO, mover(CENTRO, 0, 7_500))).toBe('5_10km');
    expect(calcularBanda(CENTRO, mover(CENTRO, 20_000, 0))).toBe('mas_10km');
  });

  // La garantía contra triangulación: dos casas dentro de la misma celda de
  // 250 m son indistinguibles desde CUALQUIER origen, por muchas consultas que
  // se hagan. Lo máximo que se puede recuperar es la celda.
  it('dos posiciones en la misma celda dan la misma banda desde cualquier origen', () => {
    const celda = aproximarAGrilla(CENTRO);
    const casaA = mover(celda, -40, 25);
    const casaB = mover(celda, 60, -70);
    expect(aproximarAGrilla(casaA)).toEqual(aproximarAGrilla(casaB));

    for (let norte = -12_000; norte <= 12_000; norte += 137) {
      for (const este of [-9_000, -1_050, -990, 0, 995, 1_010, 4_990, 9_000]) {
        const origen = mover(CENTRO, norte, este);
        expect(calcularBanda(origen, casaA)).toBe(calcularBanda(origen, casaB));
      }
    }
  });

  it('el punto que manda el cliente también se lleva a la grilla', () => {
    const articulo = mover(CENTRO, 2_000, 0);
    const origen = aproximarAGrilla(CENTRO);
    const origenCorrido = mover(origen, 30, -30);
    expect(calcularBanda(origenCorrido, articulo)).toBe(
      calcularBanda(origen, articulo),
    );
  });
});
