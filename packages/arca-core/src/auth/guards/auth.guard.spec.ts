import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { AuthUser } from '../interfaces/auth-user.interface';
import { AuthGuard, RolesGuard } from './auth.guard';

const ROL_ADMIN = 'admin' as const;
const ROL_OPERADOR = 'operador' as const;

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
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ROL_OPERADOR]);

    const operador: AuthUser = {
      ciudadanoId: '00000000-0000-4000-8000-000000000002',
      esAdministrador: true,
      administradorId: '00000000-0000-4000-8000-0000000000A2',
      rol: ROL_OPERADOR,
    };

    expect(guard.canActivate(buildContext(operador))).toBe(true);
  });
});

describe('AuthGuard', () => {
  it('deja pasar rutas marcadas como @Public()', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const resolveFromAuthorizationHeader = jest.fn();
    const authService = {
      resolveFromAuthorizationHeader,
    } as unknown as AuthService;

    const guard = new AuthGuard(reflector, authService);

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(resolveFromAuthorizationHeader).not.toHaveBeenCalled();
  });
});
