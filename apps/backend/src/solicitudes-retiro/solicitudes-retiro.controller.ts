import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, type AuthUser, type OrigenPeticion } from '@arca/core';

/**
 * Datos de la petición que acompañan a las acciones auditadas (HU-14).
 *
 * Se leen acá y se pasan al service: la lógica de negocio no depende de
 * Express, y así las acciones que no vienen de una petición HTTP simplemente
 * no los envían.
 */
const origenDe = (req: Request): OrigenPeticion => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});
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
  create(
    @Body() dto: CreateSolicitudRetiroDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.solicitudesRetiroService.create(dto, user, origenDe(req));
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
    @Req() req: Request,
  ) {
    return this.solicitudesRetiroService.cancelarPorCiudadano(
      id,
      dto,
      user,
      origenDe(req),
    );
  }
}
