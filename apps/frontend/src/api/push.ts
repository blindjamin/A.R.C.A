// Capa de API de las notificaciones push (HU-06). Ver apps/backend/src/push/.

import { apiFetch, handle } from './arca';

const API_URL = import.meta.env.VITE_API_URL as string;

/** Clave pública VAPID; null si el servidor no tiene push configurado. */
export function obtenerClavePublica(): Promise<string | null> {
  return apiFetch(`${API_URL}/push/clave-publica`)
    .then((r) => handle<{ clavePublica: string | null }>(r))
    .then((r) => r.clavePublica);
}

// Sin `expirationTime`: el backend rechaza campos extra (400).
export function registrarSuscripcion(s: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ suscrito: boolean }> {
  return apiFetch(`${API_URL}/push/suscripciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  }).then((r) => handle<{ suscrito: boolean }>(r));
}

export function quitarSuscripcion(endpoint: string): Promise<{ eliminado: boolean }> {
  return apiFetch(`${API_URL}/push/suscripciones`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).then((r) => handle<{ eliminado: boolean }>(r));
}
