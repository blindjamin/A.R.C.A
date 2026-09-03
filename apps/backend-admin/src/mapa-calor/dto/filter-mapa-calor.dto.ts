import { IsEnum, IsOptional } from 'class-validator';

export enum MetricaMapaCalor {
  VOLUMEN = 'volumen',
  PENDIENTES = 'pendientes',
}

export class FilterMapaCalorDto {
  @IsOptional()
  @IsEnum(MetricaMapaCalor)
  metrica?: MetricaMapaCalor = MetricaMapaCalor.VOLUMEN;
}
