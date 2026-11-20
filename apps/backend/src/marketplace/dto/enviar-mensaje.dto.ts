import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LARGO_MAXIMO_MENSAJE } from '../chat/reglas-chat';

/** Cuerpo de `POST /marketplace/articulos/:id/mensajes` (HU-06). */
export class EnviarMensajeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_MENSAJE)
  contenido: string;
}
