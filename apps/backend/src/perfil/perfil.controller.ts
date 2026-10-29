import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  COOKIE_SESION,
  CurrentUser,
  opcionesCookieSesion,
  type AuthUser,
} from '../core';
import { BajaService } from './baja.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { DarseDeBajaDto } from './dto/darse-de-baja.dto';
import { PerfilService } from './perfil.service';

@Controller('perfil')
export class PerfilController {
  constructor(
    private readonly perfilService: PerfilService,
    private readonly bajaService: BajaService,
  ) {}

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

  /** Qué impide la baja y qué solicitudes cancelaría (HU-38). */
  @Get('baja')
  estadoBaja(@CurrentUser() user: AuthUser) {
    return this.bajaService.estado(user);
  }

  /** Desactiva la cuenta, cierra las sesiones y borra la cookie. */
  @Post('baja')
  @HttpCode(200)
  async darseDeBaja(
    @CurrentUser() user: AuthUser,
    @Body() _dto: DarseDeBajaDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const baja = await this.bajaService.darseDeBaja(user, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    res.clearCookie(COOKIE_SESION, opcionesCookieSesion());
    return baja;
  }
}
