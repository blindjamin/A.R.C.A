import ExcelJS from 'exceljs';
import {
  EstadoPagoSolicitud,
  type LoteDerivacion,
  type SolicitudRetiro,
} from '@arca/core';

const ETIQUETA_PAGO: Record<EstadoPagoSolicitud, string> = {
  [EstadoPagoSolicitud.NO_APLICA]: 'Sin cobro',
  [EstadoPagoSolicitud.PENDIENTE]: 'Pendiente',
  [EstadoPagoSolicitud.PAGADO]: 'Pagado',
};

// Excel no guarda zona horaria: se escribe la hora local del servidor para que
// la empresa vea la misma hora que el panel, no la hora UTC.
const aHoraLocal = (fecha: Date | string | null): Date | null => {
  if (!fecha) return null;
  const d = new Date(fecha);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
};

const aNumero = (valor: string | null): number | null =>
  valor === null ? null : Number(valor);

/**
 * Arma el Excel de un lote (spec `derivacion-excel` §2.2).
 *
 * Sin fotos y sin identificador del vecino: la empresa necesita saber qué
 * retirar y dónde, no quién lo pidió. Las columnas con datos personales nuevos
 * se agregan solo con `datos-retiro` y de forma deliberada.
 */
export async function generarExcelLote(
  lote: LoteDerivacion,
  solicitudes: SolicitudRetiro[],
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'A.R.C.A.';
  libro.created = new Date();

  const hoja = libro.addWorksheet(`Lote ${lote.id}`, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const fecha = { numFmt: 'dd-mm-yyyy hh:mm' };

  hoja.columns = [
    { header: 'Lote', key: 'lote', width: 8 },
    { header: 'Solicitud', key: 'solicitud', width: 10 },
    {
      header: 'Fecha solicitud',
      key: 'fechaSolicitud',
      width: 18,
      style: fecha,
    },
    {
      header: 'Fecha aprobación',
      key: 'fechaAprobacion',
      width: 18,
      style: fecha,
    },
    { header: 'Residuo', key: 'residuo', width: 28 },
    { header: 'Categoría', key: 'categoria', width: 16 },
    { header: 'Instrucciones de recogida', key: 'instrucciones', width: 36 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
    { header: 'Dirección', key: 'direccion', width: 36 },
    { header: 'Latitud', key: 'latitud', width: 13 },
    { header: 'Longitud', key: 'longitud', width: 13 },
    { header: 'Pago', key: 'pago', width: 12 },
    { header: 'Monto', key: 'monto', width: 12, style: { numFmt: '"$"#,##0' } },
  ];
  hoja.getRow(1).font = { bold: true };

  for (const s of solicitudes) {
    hoja.addRow({
      lote: lote.id,
      solicitud: s.id,
      fechaSolicitud: aHoraLocal(s.fechaSolicitud),
      fechaAprobacion: aHoraLocal(s.fechaRevision),
      residuo: s.residuoCatalogo?.nombre ?? `Residuo ${s.residuoCatalogoId}`,
      categoria: s.residuoCatalogo?.categoria ?? null,
      instrucciones: s.residuoCatalogo?.instruccionesRecogida ?? null,
      descripcion: s.descripcion,
      direccion: s.direccionAnonimizada,
      latitud: aNumero(s.latitudCapturada),
      longitud: aNumero(s.longitudCapturada),
      pago: ETIQUETA_PAGO[s.estadoPago],
      monto: s.monto,
    });
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
}
