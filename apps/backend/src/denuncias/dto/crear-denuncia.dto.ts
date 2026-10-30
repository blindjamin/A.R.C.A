import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MotivoDenuncia, OrigenDenuncia } from '../../core';
import { LARGO_DESCRIPCION, MAX_MENSAJES_ADJUNTOS } from '../reglas-denuncias';

/**
 * Denuncia de un vecino (HU-16). Nunca trae el id del denunciado: el servidor
 * lo deduce del artículo y, si denuncia quien publicó, de la conversación.
 */
export class CrearDenunciaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  articuloId: number;

  /** Solo para quien publicó: con cuál interesado (id opaco del chat). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversacion?: number;

  @IsEnum(OrigenDenuncia)
  origen: OrigenDenuncia;

  @IsEnum(MotivoDenuncia)
  motivo: MotivoDenuncia;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @MaxLength(LARGO_DESCRIPCION)
  descripcion?: string;

  /** Mensajes de esa conversación que se adjuntan como prueba. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MENSAJES_ADJUNTOS)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  mensajes?: number[];
}
