import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ResiduoCatalogo,
  RolAdministrador,
  Roles,
  RolesGuard,
} from '@arca/core';

/** Catálogo de residuos, de solo lectura, para corregir la categoría al revisar. */
@Controller('admin/residuos')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO)
export class ResiduosAdminController {
  constructor(
    @InjectRepository(ResiduoCatalogo)
    private readonly residuoCatalogoRepository: Repository<ResiduoCatalogo>,
  ) {}

  @Get()
  findAll() {
    return this.residuoCatalogoRepository.find({
      select: { id: true, nombre: true, categoria: true, precio: true },
      order: { categoria: 'ASC', nombre: 'ASC' },
    });
  }
}
