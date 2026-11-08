import { limitePorIp } from './limites';

describe('limitePorIp', () => {
  const nombre = 'LIMITE_IP_PRUEBA';

  afterEach(() => {
    delete process.env[nombre];
  });

  it('sin variable usa el piso', () => {
    expect(limitePorIp(nombre, 120)).toBe(120);
  });

  it('un valor mayor reemplaza el piso', () => {
    process.env[nombre] = '400';
    expect(limitePorIp(nombre, 120)).toBe(400);
  });

  it('un valor menor o inválido no baja el piso', () => {
    process.env[nombre] = '10';
    expect(limitePorIp(nombre, 120)).toBe(120);
    process.env[nombre] = 'no-es-un-numero';
    expect(limitePorIp(nombre, 120)).toBe(120);
  });
});
