import { IsInt, IsPositive } from 'class-validator';

export class CorregirCategoriaDto {
  @IsInt()
  @IsPositive()
  residuoCatalogoId: number;
}
