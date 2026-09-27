import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearNotaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  texto: string;
}
