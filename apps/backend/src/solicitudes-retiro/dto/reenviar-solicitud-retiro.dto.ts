import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Correcciones del vecino al reenviar una solicitud que requiere modificación.
 * Todo es opcional. La foto nueva (si hay) viaja como archivo `foto` en
 * multipart, fuera de este DTO.
 */
export class ReenviarSolicitudRetiroDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  residuoCatalogoId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  direccionRetiro?: string;
}
