/**
 * Estado del pago de una solicitud (maqueta: no hay pasarela real).
 *
 * Va en un campo aparte de `estado` para no duplicar el ciclo: el cobro ocurre
 * después de aprobar, así que nunca se cobra una solicitud que se rechaza.
 */
export enum EstadoPagoSolicitud {
  /** Precio 0, o todavía no aprobada. */
  NO_APLICA = 'no_aplica',
  PENDIENTE = 'pendiente',
  PAGADO = 'pagado',
}
