import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Cuerpo de `PATCH /marketplace/articulos/:id/reservar`: a quién se reserva. */
export class ReservarArticuloDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversacionId: number;
}
