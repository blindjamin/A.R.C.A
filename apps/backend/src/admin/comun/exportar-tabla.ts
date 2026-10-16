import ExcelJS from 'exceljs';

export const TIPO_CSV = 'text/csv; charset=utf-8';
export const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const ZONA_HORARIA = 'America/Santiago';

export const FORMATOS_EXPORTACION = ['csv', 'xlsx'] as const;
export type FormatoExportacion = (typeof FORMATOS_EXPORTACION)[number];

/**
 * Tope de la exportación. Es más alto que el de la vista porque el archivo se
 * revisa fuera del panel, pero no infinito: con el rango máximo de un año da
 * margen de sobra y evita armar un archivo que tumbe el proceso.
 */
export const LIMITE_EXPORTACION = 50_000;

/**
 * Columna de una tabla exportable. Un `number` queda como número en el XLSX
 * (se puede sumar); en el CSV todo sale como texto.
 */
export interface Columna<T> {
  titulo: string;
  valor: (fila: T) => string | number;
  /** Ancho en el XLSX; 20 por defecto. */
  ancho?: number;
}

/**
 * Hora de Chile como `AAAA-MM-DD hh:mm:ss`. Ese formato lo reconocen Excel,
 * LibreOffice y Google Sheets sin importar la configuración regional.
 */
export function fechaLocal(fecha: Date | string): string {
  return new Date(fecha).toLocaleString('sv-SE', { timeZone: ZONA_HORARIA });
}

/**
 * Celda de CSV entre comillas, con las comillas internas duplicadas (RFC 4180).
 *
 * Si empieza con `=`, `+`, `-`, `@`, tabulación o retorno de carro, se le
 * antepone un apóstrofo: así una hoja de cálculo la muestra como texto y no la
 * ejecuta como fórmula (inyección de CSV, OWASP). Algunos valores vienen de
 * datos que no siempre escribió un funcionario.
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
export function generarCsv<T>(columnas: Columna<T>[], filas: T[]): Buffer {
  const lineas = [
    columnas.map((c) => celdaCsv(c.titulo)).join(';'),
    ...filas.map((f) =>
      columnas.map((c) => celdaCsv(String(c.valor(f)))).join(';'),
    ),
  ];
  return Buffer.from(`\uFEFF${lineas.join('\r\n')}\r\n`, 'utf8');
}

/**
 * XLSX con los mismos datos. En un libro de Excel no hay inyección: exceljs
 * escribe cada valor como texto o número, nunca como fórmula.
 */
export async function generarXlsx<T>(
  columnas: Columna<T>[],
  filas: T[],
  nombreHoja: string,
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'A.R.C.A.';
  libro.created = new Date();

  const hoja = libro.addWorksheet(nombreHoja, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  hoja.columns = columnas.map((c) => ({
    header: c.titulo,
    width: c.ancho ?? 20,
  }));
  hoja.getRow(1).font = { bold: true };

  for (const fila of filas) {
    hoja.addRow(columnas.map((c) => c.valor(fila)));
  }
  hoja.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: filas.length + 1, column: columnas.length },
  };

  return Buffer.from(await libro.xlsx.writeBuffer());
}

export interface ArchivoExportado {
  nombre: string;
  tipo: string;
  contenido: Buffer;
}

/** Arma el archivo descargable: `<prefijo>-AAAA-MM-DD.<formato>`. */
export async function generarArchivoTabla<T>(
  prefijo: string,
  columnas: Columna<T>[],
  filas: T[],
  formato: FormatoExportacion,
  nombreHoja: string,
): Promise<ArchivoExportado> {
  const nombre = `${prefijo}-${fechaLocal(new Date()).slice(0, 10)}.${formato}`;

  return formato === 'xlsx'
    ? {
        nombre,
        tipo: TIPO_XLSX,
        contenido: await generarXlsx(columnas, filas, nombreHoja),
      }
    : { nombre, tipo: TIPO_CSV, contenido: generarCsv(columnas, filas) };
}
