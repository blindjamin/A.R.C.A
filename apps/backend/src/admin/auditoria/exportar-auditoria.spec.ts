import ExcelJS from 'exceljs';
import type { AuditoriaLog } from './auditoria-admin.service';
import {
  celdaCsv,
  fechaLocal,
  generarArchivo,
  generarCsv,
  generarXlsx,
} from './exportar-auditoria';

const log = (cambios: Partial<AuditoriaLog> = {}): AuditoriaLog => ({
  id: 7,
  usuario: 'Camila Operadora',
  rol: 'Funcionario',
  accion: 'Cambio de estado a: aprobada',
  objetoAfectado: 'Solicitud #12',
  ip: '10.0.0.1',
  createdAt: '2026-10-16T15:00:00.000Z',
  ...cambios,
});

describe('exportar-auditoria', () => {
  it('escribe la fecha en hora de Chile', () => {
    // 15:00 UTC en octubre es 12:00 en Chile (horario de verano, UTC-3).
    expect(fechaLocal('2026-10-16T15:00:00.000Z')).toBe('2026-10-16 12:00:00');
  });

  it('pone cada celda entre comillas y duplica las comillas internas', () => {
    expect(celdaCsv('hola')).toBe('"hola"');
    expect(celdaCsv('dijo "sí"; listo')).toBe('"dijo ""sí""; listo"');
    expect(celdaCsv('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
  });

  it.each(['=1+1', '+56912345678', '-2', '@SUM(A1)', '\tx', '\rx'])(
    'neutraliza la fórmula %j con un apóstrofo',
    (valor) => {
      expect(celdaCsv(valor)).toBe(`"'${valor}"`);
    },
  );

  it('genera un CSV con BOM, separador ; y saltos CRLF', () => {
    const texto = generarCsv([
      log(),
      log({ id: 8, accion: '=HYPERLINK("x")' }),
    ]).toString('utf8');

    expect(texto.startsWith('\uFEFF')).toBe(true);
    const lineas = texto.slice(1).split('\r\n');
    expect(lineas[0]).toBe(
      '"ID";"Fecha";"Usuario";"Rol";"Acción";"Objeto afectado";"IP"',
    );
    expect(lineas[1]).toBe(
      '"7";"2026-10-16 12:00:00";"Camila Operadora";"Funcionario";' +
        '"Cambio de estado a: aprobada";"Solicitud #12";"10.0.0.1"',
    );
    expect(lineas[2]).toContain(`"'=HYPERLINK(""x"")"`);
    expect(lineas[3]).toBe('');
  });

  it('genera un XLSX legible con los mismos datos como texto', async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(await generarXlsx([log({ accion: '=1+1' })]));
    const hoja = libro.worksheets[0];

    expect(hoja.getRow(1).getCell(5).value).toBe('Acción');
    expect(hoja.getRow(2).getCell(2).value).toBe('2026-10-16 12:00:00');
    // Texto, no fórmula: la celda no trae un objeto { formula }.
    expect(hoja.getRow(2).getCell(5).value).toBe('=1+1');
  });

  it('nombra el archivo según el formato', async () => {
    const csv = await generarArchivo([log()], 'csv');
    const xlsx = await generarArchivo([log()], 'xlsx');

    expect(csv.nombre).toMatch(/^arca-auditoria-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv.tipo).toBe('text/csv; charset=utf-8');
    expect(xlsx.nombre).toMatch(/\.xlsx$/);
  });
});
