import ExcelJS from 'exceljs';
import { EstadoSolicitudRetiro } from '../../core';
import { generarArchivoPagadas } from './exportar-pagadas';
import type { SolicitudPagada } from './pagadas-admin.service';

const pagada = (cambios: Partial<SolicitudPagada> = {}): SolicitudPagada => ({
  id: 7,
  fechaSolicitud: '2026-10-16T15:00:00.000Z',
  fechaRevision: null,
  estado: EstadoSolicitudRetiro.DERIVADA,
  residuo: 'Sofá',
  categoria: 'Muebles',
  sector: 'Bahía',
  direccion: 'Calle 1',
  monto: 15000,
  ...cambios,
});

describe('exportar-pagadas', () => {
  it('genera el CSV con encabezado, hora de Chile y etiqueta de estado', async () => {
    const archivo = await generarArchivoPagadas(
      [pagada(), pagada({ id: 8, direccion: '=cmd' })],
      'csv',
    );
    const lineas = archivo.contenido.toString('utf8').slice(1).split('\r\n');

    expect(lineas[0]).toBe(
      '"Solicitud";"Fecha solicitud";"Fecha aprobación";"Estado";"Residuo";' +
        '"Categoría";"Sector";"Dirección de retiro";"Monto"',
    );
    expect(lineas[1]).toBe(
      '"7";"2026-10-16 12:00:00";"";"Derivada";"Sofá";"Muebles";"Bahía";' +
        '"Calle 1";"15000"',
    );
    expect(lineas[2]).toContain(`"'=cmd"`);
  });

  it('deja el monto como número en el XLSX', async () => {
    const archivo = await generarArchivoPagadas([pagada()], 'xlsx');
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(archivo.contenido);
    const hoja = libro.worksheets[0];

    expect(hoja.getRow(1).getCell(8).value).toBe('Dirección de retiro');
    expect(hoja.getRow(2).getCell(9).value).toBe(15000);
  });

  it('nombra el archivo según el formato', async () => {
    const csv = await generarArchivoPagadas([pagada()], 'csv');

    expect(csv.nombre).toMatch(/^arca-pagadas-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv.tipo).toBe('text/csv; charset=utf-8');
  });
});
