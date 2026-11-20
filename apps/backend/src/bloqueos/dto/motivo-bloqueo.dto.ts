import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** El motivo lo ve el vecino bloqueado: se exige al bloquear y al desbloquear. */
export class MotivoBloqueoDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'Escribe el motivo' })
  @MaxLength(500)
  motivo: string;
}
