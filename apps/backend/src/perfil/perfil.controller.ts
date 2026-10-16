import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
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
  actualizar(
    @CurrentUser() user: AuthUser,
    @Body() dto: ActualizarPerfilDto,
    @Req() req: Request,
  ) {
    return this.perfilService.actualizar(user, dto, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
