import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthService } from '../auth.service';
import { COOKIE_SESION, leerCookie } from '../cookies';
import { loginDevHabilitado } from '../login-dev';
import { SesionService } from '../sesion.service';
import { AuthUser } from '../interfaces/auth-user.interface';
import { RolAdministrador } from '../../entities/rol-administrador.enum';

type AuthenticatedRequest = {
  headers: { authorization?: string; cookie?: string };
  user?: AuthUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly sesionService: SesionService,
  ) {}

  /**
   * Fuente de identidad (SPEC-sesion-unica §2.3): primero la cookie
   * `arca_sesion`; el `Bearer <uuid>` es transitorio y solo se acepta con
   * `ALLOW_DEV_LOGIN=true` (se borra en SU-4). Sin ninguna de las dos, 401
   * genérico: no dice cuál de las dos faltó o estaba mal.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const usuario = await this.sesionService.validar(
      leerCookie(request, COOKIE_SESION),
    );
    if (usuario) {
      request.user = usuario;
      return true;
    }

    if (loginDevHabilitado(process.env) && request.headers.authorization) {
      request.user = await this.authService.resolveFromAuthorizationHeader(
        request.headers.authorization,
      );
      return true;
    }

    throw new UnauthorizedException('No autenticado.');
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolAdministrador[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    if (!user.esAdministrador || !user.rol) {
      throw new ForbiddenException(
        'Se requiere perfil de administrador con rol autorizado',
      );
    }

    if (!requiredRoles.includes(user.rol)) {
      throw new ForbiddenException(
        `Rol "${user.rol}" no autorizado para esta operación`,
      );
    }

    return true;
  }
}
