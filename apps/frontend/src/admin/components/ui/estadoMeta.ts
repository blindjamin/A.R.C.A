import type { EstadoSolicitud } from '../../api/admin';

// Única fuente de verdad para el label/color de cada estado de una solicitud.
// Antes vivía duplicado en MisSolicitudes.tsx y AdminSolicitudes.tsx.
// Las etiquetas son las del panel; la app del vecino usa textos propios
// (docs/specs/SPEC-ciclo-solicitud.md §3).
export const ESTADO_META: Record<EstadoSolicitud, { label: string; cls: string }> = {
  en_revision: { label: 'En revisión', cls: 'bg-gold-100 text-gold-600' },
  requiere_modificacion: { label: 'Modificación pedida', cls: 'bg-sky-100 text-sky-600' },
  aprobada: { label: 'Aprobada', cls: 'bg-green-100 text-green-700' },
  rechazada: { label: 'Rechazada', cls: 'bg-rose-100 text-rose-600' },
  derivada: { label: 'Derivada', cls: 'bg-green-200 text-green-800' },
  retirada: { label: 'Retirada', cls: 'bg-green-600 text-white' },
  no_realizada: { label: 'No realizada', cls: 'bg-gold-500 text-white' },
  cancelada: { label: 'Cancelada', cls: 'bg-line-2 text-slate' },
};
