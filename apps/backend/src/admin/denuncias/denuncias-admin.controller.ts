import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
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
import { DenunciasAdminService } from './denuncias-admin.service';
import { CambiarEstadoDenunciaDto } from './dto/cambiar-estado-denuncia.dto';

const origenDe = (req: Request): OrigenPeticion => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});

@Controller('admin/denuncias')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO)
export class DenunciasAdminController {
  constructor(private readonly denunciasAdminService: DenunciasAdminService) {}

  @Get()
  listar(@Query('estado') estado?: string) {
    return this.denunciasAdminService.listar(estado);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.denunciasAdminService.detalle(id);
  }

  @Patch(':id')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDenunciaDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.denunciasAdminService.cambiarEstado(
      id,
      dto,
      user,
      origenDe(req),
    );
  }
}
