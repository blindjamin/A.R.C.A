import {
  DIAS_MAXIMO_REPORTE,
  calcularReporte,
  diasDelRango,
} from './calcular-reporte';

describe('reporte por fechas', () => {
  it('rechaza un rango invertido o más largo que un año', () => {
    expect(diasDelRango('2026-11-08', '2026-11-01')).toBeNull();
    expect(diasDelRango('2026-01-01', '2027-01-02')).toBe(DIAS_MAXIMO_REPORTE + 1);
    expect(diasDelRango('2026-11-01', '2026-11-01')).toBe(1);
  });

  it('cuenta retiros, objetos y monto del rango, sin datos de personas', () => {
    const reporte = calcularReporte(
      [
        {
          fechaSolicitud: new Date('2026-11-02T15:00:00'),
          monto: 4000,
          objetos: [
            { categoria: 'Electrónicos', cantidad: 2 },
            { categoria: null, cantidad: 1 },
          ],
        },
        {
          fechaSolicitud: new Date('2026-10-01T15:00:00'),
          monto: 9000,
          objetos: [{ categoria: 'Electrónicos', cantidad: 5 }],
        },
        {
          fechaSolicitud: new Date('2026-11-08T08:00:00'),
          monto: null,
          objetos: [],
        },
      ],
      '2026-11-01',
      '2026-11-08',
    );

    expect(reporte).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-08',
      retiros: 2,
      monto: 4000,
      porCategoria: [
        { categoria: 'Electrónicos', objetos: 2 },
        { categoria: 'Sin categoría', objetos: 2 },
      ],
    });
    expect(JSON.stringify(reporte)).not.toMatch(/vecino|direccion|rut/i);
  });
});
