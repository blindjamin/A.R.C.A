import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard, RolAdministrador } from '@arca/core';
import { OperadoresService } from './operadores.service';

/**
 * Listado de operadores/administradores activos para el modal de
 * programación de retiros (HU-08).
 */
@Controller('operadores')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.OPERADOR)
export class OperadoresController {
  constructor(private readonly operadoresService: OperadoresService) {}

  @Get()
  findActivos() {
    return this.operadoresService.findActivos();
  }
}
