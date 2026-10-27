import {
  type ArticuloMarketplace,
  EstadoArticuloMarketplace,
  type MensajeMarketplace,
} from '../../core';
import { esVisiblePara, estaVencido } from '../articulo-publico';

/** Máximo de caracteres de un mensaje. */
export const LARGO_MAXIMO_MENSAJE = 1000;
/** Mensajes por página del historial. */
export const MENSAJES_POR_PAGINA = 50;
/** Caracteres del último mensaje en la bandeja. */
export const LARGO_RESUMEN = 100;

/**
 * Se puede escribir si el artículo sigue disponible y vigente, o si está
 * reservado justamente por este interesado. Retirado, completado, vencido o
 * reservado por otro vecino: solo lectura. Vale para los dos participantes.
 */
export function puedeEscribir(
  articulo: Pick<
    ArticuloMarketplace,
    'estado' | 'fechaExpiracion' | 'usuarioCompradorId'
  >,
  interesadoId: string,
  ahora: Date,
): boolean {
  return (
    (articulo.estado === EstadoArticuloMarketplace.DISPONIBLE &&
      !estaVencido(articulo, ahora)) ||
    (articulo.estado === EstadoArticuloMarketplace.EN_NEGOCIACION &&
      articulo.usuarioCompradorId === interesadoId)
  );
}

// Lista blanca: nunca el id de ningún vecino.
export interface MensajePublico {
  id: number;
  contenido: string;
  fecha: Date;
  esMio: boolean;
  leido: boolean;
}

export interface ArticuloDelChat {
  id: number;
  titulo: string;
  estado: EstadoArticuloMarketplace;
  fotoUrl: string | null;
}

export interface HistorialChat {
  articulo: ArticuloDelChat;
  /** null: el interesado todavía no escribe. */
  conversacionId: number | null;
  soyPublicador: boolean;
  puedoEscribir: boolean;
  /** Ascendente por id. */
  mensajes: MensajePublico[];
  hayMas: boolean;
}

export interface ConversacionResumen {
  conversacionId: number;
  articulo: ArticuloDelChat;
  soyPublicador: boolean;
  /** `contenido` truncado a LARGO_RESUMEN. */
  ultimoMensaje: { contenido: string; fecha: Date; esMio: boolean };
  noLeidos: number;
}

export interface MensajeEnviado {
  conversacionId: number;
  mensaje: MensajePublico;
}

export function aMensajePublico(
  m: MensajeMarketplace,
  ciudadanoId: string,
): MensajePublico {
  return {
    id: m.id,
    contenido: m.contenido,
    fecha: m.fechaMensaje,
    esMio: m.usuarioRemitenteId === ciudadanoId,
    leido: m.leido,
  };
}

/** La foto va null si el endpoint de la foto le daría 404 a este vecino. */
export function aArticuloDelChat(
  a: ArticuloMarketplace,
  ciudadanoId: string,
  ahora: Date,
): ArticuloDelChat {
  return {
    id: a.id,
    titulo: a.titulo,
    estado: a.estado,
    fotoUrl:
      a.fotoPath && esVisiblePara(a, ciudadanoId, ahora)
        ? `/api/marketplace/articulos/${a.id}/foto`
        : null,
  };
}

/** 'mensaje': a remitente y destinatario, cada uno con su `esMio`. */
export interface EventoMensaje {
  articuloId: number;
  conversacionId: number;
  mensaje: MensajePublico;
}

/** 'leidos': al OTRO participante; significa "leyeron todo lo que enviaste en esta conversación". */
export interface EventoLeidos {
  articuloId: number;
  conversacionId: number;
}
