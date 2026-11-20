import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Campos editables del perfil del vecino (HU-37). El nombre viene de
 * ClaveÚnica y no se acepta aquí. El correo se cambia solo vía `/api/mail`.
 * Un texto vacío borra el dato: el vecino puede dejar de compartirlo.
 */
export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  direccion?: string;
}
