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
import { CancelarSolicitudRetiroDto } from './dto/cancelar-solicitud-retiro.dto';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { FilterSolicitudesRetiroDto } from './dto/filter-solicitudes-retiro.dto';
import { UpdateSolicitudRetiroDto } from './dto/update-solicitud-retiro.dto';
import { SolicitudesRetiroService } from './solicitudes-retiro.service';

@Controller('solicitudes-retiro')
export class SolicitudesRetiroController {
  constructor(private readonly solicitudesRetiroService: SolicitudesRetiroService) {}

  @Post()
  create(@Body() dto: CreateSolicitudRetiroDto) {
    return this.solicitudesRetiroService.create(dto);
  }

  @Get()
  findAll(@Query() filtros: FilterSolicitudesRetiroDto) {
    return this.solicitudesRetiroService.findAll(filtros);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.solicitudesRetiroService.findOne(id);
  }

  @Patch(':id')
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
  ) {
    return this.solicitudesRetiroService.cancelarPorCiudadano(id, dto);
  }
}
