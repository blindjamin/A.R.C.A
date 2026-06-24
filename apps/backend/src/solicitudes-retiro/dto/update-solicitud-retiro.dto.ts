import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { EstadoSolicitudRetiro } from '../entities/estado-solicitud-retiro.enum';

export class UpdateSolicitudRetiroDto {
  @IsOptional()
  @IsEnum(EstadoSolicitudRetiro)
  estado?: EstadoSolicitudRetiro;

  @IsOptional()
  @IsUUID()
  operadorAsignadoId?: string;

  @IsOptional()
  @IsISO8601()
  fechaProgramada?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  razonRechazo?: string;
}
