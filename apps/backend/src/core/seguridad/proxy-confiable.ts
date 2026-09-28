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

type FuncionConfianza = (
  direccion: string | undefined,
  salto: number,
) => boolean;

/** Lo mínimo de una app de Express que se necesita para configurar el proxy. */
interface AppExpress {
  set(setting: string, value: unknown): unknown;
  get(setting: string): unknown;
}

/** Una app de Nest sobre Express (expone la de Express con getHttpAdapter). */
interface AppNest {
  getHttpAdapter(): { getInstance(): AppExpress };
}

type AppConProxy = AppNest | AppExpress;

// En una app de Nest, `get()` busca en el contenedor de dependencias, no en los
// ajustes de Express: hay que llegar a la instancia de Express que hay debajo.
const instanciaExpress = (app: AppConProxy): AppExpress =>
  'getHttpAdapter' in app ? app.getHttpAdapter().getInstance() : app;

/**
 * Envuelve la regla de confianza para aceptar también las conexiones por
 * socket local (unix en Linux, named pipe en Windows).
 *
 * En cPanel, Passenger no conecta con la app por la red: usa un socket unix.
 * En esa conexión no hay dirección de origen (`remoteAddress` indefinido), la
 * regla `loopback` no la reconoce, Express descarta `X-Forwarded-For` y
 * `req.ip` queda vacío para todos. El rate limiting usa `req.ip` como clave,
 * así que todos los vecinos compartirían un solo contador y bastaría un poco de
 * tráfico para bloquear a todo el mundo.
 *
 * Confiar en el socket local no abre nada: solo un proceso de la misma máquina
 * puede conectarse a él, igual que a 127.0.0.1.
 */
export function confiarEnSocketLocal(
  regla: FuncionConfianza,
): FuncionConfianza {
  return (direccion, salto) =>
    direccion === undefined || direccion === ''
      ? true
      : regla(direccion, salto);
}

/** Aplica `trust proxy` a una app de Nest sobre Express. Llamar en main.ts. */
export function configurarProxyConfiable(
  app: AppConProxy,
  valor: string | number | boolean = valorProxyConfiable(),
): void {
  const express = instanciaExpress(app);
  express.set('trust proxy', valor);
  // Con `false` no se confía en ningún proxy, tampoco en el socket local.
  if (valor === false) return;

  // Express compila el valor en 'trust proxy fn'; se reemplaza por la versión
  // que además acepta el socket local.
  const regla = express.get('trust proxy fn') as FuncionConfianza;
  express.set('trust proxy fn', confiarEnSocketLocal(regla));
}
