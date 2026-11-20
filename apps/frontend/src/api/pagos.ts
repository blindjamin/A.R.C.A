// Pago del retiro con Webpay Plus (HU-44). Ver apps/backend/src/pagos/.
//
// El cobro lo hace Transbank: el backend crea la transacción y devuelve la URL
// del formulario de Webpay con su token. Al terminar, Transbank vuelve al
// backend (`/api/pagos/retorno`), que confirma el pago y redirige a
// `/pago/:id?resultado=…`. La pantalla lee el resultado real del comprobante.

import { apiFetch, handle, type EstadoPago } from './arca';

const API_URL = import.meta.env.VITE_API_URL as string;

export type ResultadoPago = 'aprobado' | 'anulado' | 'agotado' | 'rechazado';

export interface InicioPago {
  url: string;
  token: string;
}

export interface ComprobantePago {
  estadoPago: EstadoPago;
  monto: number | null;
  orden: string | null;
  codigoAutorizacion: string | null;
  fecha: string | null;
  resultado: ResultadoPago | null;
}

export function iniciarPago(solicitudId: number): Promise<InicioPago> {
  return apiFetch(`${API_URL}/pagos/solicitudes/${solicitudId}`, {
    method: 'POST',
  }).then((r) => handle<InicioPago>(r));
}

export function fetchComprobante(solicitudId: number): Promise<ComprobantePago> {
  return apiFetch(`${API_URL}/pagos/solicitudes/${solicitudId}`).then((r) =>
    handle<ComprobantePago>(r),
  );
}

/**
 * Lleva el navegador al formulario de Webpay. Transbank exige un POST con
 * `token_ws`, no un enlace: por eso se arma y envía un formulario.
 */
export function irAWebpay({ url, token }: InicioPago): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  const campo = document.createElement('input');
  campo.type = 'hidden';
  campo.name = 'token_ws';
  campo.value = token;
  form.appendChild(campo);
  document.body.appendChild(form);
  form.submit();
}
