import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { ClaveUnicaController } from './clave-unica.controller';
import { ClaveUnicaService } from './clave-unica.service';
import {
  CLAVE_UNICA_BASE_URL,
  OAUTH_STATE_COOKIE,
} from './clave-unica.constants';

const REDIRECT_URI =
  'https://arca.santodomingo.gob.cl/api/auth/clave-unica/callback';
const CLIENT_ID = 'clientidficticiodeprueba00000000';

/** Respuesta de Express mínima, que registra lo que el controlador le pide. */
function crearRespuestaFalsa() {
  const cookies: Array<{ nombre: string; valor: string }> = [];
  const cookiesBorradas: string[] = [];
  const redirecciones: Array<{ estado: number; url: string }> = [];

  const res = {
    cookie(nombre: string, valor: string) {
      cookies.push({ nombre, valor });
      return res;
    },
    clearCookie(nombre: string) {
      cookiesBorradas.push(nombre);
      return res;
    },
    redirect(estado: number, url: string) {
      redirecciones.push({ estado, url });
    },
  };

  return {
    res: res as unknown as Response,
    cookies,
    cookiesBorradas,
    redirecciones,
  };
}

describe('ClaveUnicaController', () => {
  async function crearControlador(
    variables: Record<string, string | undefined> = {},
  ): Promise<ClaveUnicaController> {
    const entorno: Record<string, string | undefined> = {
      CLAVE_UNICA_CLIENT_ID: CLIENT_ID,
      CLAVE_UNICA_CLIENT_SECRET: 'secretoficticiodeprueba',
      CLAVE_UNICA_REDIRECT_URI: REDIRECT_URI,
      CLAVE_UNICA_PEPPER: 'pepper-de-prueba-no-usar-en-produccion',
      NODE_ENV: 'development',
      ...variables,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClaveUnicaController],
      providers: [
        ClaveUnicaService,
        {
          provide: ConfigService,
          useValue: { get: (clave: string) => entorno[clave] },
        },
      ],
    }).compile();

    return module.get<ClaveUnicaController>(ClaveUnicaController);
  }

  it('redirige a ClaveÚnica con un 302', async () => {
    const controlador = await crearControlador();
    const { res, redirecciones } = crearRespuestaFalsa();

    controlador.login(res);

    expect(redirecciones).toHaveLength(1);
    expect(redirecciones[0].estado).toBe(302);
    expect(redirecciones[0].url.startsWith(CLAVE_UNICA_BASE_URL)).toBe(true);
  });

  it('deja el state en la cookie y el mismo valor en la URL', async () => {
    const controlador = await crearControlador();
    const { res, cookies, redirecciones } = crearRespuestaFalsa();

    controlador.login(res);

    expect(cookies).toHaveLength(1);
    expect(cookies[0].nombre).toBe(OAUTH_STATE_COOKIE);

    const enLaUrl = new URL(redirecciones[0].url).searchParams.get('state');
    expect(enLaUrl).toBe(cookies[0].valor);
  });

  it('usa un state distinto en cada visita', async () => {
    const controlador = await crearControlador();
    const primera = crearRespuestaFalsa();
    const segunda = crearRespuestaFalsa();

    controlador.login(primera.res);
    controlador.login(segunda.res);

    expect(primera.cookies[0].valor).not.toBe(segunda.cookies[0].valor);
  });

  describe('callback', () => {
    /** Petición mínima que solo transporta la cabecera Cookie. */
    function peticionCon(cookie?: string): Request {
      return {
        headers: cookie ? { cookie } : {},
      } as unknown as Request;
    }

    it('rechaza si el state no coincide con la cookie', async () => {
      const controlador = await crearControlador();
      const { res } = crearRespuestaFalsa();

      await expect(
        controlador.callback(
          peticionCon('cu_oauth_state=bbb'),
          res,
          'codigo',
          'aaa',
        ),
      ).rejects.toThrow();
    });

    it('rechaza si no llega ninguna cookie', async () => {
      const controlador = await crearControlador();
      const { res } = crearRespuestaFalsa();

      await expect(
        controlador.callback(peticionCon(), res, 'codigo', 'aaa'),
      ).rejects.toThrow();
    });

    it('rechaza si ClaveÚnica devuelve un error', async () => {
      const controlador = await crearControlador();
      const { res } = crearRespuestaFalsa();

      await expect(
        controlador.callback(
          peticionCon('cu_oauth_state=aaa'),
          res,
          undefined,
          'aaa',
          'access_denied',
        ),
      ).rejects.toThrow();
    });

    it('borra la cookie del state aunque el intento se rechace', async () => {
      // El state es de un solo uso: si sobreviviera a un intento fallido, el
      // mismo valor serviría para reintentar.
      const controlador = await crearControlador();
      const { res, cookiesBorradas } = crearRespuestaFalsa();

      await expect(
        controlador.callback(
          peticionCon('cu_oauth_state=bbb'),
          res,
          'codigo',
          'aaa',
        ),
      ).rejects.toThrow();

      expect(cookiesBorradas).toContain(OAUTH_STATE_COOKIE);
    });
  });

  it('el logout borra la cookie del state y redirige a ClaveÚnica', async () => {
    const controlador = await crearControlador();
    const { res, cookiesBorradas, redirecciones } = crearRespuestaFalsa();

    controlador.logout(res);

    expect(cookiesBorradas).toContain(OAUTH_STATE_COOKIE);
    expect(redirecciones).toHaveLength(1);
    expect(redirecciones[0].estado).toBe(302);
    expect(redirecciones[0].url).toContain('/api/v1/accounts/app/logout');
  });

  it('el logout funciona aunque falte la configuración del login', async () => {
    const controlador = await crearControlador({
      CLAVE_UNICA_CLIENT_ID: undefined,
      CLAVE_UNICA_REDIRECT_URI: undefined,
    });
    const { res, redirecciones } = crearRespuestaFalsa();

    expect(() => controlador.logout(res)).not.toThrow();
    expect(redirecciones).toHaveLength(1);
  });

  it('no deja cookie ni redirige si la configuración está incompleta', async () => {
    // Regresión: la cookie se escribía antes de componer la URL, así que un fallo
    // de configuración plantaba en el navegador un state que nunca se envió.
    const controlador = await crearControlador({
      CLAVE_UNICA_CLIENT_ID: undefined,
    });
    const { res, cookies, redirecciones } = crearRespuestaFalsa();

    expect(() => controlador.login(res)).toThrow();
    expect(cookies).toHaveLength(0);
    expect(redirecciones).toHaveLength(0);
  });
});
