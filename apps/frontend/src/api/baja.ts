// Darse de baja (HU-38). Ver apps/backend/src/perfil/baja.service.ts.

import { apiFetch, handle } from './arca';

const API_URL = import.meta.env.VITE_API_URL as string;

export interface EstadoBaja {
  puedeDarseDeBaja: boolean;
  /** Solicitudes pagadas o en retiro: impiden la baja. */
  solicitudesQueBloquean: number[];
  /** Intercambios reservados del Marketplace: hay que entregarlos o liberarlos. */
  articulosQueBloquean: number[];
  /** Solicitudes abiertas sin pagar que la baja cancela. */
  solicitudesQueSeCancelan: number[];
  horasParaVolver: number;
}

export interface BajaRealizada {
  fechaBaja: string;
  puedeVolverDesde: string;
  solicitudesCanceladas: number[];
}

export function fetchEstadoBaja(): Promise<EstadoBaja> {
  return apiFetch(`${API_URL}/perfil/baja`).then((r) => handle<EstadoBaja>(r));
}

export function darseDeBaja(): Promise<BajaRealizada> {
  return apiFetch(`${API_URL}/perfil/baja`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmo: true }),
  }).then((r) => handle<BajaRealizada>(r));
}
