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
  Roles,
  RolesGuard,
  RolAdministrador,
} from '@arca/core';

/** Datos de la petición para las acciones auditadas (HU-14). */
const origenDe = (req: Request): OrigenPeticion => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});
import { FilterSolicitudesAdminDto } from './dto/filter-solicitudes-admin.dto';
import { UpdateSolicitudAdminDto } from './dto/update-solicitud-admin.dto';
import { SolicitudesAdminService } from './solicitudes-admin.service';

@Controller('admin/solicitudes')
@UseGuards(RolesGuard)
@Roles(
  RolAdministrador.ADMIN,
  RolAdministrador.OPERADOR,
  RolAdministrador.PATROCINADOR,
)
export class SolicitudesAdminController {
  constructor(
    private readonly solicitudesAdminService: SolicitudesAdminService,
  ) {}

  @Get()
  findAll(@Query() filtros: FilterSolicitudesAdminDto) {
    return this.solicitudesAdminService.findAll(filtros);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.solicitudesAdminService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolAdministrador.ADMIN, RolAdministrador.OPERADOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudAdminDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.solicitudesAdminService.update(id, dto, user, origenDe(req));
  }
}
