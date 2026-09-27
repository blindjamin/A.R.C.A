import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { ClaveUnicaController } from './clave-unica.controller';
import { ClaveUnicaService } from './clave-unica.service';
import {
  CLAVE_UNICA_BASE_URL,
  OAUTH_STATE_COOKIE,
} from './clave-unica.constants';
import { SesionService } from './sesion.service';

const REDIRECT_URI =
  'https://arca.santodomingo.gob.cl/api/auth/clave-unica/callback';
const CLIENT_ID = 'clientidficticiodeprueba00000000';

/** Respuesta de Express mínima, que registra lo que el controlador le pide. */
function crearRespuestaFalsa() {
  const cookies: Array<{
    nombre: string;
    valor: string;
    opciones?: Record<string, unknown>;
  }> = [];
  const cookiesBorradas: string[] = [];
  const redirecciones: Array<{ estado: number; url: string }> = [];

  const res = {
    cookie(nombre: string, valor: string, opciones?: Record<string, unknown>) {
      cookies.push({ nombre, valor, opciones });
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
  let sesionService: {
    iniciarConClaveUnica: jest.Mock;
    revocar: jest.Mock;
  };

  beforeEach(() => {
    sesionService = {
      iniciarConClaveUnica: jest.fn().mockResolvedValue({
        valorCookie: 'id-sesion.secreto',
        maxAgeMs: 7 * 24 * 60 * 60 * 1000,
      }),
      revocar: jest.fn().mockResolvedValue(undefined),
    };
  });

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
        { provide: SesionService, useValue: sesionService },
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
    /** Petición mínima con la cabecera Cookie, la IP y el user-agent. */
    function peticionCon(cookie?: string): Request {
      return {
        ip: '10.0.0.1',
        headers: {
          'user-agent': 'jest',
          ...(cookie ? { cookie } : {}),
        },
      } as unknown as Request;
    }

    /** Controlador con las dos llamadas a ClaveÚnica simuladas. */
    async function crearControladorConClaveUnicaSimulada(): Promise<ClaveUnicaController> {
      const controlador = await crearControlador();
      const servicio = (
        controlador as unknown as { claveUnicaService: ClaveUnicaService }
      ).claveUnicaService;
      jest.spyOn(servicio, 'intercambiarCodigoPorToken').mockResolvedValue({
        access_token: 'token-ficticio',
        token_type: 'bearer',
        expires_in: 3600,
      });
      jest.spyOn(servicio, 'obtenerInformacionUsuario').mockResolvedValue({
        sub: '1',
        RolUnico: { numero: 11111111, DV: '1', tipo: 'RUN' },
        name: { nombres: ['Ana', 'María'], apellidos: ['Pérez', 'Soto'] },
      });
      return controlador;
    }

    it('con la identidad válida, deja la cookie de sesión y redirige a /', async () => {
      const controlador = await crearControladorConClaveUnicaSimulada();
      const { res, cookies, redirecciones } = crearRespuestaFalsa();

      await controlador.callback(
        peticionCon('cu_oauth_state=aaa'),
        res,
        'codigo',
        'aaa',
      );

      expect(cookies).toHaveLength(1);
      expect(cookies[0].nombre).toBe('arca_sesion');
      expect(cookies[0].valor).toBe('id-sesion.secreto');
      expect(cookies[0].opciones).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        path: '/api',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      expect(redirecciones).toEqual([{ estado: 302, url: '/' }]);
    });

    it('entrega a la sesión el identificador derivado, nunca el RUN', async () => {
      const controlador = await crearControladorConClaveUnicaSimulada();
      const { res } = crearRespuestaFalsa();

      await controlador.callback(
        peticionCon('cu_oauth_state=aaa'),
        res,
        'codigo',
        'aaa',
      );

      expect(sesionService.iniciarConClaveUnica).toHaveBeenCalledTimes(1);
      const [identidad, origen] = sesionService.iniciarConClaveUnica.mock
        .calls[0] as [Record<string, string>, Record<string, string>];
      expect(identidad).toMatchObject({
        nombres: 'Ana María',
        apellidos: 'Pérez Soto',
      });
      expect(identidad.identificador).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(identidad)).not.toContain('11111111-1');
      expect(origen).toEqual({ ip: '10.0.0.1', userAgent: 'jest' });
    });

    it('revoca la sesión que ya traía el navegador antes de crear la nueva', async () => {
      const controlador = await crearControladorConClaveUnicaSimulada();
      const { res } = crearRespuestaFalsa();

      await controlador.callback(
        peticionCon('cu_oauth_state=aaa; arca_sesion=sesion-anterior.secreto'),
        res,
        'codigo',
        'aaa',
      );

      expect(sesionService.revocar).toHaveBeenCalledWith(
        'sesion-anterior.secreto',
      );
      expect(sesionService.revocar.mock.invocationCallOrder[0]).toBeLessThan(
        sesionService.iniciarConClaveUnica.mock.invocationCallOrder[0],
      );
    });

    it('no crea sesión si el state no coincide', async () => {
      const controlador = await crearControladorConClaveUnicaSimulada();
      const { res, cookies } = crearRespuestaFalsa();

      await expect(
        controlador.callback(
          peticionCon('cu_oauth_state=bbb'),
          res,
          'codigo',
          'aaa',
        ),
      ).rejects.toThrow();

      expect(sesionService.iniciarConClaveUnica).not.toHaveBeenCalled();
      expect(cookies).toHaveLength(0);
    });

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

  describe('logout', () => {
    const peticion = (cookie?: string): Request =>
      ({ headers: cookie ? { cookie } : {} }) as unknown as Request;

    it('revoca la sesión de ARCA, borra las cookies y redirige a ClaveÚnica', async () => {
      const controlador = await crearControlador();
      const { res, cookiesBorradas, redirecciones } = crearRespuestaFalsa();

      await controlador.logout(peticion('arca_sesion=id-sesion.secreto'), res);

      expect(sesionService.revocar).toHaveBeenCalledWith('id-sesion.secreto');
      expect(cookiesBorradas).toEqual(
        expect.arrayContaining(['arca_sesion', OAUTH_STATE_COOKIE]),
      );
      expect(redirecciones).toHaveLength(1);
      expect(redirecciones[0].estado).toBe(302);
      expect(redirecciones[0].url).toContain('/api/v1/accounts/app/logout');
    });

    it('sin cookie de sesión igual cierra la de ClaveÚnica', async () => {
      const controlador = await crearControlador();
      const { res, redirecciones } = crearRespuestaFalsa();

      await controlador.logout(peticion(), res);

      expect(sesionService.revocar).toHaveBeenCalledWith(undefined);
      expect(redirecciones).toHaveLength(1);
    });

    it('funciona aunque falte la configuración del login', async () => {
      const controlador = await crearControlador({
        CLAVE_UNICA_CLIENT_ID: undefined,
        CLAVE_UNICA_REDIRECT_URI: undefined,
      });
      const { res, redirecciones } = crearRespuestaFalsa();

      await expect(
        controlador.logout(peticion(), res),
      ).resolves.toBeUndefined();
      expect(redirecciones).toHaveLength(1);
    });
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
