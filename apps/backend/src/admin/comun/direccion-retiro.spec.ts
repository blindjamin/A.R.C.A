import { direccionDe } from './direccion-retiro';

describe('direccionDe', () => {
  it('prefiere la dirección real sobre la anonimizada', () => {
    expect(
      direccionDe({
        direccionRetiro: 'Pasaje Real 742',
        direccionAnonimizada: 'Calle X',
      }),
    ).toBe('Pasaje Real 742');
  });

  it.each([null, ''])('cae a la anonimizada si direccionRetiro es %p', (v) => {
    expect(
      direccionDe({ direccionRetiro: v, direccionAnonimizada: 'Calle X' }),
    ).toBe('Calle X');
  });

  it('devuelve cadena vacía si no hay ninguna', () => {
    expect(
      direccionDe({ direccionRetiro: null, direccionAnonimizada: null }),
    ).toBe('');
  });
});
