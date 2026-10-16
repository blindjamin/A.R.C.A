import {
  type ArchivoExportado,
  type Columna,
  fechaLocal,
  type FormatoExportacion,
  generarArchivoTabla,
} from '../comun/exportar-tabla';
import type { AuditoriaLog } from './auditoria-admin.service';

export const COLUMNAS_AUDITORIA: Columna<AuditoriaLog>[] = [
  { titulo: 'ID', valor: (l) => String(l.id) },
  { titulo: 'Fecha', valor: (l) => fechaLocal(l.createdAt) },
  { titulo: 'Usuario', valor: (l) => l.usuario },
  { titulo: 'Rol', valor: (l) => l.rol },
  { titulo: 'Acción', valor: (l) => l.accion, ancho: 40 },
  { titulo: 'Objeto afectado', valor: (l) => l.objetoAfectado, ancho: 40 },
  { titulo: 'IP', valor: (l) => l.ip },
];

export function generarArchivo(
  logs: AuditoriaLog[],
  formato: FormatoExportacion,
): Promise<ArchivoExportado> {
  return generarArchivoTabla(
    'arca-auditoria',
    COLUMNAS_AUDITORIA,
    logs,
    formato,
    'Auditoría',
  );
}
