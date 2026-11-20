import { Inject, Injectable } from '@nestjs/common';
import { AuthUser } from './interfaces/auth-user.interface';
import {
  PERFIL_ACCESO_RESOLVER,
  type PerfilAccesoResolver,
} from './interfaces/perfil-acceso-resolver.interface';
import { RolAdministrador } from '../entities/rol-administrador.enum';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PERFIL_ACCESO_RESOLVER)
    private readonly perfilAccesoResolver: PerfilAccesoResolver,
  ) {}

  async resolveCiudadanoId(ciudadanoId: string): Promise<AuthUser> {
    const perfil = await this.perfilAccesoResolver.getPerfilAcceso(ciudadanoId);

    return {
      ciudadanoId: perfil.usuarioCiudadanoId,
      esAdministrador: perfil.esAdministrador,
      administradorId: perfil.administrador?.id ?? null,
      rol: (perfil.administrador?.rol as RolAdministrador | undefined) ?? null,
    };
  }

  /**
   * Nombre de pila en `usuarios_administradores`, o `null` si el ciudadano no
   * tiene ficha de funcionario/admin. Lo usa `GET /sesion` (SPEC-sesion-unica
   * §2.4); no se suma a `AuthUser` porque ese shape no cambia (criterio 8).
   */
  async resolverNombreAdministrador(
    ciudadanoId: string,
  ): Promise<string | null> {
    const perfil = await this.perfilAccesoResolver.getPerfilAcceso(ciudadanoId);
    return perfil.administrador?.nombre ?? null;
  }
}
