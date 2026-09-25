import type { EstadoArticulo, TipoArticulo } from '../../api/marketplace';

// Presentación del Marketplace compartida entre pantallas. Separado de
// components/ui/estadoMeta.ts porque aquel describe estados de solicitudes.

export const ESTADO_ARTICULO_META: Record<
  EstadoArticulo,
  { etiqueta: string; clase: string }
> = {
  disponible: { etiqueta: 'Disponible', clase: 'bg-green-100 text-green-700' },
  en_negociacion: { etiqueta: 'En negociación', clase: 'bg-sky-100 text-sky-600' },
  retirado: { etiqueta: 'Retirado', clase: 'bg-line-2 text-slate' },
  completado: { etiqueta: 'Completado', clase: 'bg-gold-100 text-gold-600' },
};

export const TIPO_ARTICULO_META: Record<
  TipoArticulo,
  { etiqueta: string; clase: string }
> = {
  regalo: { etiqueta: '🎁 Regalo', clase: 'bg-gold-100 text-gold-600' },
  intercambio: { etiqueta: '🔄 Intercambio', clase: 'bg-green-100 text-green-700' },
};

const DIA_MS = 86_400_000;

/** "hoy", "ayer", "hace 3 días", o la fecha si pasó más de un mes. */
export function haceCuanto(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / DIA_MS);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  return `el ${new Date(iso).toLocaleDateString('es-CL')}`;
}
