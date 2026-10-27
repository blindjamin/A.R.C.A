// Capa de API del chat del Marketplace (HU-06). Los tipos espejan
// apps/backend/src/marketplace/chat/reglas-chat.ts; las fechas llegan en ISO.
//
// La conversación se identifica con un id opaco (`conversacionId`): el id del
// otro vecino nunca sale del servidor. Quien publica debe indicarlo; el
// interesado no (tiene una sola por artículo).

import { apiFetch, handle } from './arca';
import type { EstadoArticulo } from './marketplace';

const API_URL = import.meta.env.VITE_API_URL as string;

export interface MensajeChat {
  id: number;
  contenido: string;
  fecha: string;
  esMio: boolean;
  leido: boolean;
}

export interface ArticuloDelChat {
  id: number;
  titulo: string;
  estado: EstadoArticulo;
  fotoUrl: string | null;
}

export interface HistorialChat {
  articulo: ArticuloDelChat;
  /** null: el interesado todavía no escribe. */
  conversacionId: number | null;
  soyPublicador: boolean;
  /** Primer nombre del otro participante. */
  otroNombre: string;
  puedoEscribir: boolean;
  /** Ascendente por id. */
  mensajes: MensajeChat[];
  hayMas: boolean;
}

export interface ConversacionResumen {
  conversacionId: number;
  articulo: ArticuloDelChat;
  soyPublicador: boolean;
  ultimoMensaje: { contenido: string; fecha: string; esMio: boolean };
  noLeidos: number;
}

export interface MensajeEnviado {
  conversacionId: number;
  mensaje: MensajeChat;
}

/** Evento socket 'mensaje': llega a remitente y destinatario, cada uno con su `esMio`. */
export interface EventoMensaje {
  articuloId: number;
  conversacionId: number;
  mensaje: MensajeChat;
}

/** Evento socket 'leidos': el otro participante leyó todo lo que enviaste. */
export interface EventoLeidos {
  articuloId: number;
  conversacionId: number;
}

const queryConversacion = (conversacionId?: number): string =>
  conversacionId ? `?conversacion=${conversacionId}` : '';

export function listarConversaciones(): Promise<ConversacionResumen[]> {
  return apiFetch(`${API_URL}/marketplace/conversaciones`).then((r) =>
    handle<ConversacionResumen[]>(r),
  );
}

export function obtenerMensajes(
  articuloId: number,
  opciones: { conversacionId?: number; antesDe?: number } = {},
): Promise<HistorialChat> {
  const params = new URLSearchParams();
  if (opciones.conversacionId) {
    params.set('conversacion', String(opciones.conversacionId));
  }
  if (opciones.antesDe) params.set('antesDe', String(opciones.antesDe));

  return apiFetch(
    `${API_URL}/marketplace/articulos/${articuloId}/mensajes?${params}`,
  ).then((r) => handle<HistorialChat>(r));
}

export function enviarMensaje(
  articuloId: number,
  contenido: string,
  conversacionId?: number,
): Promise<MensajeEnviado> {
  return apiFetch(
    `${API_URL}/marketplace/articulos/${articuloId}/mensajes${queryConversacion(conversacionId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido }),
    },
  ).then((r) => handle<MensajeEnviado>(r));
}

export function marcarLeidos(
  articuloId: number,
  conversacionId?: number,
): Promise<{ marcados: number }> {
  return apiFetch(
    `${API_URL}/marketplace/articulos/${articuloId}/mensajes/leidos${queryConversacion(conversacionId)}`,
    { method: 'PATCH' },
  ).then((r) => handle<{ marcados: number }>(r));
}
