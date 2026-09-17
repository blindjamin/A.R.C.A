import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolAdministrador, Roles, RolesGuard } from '@arca/core';
import { MetricasQueryDto } from './dto/metricas-query.dto';
import { MetricasAdminService } from './metricas-admin.service';

/** Indicadores agregados del panel (spec `dashboard-metricas`). */
@Controller('admin/metricas')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO)
export class MetricasAdminController {
  constructor(private readonly metricasAdminService: MetricasAdminService) {}

  @Get()
  obtener(@Query() query: MetricasQueryDto) {
    return this.metricasAdminService.obtener(query.dias ?? 30);
  }
}
