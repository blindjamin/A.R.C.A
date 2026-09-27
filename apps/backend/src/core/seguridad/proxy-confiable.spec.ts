import { TRUST_PROXY_POR_DEFECTO, valorProxyConfiable } from './proxy-confiable';

describe('valorProxyConfiable', () => {
  it('sin configurar, confía solo en el proxy local', () => {
    expect(valorProxyConfiable(undefined)).toBe(TRUST_PROXY_POR_DEFECTO);
    expect(valorProxyConfiable('  ')).toBe('loopback');
  });

  it('"false" desactiva la confianza en proxies', () => {
    expect(valorProxyConfiable('false')).toBe(false);
  });

  it('un número se interpreta como cantidad de saltos', () => {
    expect(valorProxyConfiable('1')).toBe(1);
  });

  it('una IP o subred se pasa tal cual', () => {
    expect(valorProxyConfiable('10.0.0.0/8')).toBe('10.0.0.0/8');
  });
});
