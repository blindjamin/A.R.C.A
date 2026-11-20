import { randomBytes } from 'crypto';

/** Tope de Transbank para la orden de compra. */
const LARGO_ORDEN = 26;

/** Tope de Transbank para el id de sesión del intento. */
const LARGO_SESION = 61;

/** Orden alfanumérica única por intento. No usa datos del vecino. */
export function nuevaOrdenCompra(solicitudId: number): string {
  const cuerpo = `r${solicitudId.toString(36)}${randomBytes(4).toString('hex')}${Date.now().toString(36)}`;
  const orden = cuerpo.replace(/[^a-z0-9]/gi, '').slice(0, LARGO_ORDEN);
  if (!/^[a-zA-Z0-9]{1,26}$/.test(orden)) {
    throw new Error('No se pudo armar la orden de compra.');
  }
  return orden;
}

/** Id que Transbank devuelve al anular. No es la cookie de A.R.C.A. */
export function nuevaSesionWebpay(): string {
  return randomBytes(16).toString('hex').slice(0, LARGO_SESION);
}
