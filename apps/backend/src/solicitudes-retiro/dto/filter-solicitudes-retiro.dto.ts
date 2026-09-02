import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstadoSolicitudRetiro } from '@arca/core';

export class FilterSolicitudesRetiroDto {
  @IsOptional()
  @IsUUID()
  usuarioCiudadanoId?: string;

  @IsOptional()
  @IsEnum(EstadoSolicitudRetiro)
  estado?: EstadoSolicitudRetiro;
}
