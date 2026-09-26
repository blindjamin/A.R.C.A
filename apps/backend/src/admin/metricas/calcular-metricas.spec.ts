import { EstadoPagoSolicitud, EstadoSolicitudRetiro } from '@arca/core';
import {
  calcularMetricas,
  type FilaSolicitudMetrica,
} from './calcular-metricas';

const AHORA = new Date(2026, 8, 17, 12, 0, 0);
const haceHoras = (h: number) => new Date(AHORA.getTime() - h * 3600_000);
const haceDias = (d: number) => haceHoras(d * 24);

const solicitud = (
  id: number,
  cambios: Partial<FilaSolicitudMetrica> = {},
): FilaSolicitudMetrica => ({
  id,
  estado: EstadoSolicitudRetiro.EN_REVISION,
  estadoPago: EstadoPagoSolicitud.NO_APLICA,
  monto: null,
  fechaSolicitud: haceHoras(1),
  fechaCierre: null,
  categoria: 'Muebles',
  ...cambios,
});

describe('calcularMetricas', () => {
  it('cuenta las recibidas en el rango y arma una serie con un punto por día', () => {
    const m = calcularMetricas(
      {
        solicitudes: [
          solicitud(1),
          solicitud(2, { fechaSolicitud: haceDias(3) }),
          solicitud(3, { fechaSolicitud: haceDias(40) }),
        ],
        revisiones: [],
        lotes: [],
      },
      7,
      AHORA,
    );

    expect(m.recibidas).toBe(2);
    expect(m.serieDiaria).toHaveLength(7);
    expect(m.serieDiaria.at(-1)).toEqual({ fecha: '2026-09-17', total: 1 });
    expect(m.serieDiaria.reduce((t, p) => t + p.total, 0)).toBe(2);
  });

  it('la cola es la actual, sin importar el rango, y marca las de más de 48 h', () => {
    const m = calcularMetricas(
      {
        solicitudes: [
          solicitud(1),
          solicitud(2, { fechaSolicitud: haceHoras(50) }),
          solicitud(3, { fechaSolicitud: haceDias(40) }),
          solicitud(4, { estado: EstadoSolicitudRetiro.APROBADA }),
        ],
        revisiones: [],
        lotes: [],
      },
      7,
      AHORA,
    );

    expect(m.cola).toEqual({ enRevision: 3, atrasadas: 2 });
  });

  it('promedia la espera hasta la primera decisión y cuenta decisiones y motivos', () => {
    const m = calcularMetricas(
      {
        solicitudes: [
          solicitud(1, { fechaSolicitud: haceHoras(30) }),
          solicitud(2, { fechaSolicitud: haceHoras(20) }),
        ],
        revisiones: [
          // #1: primera decisión 10 h después; la segunda no cuenta para la espera.
          {
            solicitudRetiroId: 1,
            decision: 'requiere_modificacion',
            motivo: 'foto_insuficiente',
            createdAt: haceHoras(20),
          },
          {
            solicitudRetiroId: 1,
            decision: 'aprobada',
            motivo: null,
            createdAt: haceHoras(2),
          },
          // #2: 20 h después.
          {
            solicitudRetiroId: 2,
            decision: 'rechazada',
            motivo: 'duplicada',
            createdAt: haceHoras(0),
          },
        ],
        lotes: [],
      },
      30,
      AHORA,
    );

    expect(m.horasPromedioRevision).toBe(15);
    expect(m.decisiones).toEqual({
      aprobada: 1,
      requiere_modificacion: 1,
      rechazada: 1,
    });
    expect(m.motivos).toEqual([
      { motivo: 'duplicada', total: 1 },
      { motivo: 'foto_insuficiente', total: 1 },
    ]);
  });

  it('agrupa por categoría, suma derivación, cierres y recaudación', () => {
    const m = calcularMetricas(
      {
        solicitudes: [
          solicitud(1, {
            estado: EstadoSolicitudRetiro.RETIRADA,
            fechaCierre: haceHoras(5),
            estadoPago: EstadoPagoSolicitud.PAGADO,
            monto: 2000,
          }),
          solicitud(2, {
            estado: EstadoSolicitudRetiro.NO_REALIZADA,
            fechaCierre: haceHoras(5),
            categoria: 'Electrónica',
          }),
          solicitud(3, {
            estadoPago: EstadoPagoSolicitud.PENDIENTE,
            monto: 900,
          }),
        ],
        revisiones: [],
        lotes: [
          { cantidad: 2, createdAt: haceDias(1) },
          { cantidad: 4, createdAt: haceDias(60) },
        ],
      },
      30,
      AHORA,
    );

    expect(m.porCategoria).toEqual([
      { categoria: 'Muebles', total: 2 },
      { categoria: 'Electrónica', total: 1 },
    ]);
    expect(m.derivacion).toEqual({
      lotes: 1,
      derivadas: 2,
      retiradas: 1,
      noRealizadas: 1,
    });
    expect(m.recaudacion).toBe(2000);
  });

  it('sin decisiones el promedio es null', () => {
    const m = calcularMetricas(
      { solicitudes: [], revisiones: [], lotes: [] },
      90,
      AHORA,
    );

    expect(m.horasPromedioRevision).toBeNull();
    expect(m.serieDiaria).toHaveLength(90);
  });
});
