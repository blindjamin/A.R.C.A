import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '@arca/core';
import { CancelarSolicitudRetiroDto } from './dto/cancelar-solicitud-retiro.dto';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { FilterSolicitudesRetiroDto } from './dto/filter-solicitudes-retiro.dto';
import { SolicitudesRetiroService } from './solicitudes-retiro.service';

@Controller('solicitudes-retiro')
export class SolicitudesRetiroController {
  constructor(
    private readonly solicitudesRetiroService: SolicitudesRetiroService,
  ) {}

  @Post()
  create(@Body() dto: CreateSolicitudRetiroDto, @CurrentUser() user: AuthUser) {
    return this.solicitudesRetiroService.create(dto, user);
  }

  @Get()
  findAll(
    @Query() filtros: FilterSolicitudesRetiroDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitudesRetiroService.findAll(filtros, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitudesRetiroService.findOne(id, user);
  }

  // PATCH /:id (cambio de estado / asignar operador, @Roles ADMIN|OPERADOR) se
  // movió a apps/backend-admin (Fase 3 de la migración admin): es la única ruta
  // de este controller que se elimina. Sigue en pie en
  // apps/backend-admin/src/solicitudes/solicitudes-admin.controller.ts.

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarSolicitudRetiroDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitudesRetiroService.cancelarPorCiudadano(id, dto, user);
  }
}
