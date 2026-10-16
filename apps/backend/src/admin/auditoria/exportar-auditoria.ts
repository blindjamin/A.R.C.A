import ExcelJS from 'exceljs';
import type { FormatoExportacion } from './dto/filtro-auditoria.dto';
import type { AuditoriaLog } from './auditoria-admin.service';

export const TIPO_CSV = 'text/csv; charset=utf-8';
export const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ZONA_HORARIA = 'America/Santiago';

const COLUMNAS: { titulo: string; valor: (log: AuditoriaLog) => string }[] = [
  { titulo: 'ID', valor: (l) => String(l.id) },
  { titulo: 'Fecha', valor: (l) => fechaLocal(l.createdAt) },
  { titulo: 'Usuario', valor: (l) => l.usuario },
  { titulo: 'Rol', valor: (l) => l.rol },
  { titulo: 'Acción', valor: (l) => l.accion },
  { titulo: 'Objeto afectado', valor: (l) => l.objetoAfectado },
  { titulo: 'IP', valor: (l) => l.ip },
];

/**
 * Hora de Chile como `AAAA-MM-DD hh:mm:ss`. Ese formato lo reconocen Excel,
 * LibreOffice y Google Sheets sin importar la configuración regional.
 */
export function fechaLocal(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', { timeZone: ZONA_HORARIA });
}

/**
 * Celda de CSV entre comillas, con las comillas internas duplicadas (RFC 4180).
 *
 * Si empieza con `=`, `+`, `-`, `@`, tabulación o retorno de carro, se le
 * antepone un apóstrofo: así una hoja de cálculo la muestra como texto y no la
 * ejecuta como fórmula (inyección de CSV, OWASP). La columna Acción incluye
 * valores guardados en `datos_nuevos`, que no siempre escribió un funcionario.
 */
export function celdaCsv(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return `"${seguro.replace(/"/g, '""')}"`;
}

/**
 * CSV con BOM UTF-8, separador `;` y saltos CRLF: es lo que Excel en español
 * abre directo, con tildes y columnas bien separadas. LibreOffice y Google
 * Sheets lo leen igual.
 */
export function generarCsv(logs: AuditoriaLog[]): Buffer {
  const lineas = [
    COLUMNAS.map((c) => celdaCsv(c.titulo)).join(';'),
    ...logs.map((log) => COLUMNAS.map((c) => celdaCsv(c.valor(log))).join(';')),
  ];
  return Buffer.from(`\uFEFF${lineas.join('\r\n')}\r\n`, 'utf8');
}

/**
 * XLSX con los mismos datos. En un libro de Excel no hay inyección: exceljs
 * escribe cada valor como texto, nunca como fórmula.
 */
export async function generarXlsx(logs: AuditoriaLog[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'A.R.C.A.';
  libro.created = new Date();

  const hoja = libro.addWorksheet('Auditoría', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  hoja.columns = COLUMNAS.map((c) => ({
    header: c.titulo,
    width: c.titulo === 'Acción' || c.titulo === 'Objeto afectado' ? 40 : 20,
  }));
  hoja.getRow(1).font = { bold: true };

  for (const log of logs) {
    hoja.addRow(COLUMNAS.map((c) => c.valor(log)));
  }
  hoja.autoFilter = { from: 'A1', to: `G${logs.length + 1}` };

  return Buffer.from(await libro.xlsx.writeBuffer());
}

export interface ArchivoAuditoria {
  nombre: string;
  tipo: string;
  contenido: Buffer;
}

export async function generarArchivo(
  logs: AuditoriaLog[],
  formato: FormatoExportacion,
): Promise<ArchivoAuditoria> {
  const fecha = fechaLocal(new Date().toISOString()).slice(0, 10);
  const nombre = `arca-auditoria-${fecha}.${formato}`;

  return formato === 'xlsx'
    ? { nombre, tipo: TIPO_XLSX, contenido: await generarXlsx(logs) }
    : { nombre, tipo: TIPO_CSV, contenido: generarCsv(logs) };
}
