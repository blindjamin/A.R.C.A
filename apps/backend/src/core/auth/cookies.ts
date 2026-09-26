import type { CookieOptions, Request } from 'express';

/** Cookie con la sesión de ARCA: `<session_id>.<secreto>` (ver SesionService). */
export const COOKIE_SESION = 'arca_sesion';

/**
 * Lee una cookie de la cabecera cruda.
 *
 * Se hace a mano en vez de sumar `cookie-parser` para no agregar una dependencia
 * por un único uso. El listado de librerías comprometido con el municipio declara
 * los paquetes de producción del backend (13 desde que se sumó @nestjs/throttler
 * para el rate limiting), y conviene que siga siendo cierto.
 */
export function leerCookie(req: Request, nombre: string): string | undefined {
  const cabecera = req.headers.cookie;
  if (!cabecera) return undefined;

  for (const parte of cabecera.split(';')) {
    const separador = parte.indexOf('=');
    if (separador === -1) continue;

    if (parte.slice(0, separador).trim() === nombre) {
      return decodeURIComponent(parte.slice(separador + 1).trim());
    }
  }

  return undefined;
}

/**
 * Atributos de `arca_sesion`, compartidos por la creación y el borrado.
 *
 * Viven en un solo lugar porque el navegador solo elimina una cookie si `path` y
 * los demás atributos coinciden con los que tenía al crearse: si se declararan
 * dos veces, bastaría con tocar uno para que cerrar sesión dejara la cookie
 * puesta sin que nadie lo note.
 *
 * - `httpOnly`: el JavaScript de la página no puede leerla; un XSS no se la lleva.
 * - `sameSite: 'lax'`: no viaja en peticiones que modifican datos iniciadas desde
 *   otro sitio. Es la defensa contra CSRF mientras no exista el chequeo de
 *   `Origin` (queda para `control-acceso`). No puede ser `strict`: la vuelta
 *   desde ClaveÚnica es una navegación entre sitios y perdería la sesión.
 * - `path: '/api'`: el navegador no la manda al pedir los archivos del frontend.
 * - `secure` solo en producción, porque en desarrollo se trabaja sobre http.
 */
export function opcionesCookieSesion(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api',
  };
}
