/**
 * Qué proxies se aceptan como fuente de la IP real del cliente.
 *
 * El rate limiting cuenta por IP. En cPanel la app corre detrás de un proxy
 * local, así que sin esto todas las peticiones parecen venir de 127.0.0.1 y
 * todos los vecinos compartirían un solo contador: uno que abuse bloquearía al
 * resto.
 *
 * Pero confiar en `X-Forwarded-For` a ciegas es peor: cualquiera podría
 * inventarse una IP distinta en cada petición y saltarse el límite. Por eso el
 * valor por defecto es `loopback`: solo se cree la cabecera cuando la conexión
 * llega desde la propia máquina (el proxy de cPanel o el de Vite en local).
 *
 * `TRUST_PROXY` acepta los mismos valores que la opción `trust proxy` de
 * Express (`loopback`, una IP, una subred, o un número de saltos). `false`
 * desactiva la confianza en proxies.
 */
export const TRUST_PROXY_POR_DEFECTO = 'loopback';

export function valorProxyConfiable(
  entorno: string | undefined = process.env.TRUST_PROXY,
): string | number | boolean {
  const valor = entorno?.trim();
  if (!valor) return TRUST_PROXY_POR_DEFECTO;
  if (valor === 'false') return false;
  if (/^\d+$/.test(valor)) return Number(valor);
  return valor;
}

interface AppConProxy {
  set(setting: string, value: unknown): unknown;
}

/** Aplica `trust proxy` a una app de Nest sobre Express. Llamar en main.ts. */
export function configurarProxyConfiable(app: AppConProxy): void {
  app.set('trust proxy', valorProxyConfiable());
}
