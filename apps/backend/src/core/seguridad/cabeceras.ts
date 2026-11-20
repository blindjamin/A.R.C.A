import type { NextFunction, Request, Response } from 'express';

/**
 * Cabeceras de seguridad de la API. La API solo responde JSON, imágenes y
 * redirecciones, así que puede ser estricta: no se deja cargar dentro de otro
 * sitio, el navegador no adivina tipos de archivo y no se filtra la URL al
 * seguir un enlace. El frontend son archivos estáticos que sirve el servidor
 * web; sus cabeceras van en su configuración, no aquí.
 *
 * HSTS solo en producción: obliga al navegador a usar HTTPS por un año, y en
 * local (http://localhost) dejaría al navegador exigiendo HTTPS donde no lo hay.
 */
export function cabecerasDeSeguridad(
  produccion: boolean = process.env.NODE_ENV === 'production',
) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (produccion) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    }
    next();
  };
}
