import {
  TRUST_PROXY_POR_DEFECTO,
  confiarEnSocketLocal,
  valorProxyConfiable,
} from './proxy-confiable';

describe('confiarEnSocketLocal', () => {
  const soloLoopback = (direccion: string | undefined) =>
    direccion === '127.0.0.1';
  const regla = confiarEnSocketLocal(soloLoopback);

  it('confía en una conexión por socket local (sin dirección de origen)', () => {
    expect(regla(undefined, 0)).toBe(true);
    expect(regla('', 0)).toBe(true);
  });

  it('para el resto, respeta la regla original', () => {
    expect(regla('127.0.0.1', 0)).toBe(true);
    expect(regla('203.0.113.10', 0)).toBe(false);
  });
});

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
