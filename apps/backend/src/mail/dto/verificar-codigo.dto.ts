import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class VerificarCodigoDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'El código de verificación debe tener 6 dígitos' })
  codigo: string;

  @IsOptional()
  @IsString()
  usuarioCiudadanoId?: string;
}
