import { BadRequestException } from '@nestjs/common';
import {
  Between,
  type FindOperator,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';

/** Rango máximo entre `desde` y `hasta`. */
const RANGO_MAXIMO_DIAS = 366;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Condición TypeORM para un rango ISO inclusive; lanza 400 si está invertido o pasa de 366 días. */
export function condicionRango(
  desde?: string,
  hasta?: string,
): FindOperator<Date> | undefined {
  const d = desde ? new Date(desde) : null;
  const h = hasta ? new Date(hasta) : null;

  if (d && h) {
    if (d > h) {
      throw new BadRequestException('desde no puede ser posterior a hasta');
    }
    if (h.getTime() - d.getTime() > RANGO_MAXIMO_DIAS * DIA_MS) {
      throw new BadRequestException(
        `El rango no puede superar ${RANGO_MAXIMO_DIAS} días`,
      );
    }
    return Between(d, h);
  }
  if (d) return MoreThanOrEqual(d);
  if (h) return LessThanOrEqual(h);
  return undefined;
}
