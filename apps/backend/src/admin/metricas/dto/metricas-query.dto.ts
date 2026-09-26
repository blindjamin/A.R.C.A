import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { RANGOS_DIAS, type RangoDias } from '../calcular-metricas';

export class MetricasQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(RANGOS_DIAS)
  dias?: RangoDias;
}
