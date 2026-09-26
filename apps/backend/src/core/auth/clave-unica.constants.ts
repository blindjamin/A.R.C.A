/**
 * Constantes del proveedor de identidad ClaveÚnica.
 *
 * Los endpoints se fijan aquí a propósito y NO se leen del entorno: la certificación
 * exige que todos los endpoints consumidos empiecen con `accounts.claveunica.gob.cl`.
 * El ambiente (sandbox, QA o producción) lo determina el par client_id / client_secret,
 * no la URL.
 *
 * Fuente: Manual de Integración de ClaveÚnica — Secretaría de Gobierno Digital.
 */

export const CLAVE_UNICA_BASE_URL = 'https://accounts.claveunica.gob.cl';

export const CLAVE_UNICA_AUTHORIZE_URL = `${CLAVE_UNICA_BASE_URL}/openid/authorize/`;
export const CLAVE_UNICA_TOKEN_URL = `${CLAVE_UNICA_BASE_URL}/openid/token/`;
export const CLAVE_UNICA_USERINFO_URL = `${CLAVE_UNICA_BASE_URL}/openid/userinfo/`;
export const CLAVE_UNICA_LOGOUT_URL = `${CLAVE_UNICA_BASE_URL}/api/v1/accounts/app/logout`;

/** Scope exigido por la certificación. No modificar. */
export const CLAVE_UNICA_SCOPE = 'openid run name';

/** OpenID Connect Authorization Code Flow: el único `response_type` aceptado. */
export const CLAVE_UNICA_RESPONSE_TYPE = 'code';

/**
 * Nombre de la cookie que transporta el token anti-CSRF (`state`) entre el inicio
 * del flujo y el callback.
 */
export const OAUTH_STATE_COOKIE = 'cu_oauth_state';

/**
 * Acota la cookie a las rutas del flujo de ClaveÚnica: no se envía al resto de la API.
 */
export const OAUTH_STATE_COOKIE_PATH = '/api/auth/clave-unica';

/**
 * Vida del `state`. Cubre lo que la persona demora en autenticarse en ClaveÚnica.
 * El `code` que devuelve ClaveÚnica expira a los 5 minutos, así que un `state` más
 * longevo que esto no aporta nada y solo amplía la ventana de reutilización.
 */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Bytes aleatorios del `state`. El manual pide 30 caracteres o más; 32 bytes en
 * hexadecimal producen 64 caracteres.
 */
export const OAUTH_STATE_BYTES = 32;

/**
 * Corte para las llamadas a ClaveÚnica. El `code` expira a los 5 minutos, así que
 * quedarse esperando indefinidamente no sirve de nada y deja peticiones colgadas.
 */
export const CLAVE_UNICA_TIMEOUT_MS = 10_000;
