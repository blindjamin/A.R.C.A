import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarArticuloDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo: string;
}
