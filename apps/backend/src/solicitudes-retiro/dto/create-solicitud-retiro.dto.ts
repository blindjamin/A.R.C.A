import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSolicitudRetiroDto {
  @IsUUID()
  @IsNotEmpty()
  usuarioCiudadanoId: string;

  @IsInt()
  residuoCatalogoId: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

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
}
