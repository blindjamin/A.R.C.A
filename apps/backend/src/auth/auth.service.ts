import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { AuthUser } from './interfaces/auth-user.interface';
import { RolAdministrador } from '../users/entities/rol-administrador.enum';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Resuelve la identidad desde el header Authorization.
   *
   * Fase dev (HU-13, pre-JWT): `Bearer <uuid-ciudadano>` con UUID de
   * usuarios_ciudadanos. Cuando Benjamín integre ClaveÚnica/JWT, este método
   * validará el token firmado y seguirá devolviendo AuthUser.
   */
  async resolveFromAuthorizationHeader(
    authorization: string | undefined,
  ): Promise<AuthUser> {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Se requiere autenticación (Authorization: Bearer …)',
      );
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Token Bearer vacío');
    }

    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException(
        'Autenticación JWT no configurada en producción',
      );
    }

    if (!UUID_V4_REGEX.test(token)) {
      throw new UnauthorizedException(
        'Token de desarrollo inválido: se espera UUID de usuario ciudadano',
      );
    }

    return this.resolveCiudadanoId(token);
  }

  async resolveCiudadanoId(ciudadanoId: string): Promise<AuthUser> {
    const perfil = await this.usersService.getPerfilAcceso(ciudadanoId);

    return {
      ciudadanoId: perfil.usuarioCiudadanoId,
      esAdministrador: perfil.esAdministrador,
      administradorId: perfil.administrador?.id ?? null,
      rol: (perfil.administrador?.rol as RolAdministrador | undefined) ?? null,
    };
  }
}
