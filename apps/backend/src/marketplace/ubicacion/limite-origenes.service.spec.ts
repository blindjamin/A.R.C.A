import {
  LimiteOrigenesService,
  MAX_ORIGENES_POR_VENTANA,
  VENTANA_ORIGENES_MS,
} from './limite-origenes.service';
import { aproximarAGrilla, type Coordenadas } from './ubicacion-marketplace';

const VECINO = '00000000-0000-4000-8000-000000000001';
const OTRO_VECINO = '00000000-0000-4000-8000-000000000002';
const ARTICULO: Coordenadas = { latitud: -33.6365, longitud: -71.6296 };

/** Un origen distinto por índice: cada uno en otra celda de 250 m (1 km al norte). */
const origen = (i: number): Coordenadas => ({
  latitud: -33.6 + i * 0.009,
  longitud: -71.6,
});

describe('LimiteOrigenesService', () => {
  let service: LimiteOrigenesService;
  let ahora: number;

  beforeEach(() => {
    ahora = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => ahora);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    service = new LimiteOrigenesService();
    // Silencia el aviso del logger en la salida de los tests.
    (service as unknown as { logger: { warn: () => void } }).logger.warn = () =>
      undefined;
  });

  afterEach(() => jest.restoreAllMocks());

  it(`permite hasta ${MAX_ORIGENES_POR_VENTANA} orígenes distintos y bloquea el siguiente`, () => {
    for (let i = 0; i < MAX_ORIGENES_POR_VENTANA; i++) {
      expect(service.registrarOrigen(VECINO, origen(i))).toBe(true);
    }
    expect(
      service.registrarOrigen(VECINO, origen(MAX_ORIGENES_POR_VENTANA)),
    ).toBe(false);
  });

  it('volver a una celda ya usada no cuenta como origen nuevo', () => {
    for (let i = 0; i < MAX_ORIGENES_POR_VENTANA; i++) {
      service.registrarOrigen(VECINO, origen(i));
    }
    expect(service.registrarOrigen(VECINO, origen(3))).toBe(true);
    // Moverse unos metros dentro de la misma celda tampoco suma.
    const centro = aproximarAGrilla(origen(3));
    const casi = {
      latitud: centro.latitud + 0.00005,
      longitud: centro.longitud - 0.00005,
    };
    expect(service.registrarOrigen(VECINO, casi)).toBe(true);
  });

  it('pasada la ventana de una hora, el vecino vuelve a tener cupo', () => {
    for (let i = 0; i <= MAX_ORIGENES_POR_VENTANA; i++) {
      service.registrarOrigen(VECINO, origen(i));
    }
    ahora += VENTANA_ORIGENES_MS;
    expect(service.registrarOrigen(VECINO, origen(99))).toBe(true);
  });

  it('el límite es por vecino', () => {
    for (let i = 0; i <= MAX_ORIGENES_POR_VENTANA; i++) {
      service.registrarOrigen(VECINO, origen(i));
    }
    expect(service.registrarOrigen(OTRO_VECINO, origen(0))).toBe(true);
  });

  it('al superar el límite, bandaPara devuelve null en vez de un error', () => {
    for (let i = 0; i < MAX_ORIGENES_POR_VENTANA; i++) {
      expect(service.bandaPara(VECINO, origen(i), ARTICULO)).not.toBeNull();
    }
    expect(service.bandaPara(VECINO, origen(50), ARTICULO)).toBeNull();
  });

  it('sin origen no hay banda ni se registra nada', () => {
    expect(service.bandaPara(VECINO, null, ARTICULO)).toBeNull();
    for (let i = 0; i < MAX_ORIGENES_POR_VENTANA; i++) {
      expect(service.registrarOrigen(VECINO, origen(i))).toBe(true);
    }
  });

  it('suelta de memoria a los vecinos que dejaron de consultar', () => {
    service.registrarOrigen(VECINO, origen(0));
    ahora += VENTANA_ORIGENES_MS;
    service.registrarOrigen(OTRO_VECINO, origen(0));

    const mapa = (
      service as unknown as { celdasPorVecino: Map<string, unknown> }
    ).celdasPorVecino;
    expect([...mapa.keys()]).toEqual([OTRO_VECINO]);
  });
});
