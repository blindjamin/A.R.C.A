import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Cuerpo de `POST /marketplace/articulos/:id/calificacion` (HU-15). */
export class CalificarArticuloDto {
  @IsInt()
  @Min(1)
  @Max(5)
  puntuacion: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
