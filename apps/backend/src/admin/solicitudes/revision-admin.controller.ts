import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  type AuthUser,
  CurrentUser,
  type OrigenPeticion,
  RolAdministrador,
  Roles,
  RolesGuard,
} from '@arca/core';
import { CorregirCategoriaDto } from './dto/corregir-categoria.dto';
import { CrearNotaDto } from './dto/crear-nota.dto';
import { RevisarSolicitudDto } from './dto/revisar-solicitud.dto';
import { RevisionAdminService } from './revision-admin.service';

const origenDe = (req: Request): OrigenPeticion => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});

/** Revisión de solicitudes por el funcionario (spec `revision-solicitudes`). */
@Controller('admin/solicitudes/:id')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO)
export class RevisionAdminController {
  constructor(private readonly revisionAdminService: RevisionAdminService) {}

  @Post('toma')
  tomar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.revisionAdminService.tomar(id, user);
  }

  @Delete('toma')
  @HttpCode(204)
  liberar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.revisionAdminService.liberar(id, user);
  }

  @Post('revision')
  revisar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarSolicitudDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.revisionAdminService.revisar(id, dto, user, origenDe(req));
  }

  @Get('revisiones')
  historial(@Param('id', ParseIntPipe) id: number) {
    return this.revisionAdminService.historial(id);
  }

  @Patch('categoria')
  @HttpCode(204)
  corregirCategoria(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CorregirCategoriaDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.revisionAdminService.corregirCategoria(
      id,
      dto,
      user,
      origenDe(req),
    );
  }

  @Get('notas')
  notas(@Param('id', ParseIntPipe) id: number) {
    return this.revisionAdminService.notas(id);
  }

  @Post('notas')
  crearNota(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearNotaDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.revisionAdminService.crearNota(id, dto, user, origenDe(req));
  }
}
