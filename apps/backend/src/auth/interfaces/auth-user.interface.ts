import { RolAdministrador } from '../../users/entities/rol-administrador.enum';

/**
 * Identidad autenticada adjunta al request tras pasar AuthGuard.
 * Cuando Benjamín integre JWT/ClaveÚnica, AuthService seguirá resolviendo este shape.
 */
export interface AuthUser {
  ciudadanoId: string;
  esAdministrador: boolean;
  administradorId: string | null;
  rol: RolAdministrador | null;
}
