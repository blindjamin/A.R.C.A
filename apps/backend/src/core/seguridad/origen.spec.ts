import type { NextFunction, Request, Response } from 'express';
import { origenesPermitidos, verificarOrigen } from './origen';

const FRONTEND = 'https://arca.santodomingo.cl';

function probar(
  metodo: string,
  origen?: string,
  ruta = '/api/solicitudes-retiro',
  exentas: string[] = [],
) {
  const req = {
    method: metodo,
    path: ruta,
    headers: origen === undefined ? {} : { origin: origen },
  } as unknown as Request;
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = jest.fn() as NextFunction;
  verificarOrigen([FRONTEND], exentas)(req, res, next);
  return { next, status };
}

describe('verificarOrigen', () => {
  it('deja pasar un POST desde el frontend', () => {
    expect(probar('POST', FRONTEND).next).toHaveBeenCalled();
  });

  it('rechaza con 403 un POST desde otro sitio, aunque sea del mismo dominio', () => {
    const { next, status } = probar('POST', 'https://otro.santodomingo.cl');
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it('rechaza PATCH y DELETE desde otro sitio, y el origen "null"', () => {
    expect(probar('PATCH', 'https://malo.example').status).toHaveBeenCalledWith(
      403,
    );
    expect(probar('DELETE', 'null').status).toHaveBeenCalledWith(403);
  });

  it('no revisa los métodos que solo leen', () => {
    expect(probar('GET', 'https://malo.example').next).toHaveBeenCalled();
  });

  it('deja pasar sin Origin (cliente que no es un navegador)', () => {
    expect(probar('POST').next).toHaveBeenCalled();
  });

  it('deja pasar una ruta exenta aunque venga de otro sitio', () => {
    const ruta = '/api/pagos/retorno';
    expect(
      probar('POST', 'https://webpay.cl', ruta, [ruta]).next,
    ).toHaveBeenCalled();
  });
});

describe('origenesPermitidos', () => {
  it('lee FRONTEND_URL separado por comas, sin espacios', () => {
    expect(origenesPermitidos(' https://a.cl , https://b.cl ')).toEqual([
      'https://a.cl',
      'https://b.cl',
    ]);
  });

  it('sin configurar, usa el frontend local', () => {
    expect(origenesPermitidos(undefined)).toEqual(['http://localhost:5173']);
  });
});
