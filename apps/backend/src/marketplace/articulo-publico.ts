import {
  type ArticuloMarketplace,
  EstadoArticuloMarketplace,
  type TipoArticuloMarketplace,
} from '../core';
import { creditosPorEntrega } from '../creditos/reglas-creditos';
import type {
  BandaDistancia,
  Coordenadas,
} from './ubicacion/ubicacion-marketplace';

/**
 * Nombre que se muestra de quien publica hasta que se guarde el nombre real
 * de ClaveÚnica (spec `marketplace`, decisión 5; toca el núcleo y HU-38).
 */
export const NOMBRE_PUBLICADOR_PROVISORIO = 'Vecino de Santo Domingo';

/** Días que un artículo queda publicado antes de vencer. */
export const DIAS_VIGENCIA_ARTICULO = 30;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface Reputacion {
  /** Promedio de 1 a 5 con un decimal; null si nunca lo han calificado. */
  calificacionPromedio: number | null;
  cantidadCalificaciones: number;
}

const SIN_CALIFICACIONES: Reputacion = {
  calificacionPromedio: null,
  cantidadCalificaciones: 0,
};

/**
 * Lo que la API muestra de un artículo: el contrato de
 * `apps/frontend/src/api/marketplace.ts` más los campos de la spec §5.3.
 * Nunca la coordenada, la ruta de la foto ni el id de ningún vecino.
 */
export interface ArticuloPublico {
  id: number;
  tipo: TipoArticuloMarketplace;
  titulo: string;
  descripcion: string | null;
  estado: EstadoArticuloMarketplace;
  residuoCatalogoId: number;
  categoria: string;
  fotoUrl: string | null;
  creditos: number;
  banda: BandaDistancia | null;
  publicador: { nombre: string } & Reputacion;
  esPropio: boolean;
  fechaPublicacion: Date;
  fechaExpiracion: Date;
  soyReceptor: boolean;
  puedoCalificar: boolean;
}

export interface ContextoPresentacion {
  ciudadanoId: string;
  banda: BandaDistancia | null;
  reputacion?: Reputacion;
  /** La sesión ya calificó este artículo. */
  yaCalifico?: boolean;
}

export function fechaExpiracionDesde(publicacion: Date): Date {
  return new Date(publicacion.getTime() + DIAS_VIGENCIA_ARTICULO * MS_POR_DIA);
}

export function estaVencido(
  articulo: Pick<ArticuloMarketplace, 'fechaExpiracion'>,
  ahora: Date,
): boolean {
  return articulo.fechaExpiracion.getTime() <= ahora.getTime();
}

/**
 * Un artículo disponible y vigente lo ve cualquier vecino; en cualquier otro
 * caso, solo quien lo publicó y quien lo reservó (spec §4).
 */
export function esVisiblePara(
  articulo: Pick<
    ArticuloMarketplace,
    'estado' | 'fechaExpiracion' | 'usuarioPublicadorId' | 'usuarioCompradorId'
  >,
  ciudadanoId: string,
  ahora: Date,
): boolean {
  if (
    articulo.estado === EstadoArticuloMarketplace.DISPONIBLE &&
    !estaVencido(articulo, ahora)
  ) {
    return true;
  }
  return (
    articulo.usuarioPublicadorId === ciudadanoId ||
    articulo.usuarioCompradorId === ciudadanoId
  );
}

/** Coordenada guardada del artículo (ya aproximada), o null si no tiene. */
export function coordenadasDe(
  articulo: Pick<ArticuloMarketplace, 'latitud' | 'longitud'>,
): Coordenadas | null {
  if (articulo.latitud === null || articulo.longitud === null) return null;
  return {
    latitud: Number(articulo.latitud),
    longitud: Number(articulo.longitud),
  };
}

/** Promedio y cantidad de estrellas por vecino calificado. */
export function calcularReputaciones(
  calificaciones: { usuarioCalificadoId: string; puntuacion: number }[],
): Map<string, Reputacion> {
  const sumas = new Map<string, { suma: number; cantidad: number }>();
  for (const { usuarioCalificadoId, puntuacion } of calificaciones) {
    const actual = sumas.get(usuarioCalificadoId) ?? { suma: 0, cantidad: 0 };
    sumas.set(usuarioCalificadoId, {
      suma: actual.suma + puntuacion,
      cantidad: actual.cantidad + 1,
    });
  }

  const reputaciones = new Map<string, Reputacion>();
  for (const [id, { suma, cantidad }] of sumas) {
    reputaciones.set(id, {
      calificacionPromedio: Math.round((suma / cantidad) * 10) / 10,
      cantidadCalificaciones: cantidad,
    });
  }
  return reputaciones;
}

export function aArticuloPublico(
  articulo: ArticuloMarketplace,
  contexto: ContextoPresentacion,
): ArticuloPublico {
  const soyReceptor = articulo.usuarioCompradorId === contexto.ciudadanoId;

  return {
    id: articulo.id,
    tipo: articulo.tipo,
    titulo: articulo.titulo,
    descripcion: articulo.descripcion,
    estado: articulo.estado,
    residuoCatalogoId: articulo.residuoCatalogoId,
    categoria: articulo.residuoCatalogo.categoria,
    fotoUrl: articulo.fotoPath
      ? `/api/marketplace/articulos/${articulo.id}/foto`
      : null,
    creditos: creditosPorEntrega(),
    banda: contexto.banda,
    publicador: {
      nombre: NOMBRE_PUBLICADOR_PROVISORIO,
      ...(contexto.reputacion ?? SIN_CALIFICACIONES),
    },
    esPropio: articulo.usuarioPublicadorId === contexto.ciudadanoId,
    fechaPublicacion: articulo.fechaPublicacion,
    fechaExpiracion: articulo.fechaExpiracion,
    soyReceptor,
    puedoCalificar:
      soyReceptor &&
      articulo.estado === EstadoArticuloMarketplace.COMPLETADO &&
      !contexto.yaCalifico,
  };
}
