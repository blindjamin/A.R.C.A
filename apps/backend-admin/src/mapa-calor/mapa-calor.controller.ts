import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles, RolesGuard, RolAdministrador } from '@arca/core';
import { MapaCalorService } from './mapa-calor.service';
import { FilterMapaCalorDto } from './dto/filter-mapa-calor.dto';

@Controller('admin/mapa-calor')
@UseGuards(RolesGuard)
@Roles(
  RolAdministrador.ADMIN,
  RolAdministrador.OPERADOR,
  RolAdministrador.PATROCINADOR,
)
export class MapaCalorController {
  constructor(private readonly mapaCalorService: MapaCalorService) {}

  @Get()
  getMapaCalor(@Query() filtros: FilterMapaCalorDto) {
    return this.mapaCalorService.getAgregacion(filtros);
  }
}
