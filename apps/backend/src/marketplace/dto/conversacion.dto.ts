import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * Conversación del chat (HU-06). Solo la usa quien publicó, para elegir con
 * quién habla; el interesado siempre tiene una sola.
 */
export class ConversacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  conversacion?: number;
}

/** Paginación del historial: mensajes anteriores al id indicado. */
export class HistorialDto extends ConversacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  antesDe?: number;
}
