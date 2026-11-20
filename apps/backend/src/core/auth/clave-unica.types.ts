/**
 * Formas de las respuestas de ClaveÚnica, según el Manual de Integración.
 *
 * Se declaran acá para no tratar como `any` lo que llega de un servicio externo:
 * todo lo que cruza el borde de la aplicación se valida antes de usarse.
 */

/** Respuesta de `POST /openid/token/` (paso 5 del manual). */
export interface RespuestaToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

/** Respuesta de `POST /openid/userinfo/` (paso 6 del manual). */
export interface RespuestaUserInfo {
  /**
   * Requerido por OpenID Connect, pero el manual advierte que **no debe usarse
   * como llave del registro**: el identificador de la persona es el RUN.
   */
  sub: string;
  RolUnico: {
    numero: number;
    DV: string;
    tipo: string;
  };
  name: {
    nombres: string[];
    apellidos: string[];
  };
}

/**
 * Identidad ya normalizada, lista para que la use el resto de la aplicación.
 *
 * `identificador` es la derivación irreversible del RUN (HMAC con pepper): es lo
 * único que se persiste. El RUN en claro **no** forma parte de esta estructura y
 * no debe agregarse: existe solo dentro del callback y muere ahí.
 *
 * Nombres y apellidos son datos de sesión, no de registro — van a
 * `sesiones_ciudadano`, que es volátil.
 */
export interface IdentidadCiudadano {
  identificador: string;
  nombres: string;
  apellidos: string;
}
