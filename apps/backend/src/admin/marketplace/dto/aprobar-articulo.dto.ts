import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class AprobarArticuloDto {
  /**
   * Cantidad de Circular Credits que el funcionario asigna al residuo.
   * Si no se indica, toma el valor sugerido de 100 créditos por defecto.
   * Se abonarán a quien publicó una vez que se complete la entrega.
   */
  @IsOptional()
  @IsInt({ message: 'Los créditos deben ser un número entero' })
  @Min(1, { message: 'El intercambio debe valer al menos 1 Circular Credit' })
  @Max(5000, {
    message: 'El intercambio no puede superar los 5.000 Circular Credits',
  })
  creditos?: number;
}
