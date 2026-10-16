import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Campos editables del perfil del vecino (HU-37). El nombre viene de
 * ClaveÚnica y no se acepta aquí. El correo se cambia solo vía `/api/mail`.
 */
export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  direccion?: string;
}
