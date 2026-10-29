import { IsInt, Min } from 'class-validator';

export class AprobarArticuloDto {
  /**
   * Cantidad de Circular Credits que el funcionario asigna al residuo.
   * Se abonarán a quien publicó una vez que se complete la entrega.
   */
  @IsInt({ message: 'Los créditos deben ser un número entero' })
  @Min(1, { message: 'El intercambio debe valer al menos 1 Circular Credit' })
  creditos: number;
}
