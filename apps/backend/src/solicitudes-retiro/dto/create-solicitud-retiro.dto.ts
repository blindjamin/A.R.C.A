import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Cuerpo de `POST /solicitudes-retiro` (multipart/form-data). La foto viaja
 * como archivo en el campo `foto`, fuera de este DTO. Los campos llegan como
 * texto, de ahí los `@Type` para los números.
 */
export class CreateSolicitudRetiroDto {
  @IsUUID()
  @IsNotEmpty()
  usuarioCiudadanoId: string;

  @Type(() => Number)
  @IsInt()
  residuoCatalogoId: number;

  @IsString()
  @IsNotEmpty({ message: 'La dirección de retiro es obligatoria' })
  @MaxLength(500)
  direccionRetiro: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  /**
   * Opcional. Si no viene, el servicio copia `direccionRetiro` truncada a
   * `direccionAnonimizada` para que panel/Excel sigan mostrando dirección.
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccionAnonimizada?: string;

  @IsOptional()
  @IsString()
  latitudCapturada?: string;

  @IsOptional()
  @IsString()
  longitudCapturada?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo de contacto no es válido' })
  emailContacto?: string;
}
