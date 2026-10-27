import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/** Paginación de `GET /notificaciones`: avisos anteriores al id indicado. */
export class ListarAvisosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  antesDe?: number;
}
