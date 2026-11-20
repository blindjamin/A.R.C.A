import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { LARGO_MAXIMO_MENSAJE } from '../chat/reglas-chat';

/** Cuerpo multipart de `POST /marketplace/articulos/:id/mensajes/imagen`; la foto va en el campo `imagen`. */
export class EnviarMensajeImagenDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(LARGO_MAXIMO_MENSAJE)
  contenido?: string;
}
