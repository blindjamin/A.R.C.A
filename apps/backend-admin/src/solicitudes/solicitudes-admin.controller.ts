import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard, RolAdministrador } from '@arca/core';
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
  ) {
    return this.solicitudesAdminService.update(id, dto);
  }
}
