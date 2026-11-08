// Bloqueo del propio vecino en el Marketplace (HU-18).

import { apiFetch, handle } from './arca';

const API_URL = import.meta.env.VITE_API_URL as string;

export type MiBloqueo =
  | { bloqueado: false }
  | { bloqueado: true; motivo: string; fecha: string };

export function fetchMiBloqueo(): Promise<MiBloqueo> {
  return apiFetch(`${API_URL}/marketplace/bloqueo`).then((r) => handle<MiBloqueo>(r));
}
