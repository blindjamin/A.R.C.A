import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional } from 'class-validator';

/**
 * Punto de quien mira, para calcular la banda de distancia. El navegador ya lo
 * manda redondeado a 20 m y el servidor lo vuelve a llevar a la grilla de 250 m.
 */
export class OrigenDto {
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lon?: number;
}
