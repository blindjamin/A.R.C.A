import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { SolicitudesRetiroService } from './solicitudes-retiro.service';

@Controller('solicitudes-retiro')
export class SolicitudesRetiroController {
  constructor(private readonly solicitudesRetiroService: SolicitudesRetiroService) {}

  @Post()
  create(@Body() dto: CreateSolicitudRetiroDto) {
    return this.solicitudesRetiroService.create(dto);
  }

  @Get()
  findAll(@Query('usuarioCiudadanoId') usuarioCiudadanoId?: string) {
    if (usuarioCiudadanoId) {
      return this.solicitudesRetiroService.findByUsuarioCiudadanoId(usuarioCiudadanoId);
    }

    return this.solicitudesRetiroService.findAll();
  }
}
