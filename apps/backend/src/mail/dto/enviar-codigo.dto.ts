import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EnviarCodigoDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsOptional()
  @IsString()
  usuarioCiudadanoId?: string;
}
