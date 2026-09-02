import { Controller, ForbiddenException, Get, Param } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '@arca/core';
import { UsersService } from './users.service';

@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Login diferido: tras autenticar, el frontend consulta si esta identidad
  // tiene extensión de administrador para decidir a qué vista enviarla.
  @Get(':ciudadanoId/perfil-acceso')
  getPerfilAcceso(
    @Param('ciudadanoId') ciudadanoId: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (user.ciudadanoId !== ciudadanoId) {
      throw new ForbiddenException(
        'Solo puedes consultar tu propio perfil de acceso',
      );
    }

    return this.usersService.getPerfilAcceso(ciudadanoId);
  }
}
