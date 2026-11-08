import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../core';
import { BloqueosService } from './bloqueos.service';

/** Corta publicar y contactar a quien tiene un bloqueo vigente (HU-18). */
@Injectable()
export class NoBloqueadoGuard implements CanActivate {
  constructor(private readonly bloqueos: BloqueosService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (user && (await this.bloqueos.vigente(user.ciudadanoId))) {
      throw new ForbiddenException(
        'Tu cuenta está bloqueada en el Marketplace: no puedes publicar ni contactar a otros vecinos.',
      );
    }
    return true;
  }
}
