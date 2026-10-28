/**
 * Estado de un intento de pago con Webpay Plus (HU-44).
 *
 * Va en el intento, no en la solicitud: el vecino puede anular o agotar el
 * tiempo y volver a intentar, y la solicitud sigue en `pendiente` hasta que
 * un intento quede `autorizado`.
 */
export enum EstadoIntentoPago {
  INICIADO = 'iniciado',
  AUTORIZADO = 'autorizado',
  ANULADO = 'anulado',
  AGOTADO = 'agotado',
  RECHAZADO = 'rechazado',
}
