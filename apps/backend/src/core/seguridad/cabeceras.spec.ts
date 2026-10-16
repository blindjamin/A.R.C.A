import type { NextFunction, Request, Response } from 'express';
import { cabecerasDeSeguridad } from './cabeceras';

function cabeceras(produccion: boolean): Record<string, string> {
  const puestas: Record<string, string> = {};
  const res = {
    setHeader: (nombre: string, valor: string) => {
      puestas[nombre] = valor;
    },
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  cabecerasDeSeguridad(produccion)({} as Request, res, next);
  expect(next).toHaveBeenCalled();
  return puestas;
}

describe('cabecerasDeSeguridad', () => {
  it('pone las cabeceras que impiden incrustar la API y adivinar tipos', () => {
    expect(cabeceras(false)).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
  });

  it('exige HTTPS (HSTS) solo en producción', () => {
    expect(cabeceras(true)['Strict-Transport-Security']).toBe(
      'max-age=31536000',
    );
    expect(cabeceras(false)['Strict-Transport-Security']).toBeUndefined();
  });
});
