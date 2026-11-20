import { EstadoSolicitudRetiro } from '../../core';
import {
  type ArchivoExportado,
  type Columna,
  fechaLocal,
  type FormatoExportacion,
  generarArchivoTabla,
} from '../comun/exportar-tabla';
import type { SolicitudPagada } from './pagadas-admin.service';

// Mismas etiquetas que `ESTADO_META` del panel; si cambian allá, cambiar aquí.
const ETIQUETA_ESTADO: Record<EstadoSolicitudRetiro, string> = {
  [EstadoSolicitudRetiro.EN_REVISION]: 'En revisión',
  [EstadoSolicitudRetiro.REQUIERE_MODIFICACION]: 'Modificación pedida',
  [EstadoSolicitudRetiro.APROBADA]: 'Aprobada',
  [EstadoSolicitudRetiro.RECHAZADA]: 'Rechazada',
  [EstadoSolicitudRetiro.DERIVADA]: 'Derivada',
  [EstadoSolicitudRetiro.RETIRADA]: 'Retirada',
  [EstadoSolicitudRetiro.NO_REALIZADA]: 'No realizada',
  [EstadoSolicitudRetiro.CANCELADA]: 'Cancelada',
};

export const COLUMNAS_PAGADAS: Columna<SolicitudPagada>[] = [
  { titulo: 'Solicitud', valor: (s) => s.id, ancho: 10 },
  { titulo: 'Fecha solicitud', valor: (s) => fechaLocal(s.fechaSolicitud) },
  {
    titulo: 'Fecha aprobación',
    valor: (s) => (s.fechaRevision ? fechaLocal(s.fechaRevision) : ''),
  },
  { titulo: 'Estado', valor: (s) => ETIQUETA_ESTADO[s.estado] },
  { titulo: 'Residuo', valor: (s) => s.residuo, ancho: 28 },
  { titulo: 'Categoría', valor: (s) => s.categoria },
  { titulo: 'Sector', valor: (s) => s.sector },
  { titulo: 'Dirección de retiro', valor: (s) => s.direccion, ancho: 40 },
  { titulo: 'Monto', valor: (s) => s.monto ?? '' },
];

export function generarArchivoPagadas(
  filas: SolicitudPagada[],
  formato: FormatoExportacion,
): Promise<ArchivoExportado> {
  return generarArchivoTabla(
    'arca-pagadas',
    COLUMNAS_PAGADAS,
    filas,
    formato,
    'Pagadas',
  );
}
