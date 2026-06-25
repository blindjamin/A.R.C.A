import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Login diferido: tras autenticar, el frontend consulta si esta identidad
  // tiene extensión de administrador para decidir a qué vista enviarla.
  @Get(':ciudadanoId/perfil-acceso')
  getPerfilAcceso(@Param('ciudadanoId') ciudadanoId: string) {
    return this.usersService.getPerfilAcceso(ciudadanoId);
  }
}
