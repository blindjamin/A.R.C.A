import { SetMetadata } from '@nestjs/common';
import { RolAdministrador } from '../../entities/rol-administrador.enum';

export const ROLES_KEY = 'roles';

/** Exige extensión de administrador activa con uno de los roles indicados. */
export const Roles = (...roles: RolAdministrador[]) =>
  SetMetadata(ROLES_KEY, roles);
