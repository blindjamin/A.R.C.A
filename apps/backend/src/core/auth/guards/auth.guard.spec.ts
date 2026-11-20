import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
    validar = jest.fn().mockResolvedValue(null);
    sesionService = { validar } as unknown as SesionService;
    guard = new AuthGuard(reflector, sesionService);
  });

  afterEach(() => {
    process.env = entornoOriginal;
  });

  it('deja pasar rutas marcadas como @Public() sin consultar la sesión', async () => {
    const context = buildContext({ headers: {} }, true);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(validar).not.toHaveBeenCalled();
  });

  it('con una cookie válida, autentica', async () => {
    validar.mockResolvedValue(USUARIO);
    const request = { headers: { cookie: 'arca_sesion=algo.valido' } };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(validar).toHaveBeenCalledWith('algo.valido');
    expect(request.user).toEqual(USUARIO);
  });

  it('con la cookie con un % mal formado (URIError), la trata como ausente y da 401', async () => {
    const request = { headers: { cookie: 'arca_sesion=%E0%A4%A' } };

    await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(validar).toHaveBeenCalledWith(undefined);
  });

  it.each([
    ['sin ALLOW_DEV_LOGIN', undefined],
    ['con ALLOW_DEV_LOGIN=true', 'true'],
  ])(
    'sin cookie válida, da 401 aunque llegue un Bearer (%s)',
    async (_caso, allowDevLogin) => {
      if (allowDevLogin) process.env.ALLOW_DEV_LOGIN = allowDevLogin;
      const request: Record<string, unknown> = {
        headers: {
          authorization: 'Bearer 00000000-0000-4000-8000-000000000001',
        },
      };

      await expect(guard.canActivate(buildContext(request))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(request.user).toBeUndefined();
    },
  );

  it('sin cookie, da 401 genérico', async () => {
    await expect(
      guard.canActivate(buildContext({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
  });
});
