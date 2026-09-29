import {
  type ArticuloMarketplace,
  EstadoArticuloMarketplace,
  type ResiduoCatalogo,
  TipoArticuloMarketplace,
} from '../core';
import { VALOR_BASE } from '../creditos/reglas-creditos';
import {
  aArticuloPublico,
  calcularReputaciones,
  coordenadasDe,
  DIAS_VIGENCIA_ARTICULO,
  esVisiblePara,
  estaVencido,
  fechaExpiracionDesde,
  NOMBRE_PUBLICADOR_PROVISORIO,
} from './articulo-publico';

const PUBLICADOR = '00000000-0000-4000-8000-000000000001';
const COMPRADOR = '00000000-0000-4000-8000-000000000002';
const OTRO = '00000000-0000-4000-8000-000000000003';
const AHORA = new Date('2026-09-29T12:00:00.000Z');

const articulo = (cambios: Partial<ArticuloMarketplace> = {}) =>
  ({
    id: 5,
    usuarioPublicadorId: PUBLICADOR,
    residuoCatalogoId: 3,
    tipo: TipoArticuloMarketplace.REGALO,
    titulo: 'Sofá',
    descripcion: null,
    estado: EstadoArticuloMarketplace.DISPONIBLE,
    fotoPath: null,
    latitud: '-33.63650000',
    longitud: '-71.62960000',
    fechaPublicacion: new Date('2026-09-20T12:00:00.000Z'),
    fechaExpiracion: new Date('2026-10-20T12:00:00.000Z'),
    usuarioCompradorId: null,
    fechaTransaccion: null,
    residuoCatalogo: { categoria: 'Muebles' } as ResiduoCatalogo,
    ...cambios,
  }) as ArticuloMarketplace;

describe('vigencia', () => {
  it(`vence ${DIAS_VIGENCIA_ARTICULO} días después de publicarse`, () => {
    expect(fechaExpiracionDesde(AHORA).toISOString()).toBe(
      '2026-10-29T12:00:00.000Z',
    );
  });

  it('está vencido justo al llegar la fecha de expiración', () => {
    expect(estaVencido(articulo({ fechaExpiracion: AHORA }), AHORA)).toBe(true);
    expect(
      estaVencido(
        articulo({ fechaExpiracion: new Date(AHORA.getTime() + 1) }),
        AHORA,
      ),
    ).toBe(false);
  });
});

describe('esVisiblePara', () => {
  it('un artículo disponible y vigente lo ve cualquiera', () => {
    expect(esVisiblePara(articulo(), OTRO, AHORA)).toBe(true);
  });

  it.each([
    ['reservado', { estado: EstadoArticuloMarketplace.EN_NEGOCIACION }],
    ['entregado', { estado: EstadoArticuloMarketplace.COMPLETADO }],
    ['retirado', { estado: EstadoArticuloMarketplace.RETIRADO }],
    ['vencido', { fechaExpiracion: new Date('2026-09-01T00:00:00.000Z') }],
  ])('un artículo %s no lo ve un tercero', (_caso, cambios) => {
    const a = articulo({ ...cambios, usuarioCompradorId: COMPRADOR });
    expect(esVisiblePara(a, OTRO, AHORA)).toBe(false);
  });

  it('un artículo reservado lo ven quien publicó y quien reservó', () => {
    const a = articulo({
      estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
      usuarioCompradorId: COMPRADOR,
    });
    expect(esVisiblePara(a, PUBLICADOR, AHORA)).toBe(true);
    expect(esVisiblePara(a, COMPRADOR, AHORA)).toBe(true);
  });
});

describe('coordenadasDe', () => {
  it('convierte los decimales de la base en números', () => {
    expect(coordenadasDe(articulo())).toEqual({
      latitud: -33.6365,
      longitud: -71.6296,
    });
  });

  it('es null si el artículo se publicó sin ubicación', () => {
    expect(coordenadasDe(articulo({ latitud: null, longitud: null }))).toBe(
      null,
    );
  });
});

describe('calcularReputaciones', () => {
  it('promedia con un decimal y cuenta por vecino', () => {
    const reputaciones = calcularReputaciones([
      { usuarioCalificadoId: PUBLICADOR, puntuacion: 5 },
      { usuarioCalificadoId: PUBLICADOR, puntuacion: 4 },
      { usuarioCalificadoId: PUBLICADOR, puntuacion: 4 },
      { usuarioCalificadoId: OTRO, puntuacion: 3 },
    ]);

    expect(reputaciones.get(PUBLICADOR)).toEqual({
      calificacionPromedio: 4.3,
      cantidadCalificaciones: 3,
    });
    expect(reputaciones.get(OTRO)).toEqual({
      calificacionPromedio: 3,
      cantidadCalificaciones: 1,
    });
  });
});

describe('aArticuloPublico', () => {
  it('no expone coordenadas, ruta de la foto ni ids de vecinos', () => {
    const publico = aArticuloPublico(
      articulo({ fotoPath: 'marketplace/abc.jpg', usuarioCompradorId: OTRO }),
      { ciudadanoId: OTRO, banda: 'menos_1km' },
    );
    const json = JSON.stringify(publico);

    expect(json).not.toContain('-33.6365');
    expect(json).not.toContain('abc.jpg');
    expect(json).not.toContain(PUBLICADOR);
    expect(json).not.toContain(OTRO);
    expect(publico.fotoUrl).toBe('/api/marketplace/articulos/5/foto');
  });

  it('usa el nombre provisorio, los créditos base y la reputación del publicador', () => {
    const publico = aArticuloPublico(articulo(), {
      ciudadanoId: OTRO,
      banda: null,
      reputacion: { calificacionPromedio: 4.5, cantidadCalificaciones: 2 },
    });

    expect(publico.publicador).toEqual({
      nombre: NOMBRE_PUBLICADOR_PROVISORIO,
      calificacionPromedio: 4.5,
      cantidadCalificaciones: 2,
    });
    expect(publico.creditos).toBe(VALOR_BASE);
    expect(publico.categoria).toBe('Muebles');
    expect(publico.esPropio).toBe(false);
  });

  it('sin calificaciones, el promedio es null', () => {
    const publico = aArticuloPublico(articulo(), {
      ciudadanoId: OTRO,
      banda: null,
    });
    expect(publico.publicador.calificacionPromedio).toBeNull();
    expect(publico.publicador.cantidadCalificaciones).toBe(0);
    expect(publico.fotoUrl).toBeNull();
  });

  it('puedoCalificar solo para quien recibió, entregado y sin calificar', () => {
    const entregado = articulo({
      estado: EstadoArticuloMarketplace.COMPLETADO,
      usuarioCompradorId: COMPRADOR,
    });

    const receptor = aArticuloPublico(entregado, {
      ciudadanoId: COMPRADOR,
      banda: null,
    });
    expect(receptor.soyReceptor).toBe(true);
    expect(receptor.puedoCalificar).toBe(true);

    expect(
      aArticuloPublico(entregado, {
        ciudadanoId: COMPRADOR,
        banda: null,
        yaCalifico: true,
      }).puedoCalificar,
    ).toBe(false);
    expect(
      aArticuloPublico(entregado, { ciudadanoId: PUBLICADOR, banda: null })
        .puedoCalificar,
    ).toBe(false);
    expect(
      aArticuloPublico(
        articulo({
          estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
          usuarioCompradorId: COMPRADOR,
        }),
        { ciudadanoId: COMPRADOR, banda: null },
      ).puedoCalificar,
    ).toBe(false);
  });
});
