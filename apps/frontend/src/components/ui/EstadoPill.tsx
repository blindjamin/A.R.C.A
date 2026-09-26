import type { EstadoSolicitud } from '../../api/arca';
import { metaDeEstado } from './estadoMeta';

interface EstadoPillProps {
  estado: EstadoSolicitud;
  className?: string;
}

export default function EstadoPill({ estado, className = '' }: EstadoPillProps) {
  const meta = metaDeEstado(estado);
  return <span className={`pill ${meta.cls} ${className}`.trim()}>{meta.label}</span>;
}
