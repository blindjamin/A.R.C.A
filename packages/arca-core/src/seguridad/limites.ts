import { Throttle } from '@nestjs/throttler';

/**
 * Límites de consultas (rate limiting) de las APIs de A.R.C.A.
 *
 * Se cuentan por IP de origen y en ventanas de un minuto. Tras un proxy
 * (cPanel/Passenger) la IP real sale de `X-Forwarded-For`, pero solo si
 * `TRUST_PROXY` lo permite: ver `configurarProxyConfiable`.
 *
 * El conteo vive en la memoria del proceso. Con una sola instancia por
 * backend (el despliegue actual) es suficiente; si algún día hay varias
 * instancias, cada una contaría por separado y habría que moverlo a un
 * almacenamiento compartido (Redis).
 */

export const VENTANA_MS = 60_000;

/** Límite general: cualquier ruta, por IP. Holgado para uso normal de la app. */
export const LIMITE_GENERAL = 120;

/**
 * Login con ClaveÚnica. Iniciar o cerrar sesión unas pocas veces por minuto es
 * normal; decenas no. Frena abusos del flujo OAuth (llenar de `state` al
 * servidor, forzar callbacks) sin afectar a un vecino real.
 */
export const LIMITE_LOGIN = 10;

/**
 * Consultas que devuelven una banda de distancia (Marketplace). Consultar un
 * mismo artículo desde muchos puntos permite triangular su ubicación; este
 * límite lo encarece. La defensa de fondo está en la grilla de 250 m y en el
 * límite de orígenes distintos por vecino (apps/backend/src/marketplace/ubicacion).
 */
export const LIMITE_UBICACION = 30;

export const MENSAJE_LIMITE =
  'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';

/** Aplica el límite del login con ClaveÚnica a un controlador o ruta. */
export const LimiteLogin = () =>
  Throttle({ default: { limit: LIMITE_LOGIN, ttl: VENTANA_MS } });

/** Aplica el límite de consultas de ubicación a un controlador o ruta. */
export const LimiteUbicacion = () =>
  Throttle({ default: { limit: LIMITE_UBICACION, ttl: VENTANA_MS } });
