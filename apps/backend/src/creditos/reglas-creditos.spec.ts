import {
  aplicarTopes,
  bonoPorEstrellas,
  creditosPorEntrega,
  creditosPorRetirada,
  inicioDeMesEnChile,
  TOPE_MENSUAL,
  TOPE_PAREJA,
  VALOR_BASE,
} from './reglas-creditos';

describe('montos por origen', () => {
  it('la entrega vale VALOR_BASE', () => {
    expect(creditosPorEntrega()).toBe(VALOR_BASE);
  });

  it.each([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 50],
    [5, 100],
  ])('%i estrellas dan %i créditos de bono', (estrellas, bono) => {
    expect(bonoPorEstrellas(estrellas)).toBe(bono);
  });

  it('el retiro municipal da el 50 % de VALOR_BASE', () => {
    expect(creditosPorRetirada()).toBe(50);
  });
});

describe('aplicarTopes', () => {
  it('sin topes cerca, se otorga completo', () => {
    expect(aplicarTopes(100, 0, 0)).toEqual({ monto: 100, tope: null });
  });

  it('otorga hasta completar el tope mensual', () => {
    expect(aplicarTopes(100, TOPE_MENSUAL - 30, 0)).toEqual({
      monto: 30,
      tope: 'mensual',
    });
  });

  it('con el tope mensual lleno, 0 y el motivo', () => {
    expect(aplicarTopes(100, TOPE_MENSUAL, 0)).toEqual({
      monto: 0,
      tope: 'mensual',
    });
  });

  it('ejemplo de la spec: la pareja suma 200 + 200 y el tercero da 0', () => {
    expect(aplicarTopes(200, 0, 0).monto).toBe(200);
    expect(aplicarTopes(200, 200, 200).monto).toBe(200);
    expect(aplicarTopes(200, 400, TOPE_PAREJA)).toEqual({
      monto: 0,
      tope: 'pareja',
    });
  });

  it('el tope por pareja recorta aunque el mensual tenga espacio', () => {
    expect(aplicarTopes(100, 100, TOPE_PAREJA - 40)).toEqual({
      monto: 40,
      tope: 'pareja',
    });
  });

  it('sin pareja (retiro municipal) solo aplica el mensual', () => {
    expect(aplicarTopes(50, 0, null)).toEqual({ monto: 50, tope: null });
  });

  it('nunca da decimales ni negativos', () => {
    expect(aplicarTopes(10.9, 0, null).monto).toBe(10);
    expect(aplicarTopes(100, TOPE_MENSUAL + 500, 0).monto).toBe(0);
  });
});

describe('inicioDeMesEnChile', () => {
  it('a fin de septiembre (UTC-3) el mes empezó el 1 a medianoche con UTC-4', () => {
    expect(
      inicioDeMesEnChile(new Date('2026-09-29T17:47:00Z')).toISOString(),
    ).toBe('2026-09-01T04:00:00.000Z');
  });

  it('el 30 de septiembre a las 23:00 de Chile sigue siendo septiembre', () => {
    expect(
      inicioDeMesEnChile(new Date('2026-10-01T02:00:00Z')).toISOString(),
    ).toBe('2026-09-01T04:00:00.000Z');
  });

  it('el 1 de octubre a las 00:30 de Chile ya es octubre', () => {
    expect(
      inicioDeMesEnChile(new Date('2026-10-01T03:30:00Z')).toISOString(),
    ).toBe('2026-10-01T03:00:00.000Z');
  });

  it('en abril, con el horario de verano todavía vigente el día 1', () => {
    expect(
      inicioDeMesEnChile(new Date('2027-04-15T12:00:00Z')).toISOString(),
    ).toBe('2027-04-01T03:00:00.000Z');
  });
});
