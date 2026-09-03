import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioAdministrador } from '@arca/core';

/** Item del listado para el modal de asignación (HU-08). */
export interface OperadorListado {
  id: string;
  nombre: string;
  rol: string;
  cargo: string | null;
}

@Injectable()
export class OperadoresService {
  constructor(
    @InjectRepository(UsuarioAdministrador)
    private readonly usuarioAdministradorRepository: Repository<UsuarioAdministrador>,
  ) {}

  /**
   * Administradores activos que pueden recibir una asignación de retiro.
   * El `id` es el de `usuarios_administradores` (el mismo que espera
   * `operadorAsignadoId` en el PATCH de asignación).
   */
  async findActivos(): Promise<OperadorListado[]> {
    const filas = await this.usuarioAdministradorRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC', apellido: 'ASC' },
    });

    return filas.map((op) => ({
      id: op.id,
      nombre: `${op.nombre} ${op.apellido}`.trim(),
      rol: op.rol,
      cargo: op.cargo,
    }));
  }
}
