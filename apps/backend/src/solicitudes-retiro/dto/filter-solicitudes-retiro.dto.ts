import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { EstadoSolicitudRetiro } from '../entities/estado-solicitud-retiro.enum';

export class FilterSolicitudesRetiroDto {
  @IsOptional()
  @IsUUID()
  usuarioCiudadanoId?: string;

  @IsOptional()
  @IsEnum(EstadoSolicitudRetiro)
  estado?: EstadoSolicitudRetiro;
}
