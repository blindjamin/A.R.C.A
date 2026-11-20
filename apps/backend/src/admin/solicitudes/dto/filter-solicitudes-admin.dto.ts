import { IsEnum, IsOptional } from 'class-validator';
import { EstadoSolicitudRetiro } from '../../../core';

export class FilterSolicitudesAdminDto {
  @IsOptional()
  @IsEnum(EstadoSolicitudRetiro)
  estado?: EstadoSolicitudRetiro;
}
