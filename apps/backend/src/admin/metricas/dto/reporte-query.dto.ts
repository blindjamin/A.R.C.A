import { IsISO8601 } from 'class-validator';

/** Rango inclusive. Fecha `AAAA-MM-DD` o instante ISO, como el resto del panel. */
export class ReporteQueryDto {
  @IsISO8601({ strict: true })
  desde: string;

  @IsISO8601({ strict: true })
  hasta: string;
}
