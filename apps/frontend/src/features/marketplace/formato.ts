import type { EstadoArticulo, TipoArticulo } from '../../api/marketplace';

// Presentación del Marketplace compartida entre pantallas. Separado de
// components/ui/estadoMeta.ts porque aquel describe estados de solicitudes.

export const ESTADO_ARTICULO_META: Record<
  EstadoArticulo,
  { etiqueta: string; clase: string }
> = {
  pendiente_aprobacion: {
    etiqueta: 'En revisión municipal',
    clase: 'bg-amber-100 text-amber-800 border border-amber-300',
  },
  disponible: { etiqueta: 'Disponible', clase: 'bg-green-100 text-green-700' },
  en_negociacion: { etiqueta: 'En negociación', clase: 'bg-sky-100 text-sky-600' },
  retirado: { etiqueta: 'Retirado', clase: 'bg-line-2 text-slate' },
  completado: { etiqueta: 'Completado', clase: 'bg-gold-100 text-gold-600' },
  rechazado: {
    etiqueta: 'Rechazado por moderación',
    clase: 'bg-rose-100 text-rose-700 border border-rose-300',
  },
};

export function metaDeEstadoArticulo(estado: EstadoArticulo): { etiqueta: string; clase: string } {
  return (
    ESTADO_ARTICULO_META[estado] ?? {
      etiqueta: estado ? String(estado).replace(/_/g, ' ') : 'Desconocido',
      clase: 'bg-stone-100 text-stone-700',
    }
  );
}

export const TIPO_ARTICULO_META: Record<
  TipoArticulo,
  { etiqueta: string; clase: string }
> = {
  regalo: { etiqueta: 'Regalo', clase: 'bg-gold-100 text-gold-700' },
  intercambio: { etiqueta: 'Intercambio', clase: 'bg-green-100 text-green-700' },
};

export function metaDeTipoArticulo(tipo: string): { etiqueta: string; clase: string } {
  const meta = TIPO_ARTICULO_META[tipo as TipoArticulo];
  if (meta) return meta;
  return {
    etiqueta: tipo ?? 'Artículo',
    clase: 'bg-stone-100 text-stone-700',
  };
}

const DIA_MS = 86_400_000;

/** "hoy", "ayer", "hace 3 días", o la fecha si pasó más de un mes. */
export function haceCuanto(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / DIA_MS);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  return `el ${new Date(iso).toLocaleDateString('es-CL')}`;
}

/** El mensaje del backend dentro de "Error 400: {...}" (ver `handle`); si no hay, el texto tal cual. */
export function mensajeDeError(e: unknown): string {
  const texto = (e as Error).message.replace(/^Error \d+: /, '');
  try {
    const { message } = JSON.parse(texto) as { message?: string | string[] };
    return [message].flat().join(' ') || texto;
  } catch {
    return texto;
  }
}
