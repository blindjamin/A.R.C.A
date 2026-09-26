import { EstadoPagoSolicitud, EstadoSolicitudRetiro } from '@arca/core';

// Cálculo de indicadores del panel (docs/specs/SPEC-dashboard-metricas.md).
// Función pura: recibe filas con columnas mínimas y devuelve solo agregados.

export const RANGOS_DIAS = [7, 30, 90] as const;
export type RangoDias = (typeof RANGOS_DIAS)[number];

const HORAS_ATRASO = 48;
const MS_HORA = 60 * 60 * 1000;

export interface FilaSolicitudMetrica {
  id: number;
  estado: EstadoSolicitudRetiro;
  estadoPago: EstadoPagoSolicitud;
  monto: number | null;
  fechaSolicitud: Date;
  fechaCierre: Date | null;
  categoria: string | null;
}

export interface FilaRevisionMetrica {
  solicitudRetiroId: number;
  decision: string;
  motivo: string | null;
  createdAt: Date;
}

export interface FilaLoteMetrica {
  cantidad: number;
  createdAt: Date;
}

export interface Metricas {
  dias: RangoDias;
  desde: string;
  hasta: string;
  recibidas: number;
  serieDiaria: { fecha: string; total: number }[];
  cola: { enRevision: number; atrasadas: number };
  /** Desde la solicitud hasta su primera decisión; `null` si no hubo decisiones. */
  horasPromedioRevision: number | null;
  decisiones: Record<string, number>;
  motivos: { motivo: string; total: number }[];
  porCategoria: { categoria: string; total: number }[];
  derivacion: {
    lotes: number;
    derivadas: number;
    retiradas: number;
    noRealizadas: number;
  };
  /** Maqueta de pago: montos pagados de las solicitudes recibidas en el rango. */
  recaudacion: number;
}

/** Fecha local `AAAA-MM-DD`, para agrupar por día como lo ve el funcionario. */
const diaLocal = (fecha: Date): string => {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const contar = <T>(items: T[], clave: (item: T) => string | null) => {
  const conteo = new Map<string, number>();
  for (const item of items) {
    const k = clave(item);
    if (k) conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  return conteo;
};

const ordenado = <K extends string>(conteo: Map<string, number>, campo: K) =>
  [...conteo.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(
      ([valor, total]) =>
        ({ [campo]: valor, total }) as Record<K, string> & { total: number },
    );

export function calcularMetricas(
  entrada: {
    solicitudes: FilaSolicitudMetrica[];
    revisiones: FilaRevisionMetrica[];
    lotes: FilaLoteMetrica[];
  },
  dias: RangoDias,
  ahora: Date,
): Metricas {
  // El rango incluye el día de hoy completo y los `dias - 1` anteriores.
  const inicio = new Date(ahora);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - (dias - 1));

  // Sin tope superior: hasta que se corrija la zona horaria de la conexión, las
  // columnas con DEFAULT CURRENT_TIMESTAMP se leen unas horas "en el futuro" y
  // quedarían fuera del rango (spec §5.2).
  const enRango = (fecha: Date | null) => !!fecha && new Date(fecha) >= inicio;

  const recibidas = entrada.solicitudes.filter((s) =>
    enRango(s.fechaSolicitud),
  );

  const serie = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    serie.set(diaLocal(d), 0);
  }
  for (const s of recibidas) {
    const dia = diaLocal(s.fechaSolicitud);
    if (serie.has(dia)) serie.set(dia, (serie.get(dia) ?? 0) + 1);
  }

  const enRevision = entrada.solicitudes.filter(
    (s) => s.estado === EstadoSolicitudRetiro.EN_REVISION,
  );
  const atrasadas = enRevision.filter(
    (s) =>
      ahora.getTime() - new Date(s.fechaSolicitud).getTime() >
      HORAS_ATRASO * MS_HORA,
  ).length;

  // Primera decisión de cada solicitud: las siguientes (tras una modificación)
  // no miden cuánto esperó el vecino la primera respuesta.
  const primeraDecision = new Map<number, Date>();
  for (const r of entrada.revisiones) {
    const actual = primeraDecision.get(r.solicitudRetiroId);
    if (!actual || new Date(r.createdAt) < actual) {
      primeraDecision.set(r.solicitudRetiroId, new Date(r.createdAt));
    }
  }
  const fechaSolicitudPorId = new Map(
    entrada.solicitudes.map((s) => [s.id, new Date(s.fechaSolicitud)]),
  );
  const esperas: number[] = [];
  for (const [id, decision] of primeraDecision) {
    const solicitada = fechaSolicitudPorId.get(id);
    if (solicitada && enRango(decision)) {
      esperas.push((decision.getTime() - solicitada.getTime()) / MS_HORA);
    }
  }
  const horasPromedioRevision = esperas.length
    ? Math.round((esperas.reduce((a, b) => a + b, 0) / esperas.length) * 10) /
      10
    : null;

  const revisionesEnRango = entrada.revisiones.filter((r) =>
    enRango(r.createdAt),
  );
  const decisiones: Record<string, number> = {
    [EstadoSolicitudRetiro.APROBADA]: 0,
    [EstadoSolicitudRetiro.REQUIERE_MODIFICACION]: 0,
    [EstadoSolicitudRetiro.RECHAZADA]: 0,
  };
  for (const r of revisionesEnRango) {
    decisiones[r.decision] = (decisiones[r.decision] ?? 0) + 1;
  }

  const lotesEnRango = entrada.lotes.filter((l) => enRango(l.createdAt));
  const cerradasCon = (estado: EstadoSolicitudRetiro) =>
    entrada.solicitudes.filter(
      (s) => s.estado === estado && enRango(s.fechaCierre),
    ).length;

  return {
    dias,
    desde: diaLocal(inicio),
    hasta: diaLocal(ahora),
    recibidas: recibidas.length,
    serieDiaria: [...serie.entries()].map(([fecha, total]) => ({
      fecha,
      total,
    })),
    cola: { enRevision: enRevision.length, atrasadas },
    horasPromedioRevision,
    decisiones,
    motivos: ordenado(
      contar(revisionesEnRango, (r) => r.motivo),
      'motivo',
    ),
    porCategoria: ordenado(
      contar(recibidas, (s) => s.categoria ?? 'Sin categoría'),
      'categoria',
    ),
    derivacion: {
      lotes: lotesEnRango.length,
      derivadas: lotesEnRango.reduce((total, l) => total + l.cantidad, 0),
      retiradas: cerradasCon(EstadoSolicitudRetiro.RETIRADA),
      noRealizadas: cerradasCon(EstadoSolicitudRetiro.NO_REALIZADA),
    },
    recaudacion: recibidas
      .filter((s) => s.estadoPago === EstadoPagoSolicitud.PAGADO)
      .reduce((total, s) => total + (s.monto ?? 0), 0),
  };
}
