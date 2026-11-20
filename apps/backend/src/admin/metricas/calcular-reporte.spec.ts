import { EstadoPagoSolicitud, EstadoSolicitudRetiro } from '../../core';
import {
  DIAS_MAXIMO_REPORTE,
  calcularReporte,
  diasDelRango,
} from './calcular-reporte';

describe('reporte por fechas', () => {
  it('rechaza un rango invertido o más largo que un año', () => {
    expect(diasDelRango('2026-11-08', '2026-11-01')).toBeNull();
    expect(diasDelRango('2026-01-01', '2027-01-02')).toBe(
      DIAS_MAXIMO_REPORTE + 1,
    );
    expect(diasDelRango('2026-11-01', '2026-11-01')).toBe(1);
  });

  it('separa recibidas, retiros realizados y monto pagado', () => {
    const reporte = calcularReporte(
      [
        {
          fechaSolicitud: new Date('2026-11-02T15:00:00'),
          estado: EstadoSolicitudRetiro.APROBADA,
          estadoPago: EstadoPagoSolicitud.PAGADO,
          monto: 4000,
          objetos: [
            { categoria: 'Electrónicos', cantidad: 2 },
            { categoria: null, cantidad: 1 },
          ],
        },
        {
          fechaSolicitud: new Date('2026-10-01T15:00:00'),
          estado: EstadoSolicitudRetiro.RETIRADA,
          estadoPago: EstadoPagoSolicitud.PAGADO,
          monto: 9000,
          objetos: [{ categoria: 'Electrónicos', cantidad: 5 }],
        },
        {
          fechaSolicitud: new Date('2026-11-08T08:00:00'),
          estado: EstadoSolicitudRetiro.RETIRADA,
          estadoPago: EstadoPagoSolicitud.NO_APLICA,
          monto: null,
          objetos: [],
        },
        {
          fechaSolicitud: new Date('2026-11-03T08:00:00'),
          estado: EstadoSolicitudRetiro.RECHAZADA,
          estadoPago: EstadoPagoSolicitud.PENDIENTE,
          monto: 1500,
          objetos: [{ categoria: 'Muebles', cantidad: 1 }],
        },
      ],
      '2026-11-01',
      '2026-11-08',
    );

    expect(reporte).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-08',
      solicitudesRecibidas: 3,
      retiros: 1,
      monto: 4000,
      porCategoria: [
        { categoria: 'Electrónicos', objetos: 2 },
        { categoria: 'Sin categoría', objetos: 2 },
        { categoria: 'Muebles', objetos: 1 },
      ],
    });
    expect(JSON.stringify(reporte)).not.toMatch(/vecino|direccion|rut/i);
  });
});
