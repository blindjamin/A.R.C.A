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
import { AuthUser } from '../interfaces/auth-user.interface';
import { RolAdministrador } from '../../users/entities/rol-administrador.enum';

type AuthenticatedRequest = {
  headers: { authorization?: string };
  user?: AuthUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.authService.resolveFromAuthorizationHeader(
      request.headers.authorization,
    );

    return true;
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
