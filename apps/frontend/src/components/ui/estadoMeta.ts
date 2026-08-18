import type { EstadoSolicitud } from '../../api/arca';

// Única fuente de verdad para el label/color de cada estado de una solicitud.
// Antes vivía duplicado en MisSolicitudes.tsx y AdminSolicitudes.tsx.
export const ESTADO_META: Record<EstadoSolicitud, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-gold-100 text-gold-600' },
  asignada: { label: 'Asignada', cls: 'bg-sky-100 text-sky-600' },
  en_proceso: { label: 'En ruta', cls: 'bg-green-100 text-green-700' },
  completada: { label: 'Completada', cls: 'bg-green-600 text-white' },
  cancelada: { label: 'Cancelada', cls: 'bg-line-2 text-slate' },
};
