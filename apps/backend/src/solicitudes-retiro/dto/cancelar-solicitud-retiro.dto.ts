import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CancelarSolicitudRetiroDto {
  @IsUUID()
  @IsNotEmpty()
  usuarioCiudadanoId: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  motivo?: string;
}
