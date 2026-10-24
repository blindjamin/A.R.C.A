// Capa de API de la campanita de avisos (HU-23). Ver apps/backend/src/notificaciones/.

import { apiFetch, handle } from './arca';

const API_URL = import.meta.env.VITE_API_URL as string;

export interface Aviso {
  id: number;
  tipo: string;
  titulo: string;
  cuerpo: string;
  /** Ruta propia de la app a la que lleva el aviso. */
  url: string;
  leido: boolean;
  fecha: string;
}

export interface PaginaAvisos {
  avisos: Aviso[];
  noLeidos: number;
  hayMas: boolean;
}

/** De más reciente a más antiguo; `antesDe` pide la página siguiente. */
export function listarAvisos(antesDe?: number): Promise<PaginaAvisos> {
  const params = new URLSearchParams();
  if (antesDe) params.set('antesDe', String(antesDe));
  return apiFetch(`${API_URL}/notificaciones?${params}`).then((r) => handle<PaginaAvisos>(r));
}

export function marcarAvisosLeidos(): Promise<{ marcados: number }> {
  return apiFetch(`${API_URL}/notificaciones/leidas`, { method: 'PATCH' }).then((r) =>
    handle<{ marcados: number }>(r),
  );
}
