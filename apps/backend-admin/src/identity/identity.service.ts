import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  type PerfilAccesoResolver,
  UsuarioAdministrador,
  UsuarioCiudadano,
} from '@arca/core';

/**
 * Duplicado de apps/backend/src/users/users.service.ts#getPerfilAcceso.
 *
 * backend-admin no puede importar UsersService: vive en otra app (apps/backend),
 * y por eso no puede usar useExisting como hace apps/backend/src/users/users.module.ts.
 * Necesita su propia resolución de identidad para que AuthGuard (de @arca/core)
 * funcione acá también, contra la misma base de datos.
 *
 * Fuente de verdad de esta lógica: apps/backend/src/users/users.service.ts.
 * Si cambia allá, cambiar acá también — deuda declarada en el README de este backend.
 */
@Injectable()
export class IdentityService implements PerfilAccesoResolver {
  constructor(
    @InjectRepository(UsuarioCiudadano)
    private readonly usuarioCiudadanoRepository: Repository<UsuarioCiudadano>,
    @InjectRepository(UsuarioAdministrador)
    private readonly usuarioAdministradorRepository: Repository<UsuarioAdministrador>,
  ) {}

  async getPerfilAcceso(ciudadanoId: string) {
    const ciudadano = await this.usuarioCiudadanoRepository.findOne({
      where: { id: ciudadanoId },
    });

    if (!ciudadano) {
      throw new NotFoundException(
        `Usuario ciudadano ${ciudadanoId} no encontrado`,
      );
    }

    const admin = await this.usuarioAdministradorRepository.findOne({
      where: { usuarioCiudadanoId: ciudadanoId, activo: true },
    });

    return {
      usuarioCiudadanoId: ciudadano.id,
      esAdministrador: !!admin,
      administrador: admin
        ? {
            id: admin.id,
            nombre: admin.nombre,
            apellido: admin.apellido,
            rol: admin.rol,
          }
        : null,
    };
  }
}
