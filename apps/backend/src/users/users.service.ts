import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioAdministrador, UsuarioCiudadano } from './entities';

export interface PerfilAcceso {
  usuarioCiudadanoId: string;
  esAdministrador: boolean;
  administrador: {
    id: string;
    nombre: string;
    apellido: string;
    rol: string;
  } | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UsuarioCiudadano)
    private readonly usuarioCiudadanoRepository: Repository<UsuarioCiudadano>,
    @InjectRepository(UsuarioAdministrador)
    private readonly usuarioAdministradorRepository: Repository<UsuarioAdministrador>,
  ) {}

  findCiudadanoByClaveUnicaId(
    claveUnicaId: string,
  ): Promise<UsuarioCiudadano | null> {
    return this.usuarioCiudadanoRepository.findOne({ where: { claveUnicaId } });
  }

  /**
   * Resuelve el perfil de acceso de una identidad base: indica si además de
   * ciudadano tiene extensión de administrador activa (login diferido).
   */
  async getPerfilAcceso(ciudadanoId: string): Promise<PerfilAcceso> {
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
