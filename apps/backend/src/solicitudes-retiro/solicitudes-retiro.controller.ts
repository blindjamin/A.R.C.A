import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/auth.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RolAdministrador } from '../users/entities/rol-administrador.enum';
import { CancelarSolicitudRetiroDto } from './dto/cancelar-solicitud-retiro.dto';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { FilterSolicitudesRetiroDto } from './dto/filter-solicitudes-retiro.dto';
import { UpdateSolicitudRetiroDto } from './dto/update-solicitud-retiro.dto';
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

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolAdministrador.ADMIN, RolAdministrador.OPERADOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudRetiroDto,
  ) {
    return this.solicitudesRetiroService.update(id, dto);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarSolicitudRetiroDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitudesRetiroService.cancelarPorCiudadano(id, dto, user);
  }
}
