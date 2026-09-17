import { IsEnum } from 'class-validator';
import { EstadoSolicitudRetiro } from '@arca/core';

/**
 * Solo el estado destino: los efectos (monto, pago, revisor, fecha de cierre)
 * los calcula `aplicarTransicion` en `@arca/core`, no el cliente.
 */
export class UpdateSolicitudAdminDto {
  @IsEnum(EstadoSolicitudRetiro)
  estado: EstadoSolicitudRetiro;
}
