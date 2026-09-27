import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { SesionService } from '../sesion.service';
import { AuthUser } from '../interfaces/auth-user.interface';
import { AuthGuard, RolesGuard } from './auth.guard';

const ROL_ADMIN = 'admin' as const;
const ROL_FUNCIONARIO = 'funcionario' as const;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const buildContext = (user?: AuthUser): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  it('permite acceso si no hay roles requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('deniega si el usuario no es administrador', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ROL_ADMIN]);

    const ciudadano: AuthUser = {
      ciudadanoId: '00000000-0000-4000-8000-000000000001',
      esAdministrador: false,
      administradorId: null,
      rol: null,
    };

    expect(() => guard.canActivate(buildContext(ciudadano))).toThrow(
      ForbiddenException,
    );
  });

  it('permite si el rol coincide', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([ROL_FUNCIONARIO]);

    const funcionario: AuthUser = {
      ciudadanoId: '00000000-0000-4000-8000-000000000002',
      esAdministrador: true,
      administradorId: '00000000-0000-4000-8000-0000000000A2',
      rol: ROL_FUNCIONARIO,
    };

    expect(guard.canActivate(buildContext(funcionario))).toBe(true);
  });
});

describe('AuthGuard', () => {
  const USUARIO: AuthUser = {
    ciudadanoId: '00000000-0000-4000-8000-000000000001',
    esAdministrador: false,
    administradorId: null,
    rol: null,
  };

  let reflector: Reflector;
  let resolveFromAuthorizationHeader: jest.Mock;
  let authService: AuthService;
  let validar: jest.Mock;
  let sesionService: SesionService;
  let guard: AuthGuard;
  let entornoOriginal: NodeJS.ProcessEnv;

  const buildContext = (
    request: Record<string, unknown>,
    isPublic = false,
  ): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(() => {
    entornoOriginal = { ...process.env };
    delete process.env.ALLOW_DEV_LOGIN;

    reflector = new Reflector();
    resolveFromAuthorizationHeader = jest.fn();
    authService = { resolveFromAuthorizationHeader } as unknown as AuthService;
    validar = jest.fn().mockResolvedValue(null);
    sesionService = { validar } as unknown as SesionService;
    guard = new AuthGuard(reflector, authService, sesionService);
  });

  afterEach(() => {
    process.env = entornoOriginal;
  });

  it('deja pasar rutas marcadas como @Public() sin consultar la sesión', async () => {
    const context = buildContext({ headers: {} }, true);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validar).not.toHaveBeenCalled();
    expect(resolveFromAuthorizationHeader).not.toHaveBeenCalled();
  });

  it('con una cookie válida, autentica y no mira el Bearer', async () => {
    validar.mockResolvedValue(USUARIO);
    const request = { headers: { cookie: 'arca_sesion=algo.valido' } };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(validar).toHaveBeenCalledWith('algo.valido');
    expect(request.user).toEqual(USUARIO);
    expect(resolveFromAuthorizationHeader).not.toHaveBeenCalled();
  });

  it('con la cookie con un % mal formado (URIError), la trata como ausente y da 401', async () => {
    const request = { headers: { cookie: 'arca_sesion=%E0%A4%A' } };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(validar).toHaveBeenCalledWith(undefined);
  });

  it('sin cookie válida y sin ALLOW_DEV_LOGIN, da 401 aunque llegue un Bearer', async () => {
    const request = {
      headers: { authorization: 'Bearer 00000000-0000-4000-8000-000000000001' },
    };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(resolveFromAuthorizationHeader).not.toHaveBeenCalled();
  });

  it('sin cookie válida y con ALLOW_DEV_LOGIN=true, acepta el Bearer', async () => {
    process.env.ALLOW_DEV_LOGIN = 'true';
    resolveFromAuthorizationHeader.mockResolvedValue(USUARIO);
    const request = {
      headers: { authorization: 'Bearer 00000000-0000-4000-8000-000000000001' },
    };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(resolveFromAuthorizationHeader).toHaveBeenCalledWith(
      'Bearer 00000000-0000-4000-8000-000000000001',
    );
    expect(request.user).toEqual(USUARIO);
  });

  it('sin cookie ni Bearer, da 401 genérico sin llamar al Bearer', async () => {
    process.env.ALLOW_DEV_LOGIN = 'true';
    const request = { headers: {} };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(resolveFromAuthorizationHeader).not.toHaveBeenCalled();
  });
});
