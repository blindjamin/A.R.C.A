import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthUser,
  type OrigenPeticion,
  RolAdministrador,
  Roles,
  RolesGuard,
} from '../../core';
import { AprobarArticuloDto } from './dto/aprobar-articulo.dto';
import { RechazarArticuloDto } from './dto/rechazar-articulo.dto';
import { MarketplaceAdminService } from './marketplace-admin.service';

const origenDe = (req: Request): OrigenPeticion => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});

@Controller('admin/marketplace')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO)
export class MarketplaceAdminController {
  constructor(
    private readonly marketplaceAdminService: MarketplaceAdminService,
  ) {}

  @Get('pendientes')
  findPendientes() {
    return this.marketplaceAdminService.findPendientes();
  }

  @Get('conteo-pendientes')
  conteoPendientes() {
    return this.marketplaceAdminService.conteoPendientes();
  }

  @Post(':id/aprobar')
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprobarArticuloDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.marketplaceAdminService.aprobar(id, dto, user, origenDe(req));
  }

  @Post(':id/rechazar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarArticuloDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.marketplaceAdminService.rechazar(id, dto, user, origenDe(req));
  }
}
