import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions } from 'express';
import {
  CLAVE_UNICA_AUTHORIZE_URL,
  CLAVE_UNICA_LOGOUT_URL,
  CLAVE_UNICA_RESPONSE_TYPE,
  CLAVE_UNICA_SCOPE,
  CLAVE_UNICA_TIMEOUT_MS,
  CLAVE_UNICA_TOKEN_URL,
  CLAVE_UNICA_USERINFO_URL,
  OAUTH_STATE_BYTES,
  OAUTH_STATE_COOKIE_PATH,
  OAUTH_STATE_TTL_MS,
} from './clave-unica.constants';
import type {
  IdentidadCiudadano,
  RespuestaToken,
  RespuestaUserInfo,
} from './clave-unica.types';

/**
 * Paso 1 y 2 del flujo OpenID Connect de ClaveÚnica: generar el token anti-CSRF
 * y componer la URL de autorización.
 *
 * El intercambio de `code` por `access_token` y la consulta a `userinfo` viven en
 * el callback, que todavía no está implementado porque requiere las credenciales
 * entregadas por la Secretaría de Gobierno Digital.
 */
@Injectable()
export class ClaveUnicaService {
  private readonly logger = new Logger(ClaveUnicaService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Token único de sesión que enlaza el inicio del flujo con el callback.
   *
   * Se usa `randomBytes` (CSPRNG del sistema operativo) y no `Math.random`, que es
   * predecible y no sirve como defensa contra CSRF. El manual pide 30 caracteres o
   * más; 32 bytes en hexadecimal entregan 64.
   */
  generarEstado(): string {
    return randomBytes(OAUTH_STATE_BYTES).toString('hex');
  }

  /**
   * Compone la URL de `authorize` con los parámetros que exige la certificación.
   *
   * `URLSearchParams` codifica cada valor una sola vez. Codificar el `redirect_uri`
   * a mano antes de pasarlo por acá produciría un doble encoding y ClaveÚnica
   * rechazaría la petición.
   */
  construirUrlAutorizacion(estado: string): string {
    const parametros = new URLSearchParams({
      client_id: this.clientId,
      response_type: CLAVE_UNICA_RESPONSE_TYPE,
      scope: CLAVE_UNICA_SCOPE,
      redirect_uri: this.redirectUri,
      state: estado,
    });

    return `${CLAVE_UNICA_AUTHORIZE_URL}?${parametros.toString()}`;
  }

  /**
   * Opciones de la cookie que guarda el `state` hasta que vuelva el callback.
   *
   * - `httpOnly`: ningún script de la página puede leerla.
   * - `sameSite: 'lax'`: obligatorio. ClaveÚnica devuelve a la persona mediante una
   *   navegación de nivel superior desde otro sitio; con `strict` el navegador no
   *   enviaría la cookie y el callback nunca podría validar el `state`.
   * - `secure`: activo fuera de desarrollo. En producción ClaveÚnica exige HTTPS.
   * - `path`: acota la cookie al flujo de ClaveÚnica.
   */
  opcionesCookieEstado(): CookieOptions {
    return { ...this.atributosCookieEstado, maxAge: OAUTH_STATE_TTL_MS };
  }

  /**
   * Atributos que comparten la creación y el borrado de la cookie.
   *
   * Viven en un solo lugar porque el navegador solo elimina una cookie si `path` y
   * los demás atributos coinciden con los que tenía al crearse. Si se declararan
   * dos veces, bastaría con tocar uno para que el borrado dejara de funcionar
   * en silencio.
   */
  private get atributosCookieEstado(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.esProduccion,
      path: OAUTH_STATE_COOKIE_PATH,
    };
  }

  /**
   * Paso 3 del manual: confirmar el token anti-falsificación.
   *
   * Es el paso que el `AuthController` de Atención Vecino se saltó: allá el
   * `state` se genera, se envía y nunca se compara, así que no protege de nada.
   *
   * La comparación es de tiempo constante para no filtrar, por la duración de la
   * respuesta, cuántos caracteres iniciales acertó quien esté probando valores.
   */
  validarEstado(
    estadoRecibido: string | undefined,
    estadoEsperado: string | undefined,
  ): boolean {
    if (!estadoRecibido || !estadoEsperado) return false;

    const recibido = Buffer.from(estadoRecibido, 'utf8');
    const esperado = Buffer.from(estadoEsperado, 'utf8');

    // `timingSafeEqual` exige longitudes iguales; distinta longitud ya es un no.
    if (recibido.length !== esperado.length) return false;

    return timingSafeEqual(recibido, esperado);
  }

  /**
   * Paso 4 del manual: cambiar el código de autorización por el token de acceso.
   *
   * Ocurre en el servidor, no en el navegador: es donde vive el `client_secret` y
   * la certificación pide evidencia de que la llamada sale desde el backend.
   */
  async intercambiarCodigoPorToken(
    codigo: string,
    estado: string,
  ): Promise<RespuestaToken> {
    const cuerpo = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
      code: codigo,
      state: estado,
    });

    const respuesta = await this.llamar(CLAVE_UNICA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: cuerpo.toString(),
    });

    const datos = (await respuesta.json()) as Partial<RespuestaToken>;

    if (!datos?.access_token) {
      // Nunca registrar el cuerpo completo: puede traer detalles del intercambio.
      this.logger.error('ClaveÚnica no devolvió access_token.');
      throw new UnauthorizedException('No se pudo completar la autenticación.');
    }

    return datos as RespuestaToken;
  }

  /**
   * Paso 6 del manual: obtener la identidad con el token de acceso.
   *
   * El manual especifica POST con el token en la cabecera `Authorization`.
   */
  async obtenerInformacionUsuario(
    accessToken: string,
  ): Promise<RespuestaUserInfo> {
    const respuesta = await this.llamar(CLAVE_UNICA_USERINFO_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const datos = (await respuesta.json()) as Partial<RespuestaUserInfo>;

    if (
      typeof datos?.RolUnico?.numero !== 'number' ||
      typeof datos?.RolUnico?.DV !== 'string'
    ) {
      this.logger.error('La respuesta de userinfo no trae un RolUnico válido.');
      throw new UnauthorizedException('No se pudo completar la autenticación.');
    }

    return datos as RespuestaUserInfo;
  }

  /**
   * Convierte la respuesta de ClaveÚnica en la identidad que usa la aplicación.
   *
   * **El RUN entra pero no sale.** Se deriva el identificador y el RUN en claro se
   * descarta: no se persiste, no se registra en logs y no viaja en la respuesta.
   */
  normalizarIdentidad(userInfo: RespuestaUserInfo): IdentidadCiudadano {
    const run = `${userInfo.RolUnico.numero}-${userInfo.RolUnico.DV.toUpperCase()}`;

    return {
      identificador: this.derivarIdentificador(run),
      nombres: userInfo.name?.nombres?.join(' ') ?? '',
      apellidos: userInfo.name?.apellidos?.join(' ') ?? '',
    };
  }

  /**
   * Deriva el identificador estable que se guarda en `usuarios_ciudadanos`.
   *
   * Se usa HMAC-SHA256 con un *pepper* secreto, no un hash a secas. En Chile hay
   * del orden de 30 millones de RUN válidos: un SHA-256 pelado se revierte
   * construyendo el diccionario completo en segundos. El pepper vive solo en las
   * variables de entorno y nunca en la base, así que quien obtenga un volcado de
   * la base no puede armar ese diccionario.
   *
   * Esto es **seudonimización, no anonimización**: sigue siendo dato personal para
   * la Ley 21.719, porque con el pepper es reversible.
   *
   * ⚠️ El formato canónico del RUN (`numero-DV`, DV en mayúscula) y el pepper son
   * parte del contrato: si cualquiera de los dos cambia, **todas las personas
   * registradas dejan de ser reconocidas** y pierden su historial.
   */
  derivarIdentificador(run: string): string {
    return createHmac('sha256', this.pepper).update(run, 'utf8').digest('hex');
  }

  /** Llamada HTTP a ClaveÚnica con corte de tiempo y error uniforme. */
  private async llamar(url: string, init: RequestInit): Promise<Response> {
    let respuesta: Response;

    try {
      respuesta = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(CLAVE_UNICA_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo contactar a ClaveÚnica (${url}): ${(error as Error).name}`,
      );
      throw new ServiceUnavailableException('ClaveÚnica no está respondiendo.');
    }

    if (!respuesta.ok) {
      // Solo el código de estado: el cuerpo puede traer datos del intercambio.
      this.logger.error(`ClaveÚnica respondió ${respuesta.status} en ${url}.`);
      throw new UnauthorizedException('No se pudo completar la autenticación.');
    }

    return respuesta;
  }

  /**
   * Paso 7 del manual: cierre de sesión.
   *
   * ClaveÚnica mantiene su propia sesión, así que limpiar la de ARCA no alcanza —
   * hay que avisarle. El parámetro `redirect` es opcional y debe estar registrado
   * en CeroFilas como Logout URI; si no lo está, ClaveÚnica cierra la sesión pero
   * no devuelve a la persona.
   *
   * A diferencia del login, esto **no falla si falta configuración**: dejar a
   * alguien sin poder cerrar sesión es peor que cerrarla sin volver al sitio.
   */
  construirUrlCierreSesion(): string {
    const destino = this.configService
      .get<string>('CLAVE_UNICA_LOGOUT_REDIRECT_URI')
      ?.trim();

    if (!destino) {
      this.logger.warn(
        'CLAVE_UNICA_LOGOUT_REDIRECT_URI no está definida: se cerrará la sesión ' +
          'en ClaveÚnica sin retorno al sitio.',
      );
      return CLAVE_UNICA_LOGOUT_URL;
    }

    return `${CLAVE_UNICA_LOGOUT_URL}?redirect=${encodeURIComponent(destino)}`;
  }

  /**
   * Opciones para borrar la cookie del `state`.
   *
   * El navegador solo elimina una cookie si `path` y los demás atributos coinciden
   * con los que tenía al crearse; por eso se reutilizan los mismos.
   */
  opcionesBorradoCookieEstado(): CookieOptions {
    return this.atributosCookieEstado;
  }

  private get clientId(): string {
    return this.leerVariableObligatoria('CLAVE_UNICA_CLIENT_ID');
  }

  /** Secreto de la integración. Nunca sale del backend ni se registra en logs. */
  private get clientSecret(): string {
    return this.leerVariableObligatoria('CLAVE_UNICA_CLIENT_SECRET');
  }

  /**
   * Clave secreta con la que se deriva el identificador a partir del RUN.
   *
   * Vive solo en el entorno: si estuviera en la base, quien obtuviera un volcado
   * podría reconstruir los RUN de todas las personas registradas.
   */
  private get pepper(): string {
    return this.leerVariableObligatoria('CLAVE_UNICA_PEPPER');
  }

  /**
   * El `redirect_uri` debe coincidir exactamente con el registrado en CeroFilas.
   *
   * El manual prohíbe `localhost` — para desarrollo hay que exponer el backend con
   * un dominio público (por ejemplo el túnel fijo de ngrok) y registrar esa URI.
   */
  private get redirectUri(): string {
    const valor = this.leerVariableObligatoria('CLAVE_UNICA_REDIRECT_URI');

    if (this.esProduccion) {
      if (!valor.startsWith('https://')) {
        throw new InternalServerErrorException(
          'CLAVE_UNICA_REDIRECT_URI debe usar HTTPS en producción.',
        );
      }

      if (/^https:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(valor)) {
        throw new InternalServerErrorException(
          'ClaveÚnica no permite localhost como redirect_uri.',
        );
      }
    }

    return valor;
  }

  private get esProduccion(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private leerVariableObligatoria(nombre: string): string {
    const valor = this.configService.get<string>(nombre)?.trim();

    if (!valor) {
      this.logger.error(`Falta la variable de entorno ${nombre}.`);
      throw new InternalServerErrorException(
        'La integración con ClaveÚnica no está configurada.',
      );
    }

    return valor;
  }
}
