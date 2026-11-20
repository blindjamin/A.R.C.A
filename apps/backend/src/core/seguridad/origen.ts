import type { NextFunction, Request, Response } from 'express';

/**
 * Chequeo de `Origin` en los métodos que modifican (defensa contra CSRF).
 *
 * La cookie de sesión es `SameSite=Lax`, que ya impide que otro sitio la use
 * en un POST. Pero para el navegador "el mismo sitio" es todo el dominio
 * registrable (`santodomingo.cl`): otro subdominio municipal comprometido
 * podría enviar un POST a A.R.C.A. con la cookie del vecino. Con este chequeo,
 * un POST/PUT/PATCH/DELETE que trae `Origin` solo pasa si viene del frontend.
 *
 * Sin `Origin` se deja pasar: los navegadores lo envían siempre en esos
 * métodos, así que su ausencia indica un cliente que no es un navegador (curl,
 * un script), que no puede usar la cookie de otra persona.
 */
const METODOS_QUE_MODIFICAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Rutas que reciben un POST desde otro sitio a propósito y no dependen de la
 * cookie. La vuelta de Webpay llega desde Transbank: el pago se reconoce por
 * su token, no por la sesión.
 */
export const RUTAS_SIN_CHEQUEO_DE_ORIGEN: readonly string[] = [
  '/api/pagos/retorno',
];

/** Orígenes del frontend, separados por coma en `FRONTEND_URL` (también los usa CORS). */
export function origenesPermitidos(
  entorno: string | undefined = process.env.FRONTEND_URL,
): string[] {
  return (entorno ?? 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
}

export function verificarOrigen(
  permitidos: readonly string[],
  exentas: readonly string[] = RUTAS_SIN_CHEQUEO_DE_ORIGEN,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origen = req.headers.origin;
    if (
      !METODOS_QUE_MODIFICAN.has(req.method) ||
      origen === undefined ||
      permitidos.includes(origen) ||
      exentas.includes(req.path)
    ) {
      next();
      return;
    }
    res.status(403).json({ statusCode: 403, message: 'Origen no permitido.' });
  };
}
