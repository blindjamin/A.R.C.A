import { NotFoundException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SesionController } from './sesion.controller';
import { SesionService } from './sesion.service';
import { RolAdministrador } from '../entities/rol-administrador.enum';
import type { AuthUser } from './interfaces/auth-user.interface';

/** Respuesta de Express mínima, que registra lo que el controlador le pide. */
function crearRespuestaFalsa() {
  const cookies: Array<{
    nombre: string;
    valor: string;
    opciones: Record<string, unknown>;
  }> = [];
  const cookiesBorradas: Array<{
    nombre: string;
    opciones: Record<string, unknown>;
  }> = [];

  const res = {
    cookie(nombre: string, valor: string, opciones: Record<string, unknown>) {
      cookies.push({ nombre, valor, opciones });
      return res;
    },
    clearCookie(nombre: string, opciones: Record<string, unknown>) {
      cookiesBorradas.push({ nombre, opciones });
      return res;
    },
  };

  return { res: res as unknown as Response, cookies, cookiesBorradas };
}

describe('SesionController', () => {
  let sesionService: {
    crear: jest.Mock;
    revocar: jest.Mock;
    duracionMaxima: jest.Mock;
    nombreSesionActiva: jest.Mock;
  };
  let authService: {
    resolveCiudadanoId: jest.Mock;
    resolverNombreAdministrador: jest.Mock;
  };
  let controlador: SesionController;
  let entornoOriginal: NodeJS.ProcessEnv;

  beforeEach(() => {
    entornoOriginal = { ...process.env };
    sesionService = {
      crear: jest.fn().mockResolvedValue('id-sesion.secreto'),
      revocar: jest.fn().mockResolvedValue(undefined),
      duracionMaxima: jest.fn().mockReturnValue(1234),
      nombreSesionActiva: jest.fn().mockResolvedValue(null),
    };
    authService = {
      resolveCiudadanoId: jest.fn(),
      resolverNombreAdministrador: jest.fn().mockResolvedValue(null),
    };
    controlador = new SesionController(
      sesionService as unknown as SesionService,
      authService as unknown as AuthService,
    );
  });

  afterEach(() => {
    process.env = entornoOriginal;
  });

  describe('obtenerSesion', () => {
    it('un vecino (rol null) recibe rol "vecino" y el nombre de su sesión', async () => {
      const usuario: AuthUser = {
        ciudadanoId: 'c1',
        esAdministrador: false,
        administradorId: null,
        rol: null,
      };
      sesionService.nombreSesionActiva.mockResolvedValue('Ana');
      delete process.env.ALLOW_DEV_LOGIN;

      await expect(controlador.obtenerSesion(usuario)).resolves.toEqual({
        ciudadanoId: 'c1',
        nombre: 'Ana',
        rol: 'vecino',
        devLogin: false,
      });
    });

    it('un funcionario recibe su rol y el nombre de usuarios_administradores', async () => {
      process.env.ALLOW_DEV_LOGIN = 'true';
      const usuario: AuthUser = {
        ciudadanoId: 'c2',
        esAdministrador: true,
        administradorId: 'a2',
        rol: RolAdministrador.FUNCIONARIO,
      };
      authService.resolverNombreAdministrador.mockResolvedValue('Camila');

      await expect(controlador.obtenerSesion(usuario)).resolves.toEqual({
        ciudadanoId: 'c2',
        nombre: 'Camila',
        rol: RolAdministrador.FUNCIONARIO,
        devLogin: true,
      });
      expect(authService.resolverNombreAdministrador).toHaveBeenCalledWith(
        'c2',
      );
      expect(sesionService.nombreSesionActiva).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revoca la sesión de la cookie y la borra con HttpOnly/path=/api', async () => {
      const req = {
        headers: { cookie: 'arca_sesion=id-sesion.secreto' },
      } as unknown as Request;
      const { res, cookiesBorradas } = crearRespuestaFalsa();

      await controlador.logout(req, res);

      expect(sesionService.revocar).toHaveBeenCalledWith('id-sesion.secreto');
      expect(cookiesBorradas).toHaveLength(1);
      expect(cookiesBorradas[0].nombre).toBe('arca_sesion');
      expect(cookiesBorradas[0].opciones).toMatchObject({
        httpOnly: true,
        path: '/api',
        sameSite: 'lax',
      });
    });

    it('es idempotente: sin cookie no lanza y revoca con undefined', async () => {
      const req = { headers: {} } as unknown as Request;
      const { res } = crearRespuestaFalsa();

      await expect(controlador.logout(req, res)).resolves.toBeUndefined();
      expect(sesionService.revocar).toHaveBeenCalledWith(undefined);
    });
  });

  describe('loginDev', () => {
    it('da 404 si ALLOW_DEV_LOGIN no está habilitado', async () => {
      delete process.env.ALLOW_DEV_LOGIN;
      const req = { ip: '10.0.0.1', headers: {} } as unknown as Request;
      const { res } = crearRespuestaFalsa();

      await expect(
        controlador.loginDev({ ciudadanoId: 'c1' }, req, res),
      ).rejects.toThrow(NotFoundException);
      expect(sesionService.crear).not.toHaveBeenCalled();
    });

    it('con el flag activo, crea la sesión y deja la cookie con maxAge y HttpOnly', async () => {
      process.env.ALLOW_DEV_LOGIN = 'true';
      const usuario: AuthUser = {
        ciudadanoId: 'c1',
        esAdministrador: true,
        administradorId: 'a1',
        rol: RolAdministrador.FUNCIONARIO,
      };
      authService.resolveCiudadanoId.mockResolvedValue(usuario);
      sesionService.duracionMaxima.mockReturnValue(8 * 60 * 60 * 1000);
      const req = {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as unknown as Request;
      const { res, cookies } = crearRespuestaFalsa();

      await controlador.loginDev({ ciudadanoId: 'c1' }, req, res);

      expect(sesionService.crear).toHaveBeenCalledWith({
        usuarioCiudadanoId: 'c1',
        ip: '10.0.0.1',
        userAgent: 'jest',
      });
      expect(cookies).toHaveLength(1);
      expect(cookies[0].nombre).toBe('arca_sesion');
      expect(cookies[0].valor).toBe('id-sesion.secreto');
      expect(cookies[0].opciones).toMatchObject({
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000,
      });
    });
  });
});
