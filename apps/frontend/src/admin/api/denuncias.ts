// Denuncias en el panel municipal (HU-18). Los tipos del vecino (motivos,
// estados, origen) vienen de api/denuncias.ts, el contrato de HU-16.

import { apiFetch } from '../../api/apiFetch';
import {
  MOTIVOS_DENUNCIA,
  type EstadoDenuncia,
  type MotivoDenuncia,
  type OrigenDenuncia,
} from '../../api/denuncias';
import { handle } from './admin';

const API_URL = import.meta.env.VITE_API_URL as string;

export type { EstadoDenuncia };

export function etiquetaMotivo(motivo: MotivoDenuncia): string {
  return MOTIVOS_DENUNCIA.find((m) => m.valor === motivo)?.etiqueta ?? motivo;
}

export interface DenunciaResumen {
  id: number;
  fecha: string;
  motivo: MotivoDenuncia;
  estado: EstadoDenuncia;
  origen: OrigenDenuncia;
  denuncianteNombre: string;
  denunciadoNombre: string;
  /** Referencia corta y estable: el nombre de pila se repite o falta sin sesión activa. */
  denuncianteRef: string;
  denunciadoRef: string;
  articuloTitulo: string | null;
  /** Denuncias contra el denunciado, sin contar las rechazadas. */
  denunciasDelDenunciado: number;
  denunciasRechazadasDelDenunciado: number;
}

/** Copia de un mensaje que el denunciante adjuntó (hasta 5). */
export interface MensajeAdjunto {
  deQuien: 'denunciante' | 'denunciado';
  contenido: string;
  fecha: string;
}

export interface DenunciaDetalle extends DenunciaResumen {
  descripcion: string | null;
  mensajes: MensajeAdjunto[];
  resolucion: string | null;
  fechaResolucion: string | null;
}

export interface CambioEstadoDenuncia {
  estado: Exclude<EstadoDenuncia, 'abierta'>;
  /** Obligatoria para resolver o rechazar. */
  resolucion?: string;
}

export function listarDenuncias(estados: EstadoDenuncia[]): Promise<DenunciaResumen[]> {
  const params = new URLSearchParams({ estado: estados.join(',') });
  return apiFetch(`${API_URL}/admin/denuncias?${params}`).then((r) =>
    handle<DenunciaResumen[]>(r),
  );
}

export function obtenerDenuncia(id: number): Promise<DenunciaDetalle> {
  return apiFetch(`${API_URL}/admin/denuncias/${id}`).then((r) =>
    handle<DenunciaDetalle>(r),
  );
}

export function cambiarEstadoDenuncia(
  id: number,
  cambio: CambioEstadoDenuncia,
): Promise<DenunciaDetalle> {
  return apiFetch(`${API_URL}/admin/denuncias/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambio),
  }).then((r) => handle<DenunciaDetalle>(r));
}

/** Bloqueo del vecino denunciado en el Marketplace (HU-18). */
export interface EstadoBloqueo {
  bloqueado: boolean;
  motivo: string | null;
  fecha: string | null;
  /** Solo el administrador puede bloquear y desbloquear. */
  puedeBloquear: boolean;
}

export function obtenerBloqueo(denunciaId: number): Promise<EstadoBloqueo> {
  return apiFetch(`${API_URL}/admin/denuncias/${denunciaId}/bloqueo`).then((r) =>
    handle<EstadoBloqueo>(r),
  );
}

export function cambiarBloqueo(
  denunciaId: number,
  accion: 'bloqueo' | 'desbloqueo',
  motivo: string,
): Promise<EstadoBloqueo> {
  return apiFetch(`${API_URL}/admin/denuncias/${denunciaId}/${accion}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo }),
  }).then((r) => handle<EstadoBloqueo>(r));
}
