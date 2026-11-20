import { type AuthUser, RolAdministrador } from '../core';

/**
 * Quién puede bloquear y desbloquear (HU-18). Único lugar donde se define:
 * para extenderlo al funcionario basta con agregarlo acá.
 */
export const ROLES_BLOQUEO: RolAdministrador[] = [RolAdministrador.ADMIN];

export const puedeBloquear = (user: AuthUser): boolean =>
  user.esAdministrador && !!user.rol && ROLES_BLOQUEO.includes(user.rol);
