import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ClaveUnicaService } from './clave-unica.service';
import {
  CLAVE_UNICA_BASE_URL,
  CLAVE_UNICA_SCOPE,
  OAUTH_STATE_TTL_MS,
} from './clave-unica.constants';

const REDIRECT_URI =
  'https://arca.santodomingo.gob.cl/api/auth/clave-unica/callback';
const CLIENT_ID = 'clientidficticiodeprueba00000000';

/**
 * Cada bloque corresponde a un requisito verificable del Manual de Integración de
 * ClaveÚnica. La idea es que el cumplimiento se demuestre corriendo `npm test`
 * y no revisando el código a ojo.
 */
describe('ClaveUnicaService', () => {
  async function crearServicio(
    variables: Record<string, string | undefined> = {},
  ): Promise<ClaveUnicaService> {
    const entorno: Record<string, string | undefined> = {
      CLAVE_UNICA_CLIENT_ID: CLIENT_ID,
      CLAVE_UNICA_CLIENT_SECRET: 'secretoficticiodeprueba',
      CLAVE_UNICA_REDIRECT_URI: REDIRECT_URI,
      CLAVE_UNICA_PEPPER: 'pepper-de-prueba-no-usar-en-produccion',
      NODE_ENV: 'development',
      ...variables,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaveUnicaService,
        {
          provide: ConfigService,
          useValue: { get: (clave: string) => entorno[clave] },
        },
      ],
    }).compile();

    return module.get<ClaveUnicaService>(ClaveUnicaService);
  }

  describe('state dinámico (requisito de certificación)', () => {
    it('genera al menos 30 caracteres', async () => {
      const servicio = await crearServicio();

      expect(servicio.generarEstado().length).toBeGreaterThanOrEqual(30);
    });

    it('genera un valor distinto en cada llamada', async () => {
      const servicio = await crearServicio();
      const estados = new Set(
        Array.from({ length: 200 }, () => servicio.generarEstado()),
      );

      expect(estados.size).toBe(200);
    });

    it('genera solo caracteres hexadecimales', async () => {
      const servicio = await crearServicio();

      expect(servicio.generarEstado()).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('URL de autorización', () => {
    it('apunta al host oficial de ClaveÚnica', async () => {
      const servicio = await crearServicio();
      const url = new URL(
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      );

      expect(`${url.protocol}//${url.host}`).toBe(CLAVE_UNICA_BASE_URL);
      expect(url.pathname).toBe('/openid/authorize/');
    });

    it('usa exactamente el scope exigido', async () => {
      const servicio = await crearServicio();
      const url = new URL(
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      );

      expect(url.searchParams.get('scope')).toBe(CLAVE_UNICA_SCOPE);
    });

    it('usa el Authorization Code Flow', async () => {
      const servicio = await crearServicio();
      const url = new URL(
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      );

      expect(url.searchParams.get('response_type')).toBe('code');
    });

    it('incluye el client_id configurado y el state recibido', async () => {
      const servicio = await crearServicio();
      const url = new URL(
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      );

      expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
      expect(url.searchParams.get('state')).toBe('estado-de-prueba');
    });

    it('codifica el redirect_uri una sola vez', async () => {
      const servicio = await crearServicio();
      const url = new URL(
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      );

      // Si hubiera doble encoding, al decodificar quedaría "https%3A%2F%2F..."
      expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    });

    it('no filtra el client_secret en la URL', async () => {
      const servicio = await crearServicio({
        CLAVE_UNICA_CLIENT_SECRET: 'secreto-que-no-debe-salir',
      });

      expect(
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      ).not.toContain('secreto-que-no-debe-salir');
    });
  });

  describe('cookie del state', () => {
    it('es HttpOnly, para que ningún script pueda leerla', async () => {
      const servicio = await crearServicio();

      expect(servicio.opcionesCookieEstado().httpOnly).toBe(true);
    });

    it('usa SameSite=Lax, necesario para el retorno desde ClaveÚnica', async () => {
      const servicio = await crearServicio();

      // Con 'strict' el navegador no enviaría la cookie en la navegación de vuelta
      // y el callback no podría validar el state.
      expect(servicio.opcionesCookieEstado().sameSite).toBe('lax');
    });

    it('exige HTTPS en producción', async () => {
      const desarrollo = await crearServicio();
      const produccion = await crearServicio({ NODE_ENV: 'production' });

      expect(desarrollo.opcionesCookieEstado().secure).toBe(false);
      expect(produccion.opcionesCookieEstado().secure).toBe(true);
    });

    it('expira junto con el flujo', async () => {
      const servicio = await crearServicio();

      expect(servicio.opcionesCookieEstado().maxAge).toBe(OAUTH_STATE_TTL_MS);
    });
  });

  describe('validación del state (paso 3 del manual)', () => {
    it('acepta cuando el state recibido coincide con el guardado', async () => {
      const servicio = await crearServicio();
      const estado = servicio.generarEstado();

      expect(servicio.validarEstado(estado, estado)).toBe(true);
    });

    it('rechaza cuando no coinciden', async () => {
      const servicio = await crearServicio();

      expect(
        servicio.validarEstado(
          servicio.generarEstado(),
          servicio.generarEstado(),
        ),
      ).toBe(false);
    });

    it('rechaza si falta cualquiera de los dos', async () => {
      const servicio = await crearServicio();
      const estado = servicio.generarEstado();

      expect(servicio.validarEstado(undefined, estado)).toBe(false);
      expect(servicio.validarEstado(estado, undefined)).toBe(false);
      expect(servicio.validarEstado(undefined, undefined)).toBe(false);
      expect(servicio.validarEstado('', '')).toBe(false);
    });

    it('rechaza un prefijo del valor correcto', async () => {
      const servicio = await crearServicio();
      const estado = servicio.generarEstado();

      expect(servicio.validarEstado(estado.slice(0, -1), estado)).toBe(false);
    });
  });

  describe('identidad derivada del RUN', () => {
    const userInfo = {
      sub: '1234567',
      RolUnico: { numero: 12345678, DV: '9', tipo: 'RUN' },
      name: {
        nombres: ['María', 'Carmen'],
        apellidos: ['Del Río', 'Gonzalez'],
      },
    };

    it('no deja el RUN en la identidad normalizada', async () => {
      const servicio = await crearServicio();
      const identidad = servicio.normalizarIdentidad(userInfo);

      const serializada = JSON.stringify(identidad);
      expect(serializada).not.toContain('12345678');
      expect(serializada).not.toContain('12345678-9');
      expect(Object.keys(identidad).sort()).toEqual([
        'apellidos',
        'identificador',
        'nombres',
      ]);
    });

    it('produce el mismo identificador para el mismo RUN', async () => {
      const servicio = await crearServicio();

      expect(servicio.derivarIdentificador('12345678-9')).toBe(
        servicio.derivarIdentificador('12345678-9'),
      );
    });

    it('produce identificadores distintos para RUN distintos', async () => {
      const servicio = await crearServicio();

      expect(servicio.derivarIdentificador('12345678-9')).not.toBe(
        servicio.derivarIdentificador('12345678-K'),
      );
    });

    it('cambia por completo si cambia el pepper', async () => {
      // Es la propiedad que hace inútil un volcado de la base sin el pepper.
      const uno = await crearServicio({ CLAVE_UNICA_PEPPER: 'pepper-uno' });
      const otro = await crearServicio({ CLAVE_UNICA_PEPPER: 'pepper-dos' });

      expect(uno.derivarIdentificador('12345678-9')).not.toBe(
        otro.derivarIdentificador('12345678-9'),
      );
    });

    it('conserva nombres y apellidos como datos de sesión', async () => {
      const servicio = await crearServicio();
      const identidad = servicio.normalizarIdentidad(userInfo);

      expect(identidad.nombres).toBe('María Carmen');
      expect(identidad.apellidos).toBe('Del Río Gonzalez');
    });

    it('falla si no hay pepper configurado', async () => {
      const servicio = await crearServicio({ CLAVE_UNICA_PEPPER: undefined });

      expect(() => servicio.derivarIdentificador('12345678-9')).toThrow();
    });
  });

  describe('cierre de sesión (requisito de certificación)', () => {
    it('apunta al endpoint oficial de logout', async () => {
      const servicio = await crearServicio();
      const url = new URL(servicio.construirUrlCierreSesion());

      expect(`${url.protocol}//${url.host}`).toBe(CLAVE_UNICA_BASE_URL);
      expect(url.pathname).toBe('/api/v1/accounts/app/logout');
    });

    it('incluye el retorno configurado, codificado', async () => {
      const destino = 'https://arca.santodomingo.gob.cl/login';
      const servicio = await crearServicio({
        CLAVE_UNICA_LOGOUT_REDIRECT_URI: destino,
      });
      const url = new URL(servicio.construirUrlCierreSesion());

      expect(url.searchParams.get('redirect')).toBe(destino);
    });

    it('cierra sesión igual aunque no haya retorno configurado', async () => {
      // Falla abierto a propósito: dejar a alguien sin poder salir es peor que
      // cerrarle la sesión sin devolverlo al sitio.
      const servicio = await crearServicio({
        CLAVE_UNICA_LOGOUT_REDIRECT_URI: undefined,
      });

      expect(() => servicio.construirUrlCierreSesion()).not.toThrow();
      expect(servicio.construirUrlCierreSesion()).not.toContain('redirect=');
    });

    it('no necesita client_id ni redirect_uri para cerrar sesión', async () => {
      const servicio = await crearServicio({
        CLAVE_UNICA_CLIENT_ID: undefined,
        CLAVE_UNICA_REDIRECT_URI: undefined,
      });

      expect(() => servicio.construirUrlCierreSesion()).not.toThrow();
    });

    it('borra la cookie con los mismos atributos con que se creó', async () => {
      const servicio = await crearServicio();
      const creacion = servicio.opcionesCookieEstado();
      const borrado = servicio.opcionesBorradoCookieEstado();

      // El navegador solo elimina la cookie si path y flags coinciden.
      expect(borrado.path).toBe(creacion.path);
      expect(borrado.httpOnly).toBe(creacion.httpOnly);
      expect(borrado.sameSite).toBe(creacion.sameSite);
      expect(borrado.secure).toBe(creacion.secure);
      expect(borrado.maxAge).toBeUndefined();
    });
  });

  describe('configuración', () => {
    // Se prueba a través de `construirUrlAutorizacion`, que es donde se leen las
    // variables de entorno: cada getter lanza si la suya no está definida.
    it('falla si no hay client_id', async () => {
      const servicio = await crearServicio({
        CLAVE_UNICA_CLIENT_ID: undefined,
      });

      expect(() =>
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      ).toThrow();
    });

    it('falla si no hay redirect_uri', async () => {
      const servicio = await crearServicio({
        CLAVE_UNICA_REDIRECT_URI: undefined,
      });

      expect(() =>
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      ).toThrow();
    });

    it('rechaza localhost como redirect_uri en producción', async () => {
      const servicio = await crearServicio({
        NODE_ENV: 'production',
        CLAVE_UNICA_REDIRECT_URI:
          'https://localhost:3000/api/auth/clave-unica/callback',
      });

      expect(() =>
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      ).toThrow(/localhost/i);
    });

    it('rechaza HTTP sin cifrar como redirect_uri en producción', async () => {
      const servicio = await crearServicio({
        NODE_ENV: 'production',
        CLAVE_UNICA_REDIRECT_URI: 'http://arca.santodomingo.gob.cl/callback',
      });

      expect(() =>
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      ).toThrow(/HTTPS/i);
    });

    it('acepta localhost en desarrollo, para poder trabajar sin el túnel', async () => {
      const servicio = await crearServicio({
        CLAVE_UNICA_REDIRECT_URI:
          'http://localhost:3000/api/auth/clave-unica/callback',
      });

      expect(() =>
        servicio.construirUrlAutorizacion('estado-de-prueba'),
      ).not.toThrow();
    });
  });
});
