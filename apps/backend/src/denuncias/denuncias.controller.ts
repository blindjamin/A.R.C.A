import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, type AuthUser } from '../core';
import { DenunciasService } from './denuncias.service';
import { CrearDenunciaDto } from './dto/crear-denuncia.dto';

/** Denuncias del vecino (HU-16). Las del panel municipal son HU-18. */
@Controller('denuncias')
export class DenunciasController {
  constructor(private readonly denunciasService: DenunciasService) {}

  @Post()
  crear(
    @Body() dto: CrearDenunciaDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.denunciasService.crear(dto, user, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Get('mias')
  mias(@CurrentUser() user: AuthUser) {
    return this.denunciasService.mias(user);
  }
}
