import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoArticuloMarketplace } from '../../core';

/**
 * Cuerpo de `POST /marketplace/articulos` (multipart/form-data). La foto viaja
 * como archivo en el campo `foto`, fuera de este DTO. Todo llega como texto,
 * de ahí los `@Type` para los números.
 */
export class PublicarArticuloDto {
  @IsEnum(TipoArticuloMarketplace)
  tipo: TipoArticuloMarketplace;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @Type(() => Number)
  @IsInt()
  residuoCatalogoId: number;

  /** Punto de quien publica. Se guarda aproximado a la grilla de 250 m. */
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lon?: number;
}
