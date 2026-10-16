import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../core';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { PerfilService } from './perfil.service';

@Controller('perfil')
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  obtener(@CurrentUser() user: AuthUser) {
    return this.perfilService.obtener(user);
  }

  @Patch()
  actualizar(@CurrentUser() user: AuthUser, @Body() dto: ActualizarPerfilDto) {
    return this.perfilService.actualizar(user, dto);
  }
}
