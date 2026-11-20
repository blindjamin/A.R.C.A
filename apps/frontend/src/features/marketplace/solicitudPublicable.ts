import type { SolicitudRetiro } from '../../api/arca';

const ESTADOS_PUBLICABLES = ['en_revision', 'requiere_modificacion', 'aprobada'];

/**
 * Solo se publica desde solicitudes abiertas y sin pagar. Misma regla que el
 * backend (`solicitudPublicable`): pagada, derivada, retirada, rechazada o
 * cancelada ya no se ofrece.
 */
export const solicitudPublicable = (
  s: Pick<SolicitudRetiro, 'estado' | 'estadoPago'>,
): boolean => ESTADOS_PUBLICABLES.includes(s.estado) && s.estadoPago !== 'pagado';
