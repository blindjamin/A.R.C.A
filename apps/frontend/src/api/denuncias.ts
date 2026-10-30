// Denuncias entre vecinos (HU-16). Ver apps/backend/src/denuncias/ y
// docs/specs/SPEC-marketplace.md §5.2. El id del denunciado nunca viaja: el
// servidor lo deduce del artículo y, si denuncia quien publicó, de la conversación.

import { apiFetch, handle } from './arca';

const API_URL = import.meta.env.VITE_API_URL as string;

export type MotivoDenuncia =
  | 'no_se_presento'
  | 'articulo_distinto'
  | 'basura_encubierta'
  | 'cobro_indebido'
  | 'trato_inadecuado'
  | 'otro';

export type OrigenDenuncia = 'articulo' | 'perfil' | 'chat';

export type EstadoDenuncia = 'abierta' | 'investigacion' | 'resuelta' | 'rechazada';

export const MOTIVOS_DENUNCIA: { valor: MotivoDenuncia; etiqueta: string }[] = [
  { valor: 'no_se_presento', etiqueta: 'No se presentó a la entrega acordada' },
  { valor: 'articulo_distinto', etiqueta: 'El artículo no era el publicado' },
  { valor: 'basura_encubierta', etiqueta: 'Usa el Marketplace para deshacerse de basura' },
  { valor: 'cobro_indebido', etiqueta: 'Me pidió dinero por algo publicado gratis' },
  { valor: 'trato_inadecuado', etiqueta: 'Trato inadecuado o amenazas' },
  { valor: 'otro', etiqueta: 'Otro motivo' },
];

export const ETIQUETA_ESTADO_DENUNCIA: Record<EstadoDenuncia, string> = {
  abierta: 'Recibida',
  investigacion: 'En revisión',
  resuelta: 'Resuelta',
  rechazada: 'Descartada',
};

/** Largo máximo de la descripción (igual que en el backend). */
export const LARGO_DESCRIPCION_DENUNCIA = 500;

/** Mensajes del chat que se pueden adjuntar (igual que en el backend). */
export const MAX_MENSAJES_ADJUNTOS = 5;

export interface NuevaDenuncia {
  articuloId: number;
  origen: OrigenDenuncia;
  motivo: MotivoDenuncia;
  descripcion?: string;
  /** Solo para quien publicó: con cuál interesado. */
  conversacion?: number;
  mensajes?: number[];
}

export interface DenunciaPropia {
  id: number;
  articuloId: number | null;
  articuloTitulo: string | null;
  motivo: MotivoDenuncia;
  origen: OrigenDenuncia;
  estado: EstadoDenuncia;
  fechaDenuncia: string;
  fechaResolucion: string | null;
}

export function crearDenuncia(denuncia: NuevaDenuncia): Promise<{ id: number }> {
  return apiFetch(`${API_URL}/denuncias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(denuncia),
  }).then((r) => handle<{ id: number }>(r));
}

export function fetchMisDenuncias(): Promise<DenunciaPropia[]> {
  return apiFetch(`${API_URL}/denuncias/mias`).then((r) =>
    handle<DenunciaPropia[]>(r),
  );
}
