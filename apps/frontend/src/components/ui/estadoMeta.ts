import type { EstadoSolicitud } from '../../api/arca';

// Única fuente de verdad para el label/color de cada estado de una solicitud.
// Las etiquetas son las de la app del vecino (docs/specs/SPEC-ciclo-solicitud.md §3);
// los colores son los mismos del panel (apps/admin-web/src/components/ui/estadoMeta.ts).
export const ESTADO_META: Record<EstadoSolicitud, { label: string; cls: string }> = {
  en_revision: { label: 'En revisión', cls: 'bg-gold-100 text-gold-600' },
  requiere_modificacion: { label: 'Requiere cambios', cls: 'bg-sky-100 text-sky-600' },
  aprobada: { label: 'Aprobada', cls: 'bg-green-100 text-green-700' },
  rechazada: { label: 'Rechazada', cls: 'bg-rose-100 text-rose-600' },
  derivada: { label: 'Retiro en coordinación', cls: 'bg-green-200 text-green-800' },
  retirada: { label: 'Retirada', cls: 'bg-green-600 text-white' },
  no_realizada: { label: 'Retiro no realizado', cls: 'bg-gold-500 text-white' },
  cancelada: { label: 'Cancelada', cls: 'bg-line-2 text-slate' },
};

// Si el backend agrega un estado que esta versión de la app no conoce, se muestra
// tal cual en vez de romper la pantalla completa.
export function metaDeEstado(estado: string): { label: string; cls: string } {
  return (
    ESTADO_META[estado as EstadoSolicitud] ?? {
      label: estado.replace(/_/g, ' '),
      cls: 'bg-line-2 text-slate',
    }
  );
}
