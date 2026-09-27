/**
 * Ciclo de vida de una solicitud de retiro (spec `ciclo-solicitud`).
 *
 * El retiro lo ejecuta una empresa externa: el municipio revisa la solicitud y
 * la deriva, no asigna operadores. Quién puede pasar de un estado a otro está
 * en `solicitudes/ciclo-solicitud.ts`; cambiar `estado` sin pasar por ahí se
 * salta los permisos.
 */
export enum EstadoSolicitudRetiro {
  EN_REVISION = 'en_revision',
  REQUIERE_MODIFICACION = 'requiere_modificacion',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
  DERIVADA = 'derivada',
  RETIRADA = 'retirada',
  NO_REALIZADA = 'no_realizada',
  CANCELADA = 'cancelada',
}
