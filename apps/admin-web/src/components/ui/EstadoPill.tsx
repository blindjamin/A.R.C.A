import type { EstadoSolicitud } from '../../api/admin';
import { ESTADO_META } from './estadoMeta';

interface EstadoPillProps {
  estado: EstadoSolicitud;
  className?: string;
}

export default function EstadoPill({ estado, className = '' }: EstadoPillProps) {
  const meta = ESTADO_META[estado];
  return <span className={`pill ${meta.cls} ${className}`.trim()}>{meta.label}</span>;
}
