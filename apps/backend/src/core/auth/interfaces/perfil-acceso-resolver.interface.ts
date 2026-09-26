import { RolAdministrador } from '../../entities/rol-administrador.enum';

/**
 * Forma mínima que necesita AuthService para armar un AuthUser. La implementa
 * UsersService (apps/backend/src/users/users.service.ts) — pero AuthService
 * vive en @arca/core y no puede importar una clase concreta de una app
 * consumidora sin invertir la dependencia (un paquete compartido no puede
 * depender de una app específica). El token de inyección rompe ese ciclo:
 * cada app que importa AuthModule provee su propio PERFIL_ACCESO_RESOLVER.
 */
export interface PerfilAccesoResolver {
  getPerfilAcceso(ciudadanoId: string): Promise<{
    usuarioCiudadanoId: string;
    esAdministrador: boolean;
    administrador: {
      id: string;
      nombre: string;
      apellido: string;
      rol: string;
    } | null;
  }>;
}

export const PERFIL_ACCESO_RESOLVER = Symbol('PERFIL_ACCESO_RESOLVER');
