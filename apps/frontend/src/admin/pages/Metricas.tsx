import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ETIQUETA_MOTIVO,
  fetchMetricas,
  fetchReporte,
  formatearPrecio,
  mensajeDeError,
  type Metricas as DatosMetricas,
  type RangoMetricas,
  type ReporteGestion,
} from '../api/admin';

// Indicadores agregados de la gestión (docs/specs/SPEC-dashboard-metricas.md).
// HU-09: Reporte de gestión por rango de fechas y exportación CSV.
// Barras hechas con CSS: no se agrega una librería de gráficos para esto.

const RANGOS: { dias: RangoMetricas; label: string }[] = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
];

const ETIQUETA_DECISION = {
  aprobada: 'Aprobadas',
  requiere_modificacion: 'Modificación pedida',
  rechazada: 'Rechazadas',
} as const;

const DIA_MS = 24 * 60 * 60 * 1000;
const RANGO_MAXIMO_DIAS = 366;

const formatoDia = (fecha: string): string => {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
};

const formatoHoras = (horas: number | null): string => {
  if (horas === null) return '—';
  if (horas < 48) return `${horas} h`;
  return `${Math.round((horas / 24) * 10) / 10} días`;
};

const obtenerHoy = (): string => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const obtenerDiasAtras = (dias: number): string => {
  const d = new Date(Date.now() - dias * DIA_MS);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

function validarRangoFechas(desde: string, hasta: string): string | null {
  if (!desde || !hasta) {
    return 'Debes seleccionar ambas fechas para el reporte.';
  }
  const tDesde = Date.parse(desde);
  const tHasta = Date.parse(hasta);
  if (Number.isNaN(tDesde) || Number.isNaN(tHasta)) {
    return 'Formato de fecha inválido.';
  }
  const diff = (tHasta - tDesde) / DIA_MS;
  if (diff < 0) {
    return 'La fecha desde no puede ser posterior a la fecha hasta.';
  }
  if (diff > RANGO_MAXIMO_DIAS) {
    return 'El rango máximo no puede superar un año (366 días).';
  }
  return null;
}

function exportarReporteCsv(rep: ReporteGestion): void {
  const totalObjetos = rep.porCategoria.reduce(
    (acc, curr) => acc + curr.objetos,
    0,
  );

  const lineas: string[] = [
    'Reporte de gestión de solicitudes - A.R.C.A.',
    `Período;${rep.desde} a ${rep.hasta}`,
    `Solicitudes recibidas;${rep.solicitudesRecibidas}`,
    `Retiros realizados;${rep.retiros}`,
    `Monto total pagado (CLP);${rep.monto}`,
    `Total de objetos;${totalObjetos}`,
    '',
    'Categoría;Cantidad de objetos;Porcentaje',
  ];

  for (const c of rep.porCategoria) {
    const pct =
      totalObjetos > 0 ? ((c.objetos / totalObjetos) * 100).toFixed(1) : '0.0';
    const categoriaLimpia = c.categoria.replace(/"/g, '""');
    lineas.push(`"${categoriaLimpia}";${c.objetos};${pct}%`);
  }

  const csvContent = '\uFEFF' + lineas.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `reporte-gestion-${rep.desde}-al-${rep.hasta}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

export default function Metricas() {
  const [pestana, setPestana] = useState<'dashboard' | 'reporte'>('dashboard');

  // Estado del dashboard general (7, 30, 90 dias)
  const [dias, setDias] = useState<RangoMetricas>(30);
  const [datos, setDatos] = useState<DatosMetricas | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado del reporte por fechas (HU-09)
  const [diaDesde, setDiaDesde] = useState<string>(() => obtenerDiasAtras(30));
  const [diaHasta, setDiaHasta] = useState<string>(() => obtenerHoy());
  const [reporte, setReporte] = useState<ReporteGestion | null>(null);
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const consultadoRef = useRef(false);

  const errorValidacion = useMemo(
    () => validarRangoFechas(diaDesde, diaHasta),
    [diaDesde, diaHasta],
  );

  useEffect(() => {
    let cancelado = false;
    fetchMetricas(dias)
      .then((m) => {
        if (!cancelado) {
          setDatos(m);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, [dias]);

  const consultarReporte = async (desde: string, hasta: string) => {
    const errorRango = validarRangoFechas(desde, hasta);
    if (errorRango) {
      setErrorReporte(errorRango);
      return;
    }
    setCargandoReporte(true);
    setErrorReporte(null);
    try {
      const res = await fetchReporte(desde, hasta);
      setReporte(res);
    } catch (e) {
      setErrorReporte(mensajeDeError(e));
    } finally {
      setCargandoReporte(false);
    }
  };

  useEffect(() => {
    if (pestana === 'reporte' && !consultadoRef.current) {
      consultadoRef.current = true;
      void consultarReporte(diaDesde, diaHasta);
    }
  }, [pestana, diaDesde, diaHasta]);

  const totalObjetosReporte = useMemo(
    () =>
      reporte?.porCategoria.reduce((acc, curr) => acc + curr.objetos, 0) ?? 0,
    [reporte],
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Métricas</h1>
          <p className="text-sm text-slate">
            {pestana === 'dashboard'
              ? datos
                ? `Del ${formatoDia(datos.desde)} al ${formatoDia(datos.hasta)}.`
                : 'Cómo va la gestión de solicitudes.'
              : 'Reporte de gestión por rango de fechas y exportación CSV (HU-09).'}
          </p>
        </div>

        {pestana === 'dashboard' && (
          <div className="flex gap-2">
            {RANGOS.map((r) => (
              <button
                key={r.dias}
                type="button"
                onClick={() => setDias(r.dias)}
                className={`pill border ${
                  dias === r.dias
                    ? 'border-transparent bg-green-700 text-white'
                    : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Selector de pestañas */}
      <div className="flex gap-2 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => setPestana('dashboard')}
          className={`pill border px-4 py-2 text-xs font-bold transition-colors ${
            pestana === 'dashboard'
              ? 'border-transparent bg-green-700 text-white'
              : 'border-line bg-white text-slate hover:bg-canvas'
          }`}
        >
          Métricas rápidas
        </button>
        <button
          type="button"
          onClick={() => setPestana('reporte')}
          className={`pill border px-4 py-2 text-xs font-bold transition-colors ${
            pestana === 'reporte'
              ? 'border-transparent bg-green-700 text-white'
              : 'border-line bg-white text-slate hover:bg-canvas'
          }`}
        >
          Reporte por fechas (HU-09)
        </button>
      </div>

      {pestana === 'dashboard' && (
        <>
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {!datos ? (
            !error && <p className="text-slate">Cargando métricas…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tarjeta valor={datos.recibidas} etiqueta="solicitudes recibidas" />
                <Tarjeta
                  valor={datos.cola.enRevision}
                  etiqueta="en revisión ahora"
                  detalle={
                    datos.cola.atrasadas > 0
                      ? `${datos.cola.atrasadas} con más de 48 h`
                      : undefined
                  }
                  alerta={datos.cola.atrasadas > 0}
                />
                <Tarjeta
                  valor={formatoHoras(datos.horasPromedioRevision)}
                  etiqueta="espera promedio hasta la primera revisión"
                />
                <Tarjeta
                  valor={formatearPrecio(datos.recaudacion)}
                  etiqueta="pagos registrados"
                />
              </div>

              <div className="card space-y-3 p-5">
                <h2 className="font-bold">Solicitudes recibidas por día</h2>
                <SerieDiaria serie={datos.serieDiaria} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card space-y-3 p-5">
                  <h2 className="font-bold">Decisiones de revisión</h2>
                  <Barras
                    filas={Object.entries(ETIQUETA_DECISION).map(
                      ([clave, label]) => ({
                        label,
                        total:
                          datos.decisiones[
                            clave as keyof typeof ETIQUETA_DECISION
                          ] ?? 0,
                      }),
                    )}
                  />
                  <h3 className="pt-2 text-sm font-semibold">Motivos más usados</h3>
                  <Barras
                    filas={datos.motivos.map((m) => ({
                      label: ETIQUETA_MOTIVO[m.motivo] ?? m.motivo,
                      total: m.total,
                    }))}
                    vacio="Sin motivos registrados en el rango."
                  />
                </div>

                <div className="card space-y-3 p-5">
                  <h2 className="font-bold">Por categoría de residuo</h2>
                  <Barras
                    filas={datos.porCategoria.map((c) => ({
                      label: c.categoria,
                      total: c.total,
                    }))}
                    vacio="Sin solicitudes en el rango."
                  />
                </div>
              </div>

              <div className="card space-y-3 p-5">
                <h2 className="font-bold">Derivación a la empresa</h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Tarjeta valor={datos.derivacion.lotes} etiqueta="lotes generados" />
                  <Tarjeta
                    valor={datos.derivacion.derivadas}
                    etiqueta="solicitudes derivadas"
                  />
                  <Tarjeta
                    valor={datos.derivacion.retiradas}
                    etiqueta="retiradas"
                  />
                  <Tarjeta
                    valor={datos.derivacion.noRealizadas}
                    etiqueta="no realizadas"
                    alerta={datos.derivacion.noRealizadas > 0}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {pestana === 'reporte' && (
        <div className="space-y-4">
          <section
            aria-label="Filtro de fechas y exportación"
            className="card border border-line bg-white p-4 space-y-3"
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-2">
                Desde
                <input
                  type="date"
                  value={diaDesde}
                  max={diaHasta || undefined}
                  onChange={(e) => setDiaDesde(e.target.value)}
                  className="field text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-2">
                Hasta
                <input
                  type="date"
                  value={diaHasta}
                  min={diaDesde || undefined}
                  onChange={(e) => setDiaHasta(e.target.value)}
                  className="field text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => void consultarReporte(diaDesde, diaHasta)}
                  disabled={cargandoReporte || Boolean(errorValidacion)}
                  className="pill border border-transparent bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {cargandoReporte ? 'Consultando…' : 'Consultar reporte'}
                </button>
                <button
                  type="button"
                  onClick={() => reporte && exportarReporteCsv(reporte)}
                  disabled={!reporte || cargandoReporte}
                  className="pill border border-line bg-white px-4 py-2 text-xs font-semibold text-slate hover:bg-canvas disabled:opacity-50"
                >
                  Descargar CSV
                </button>
              </div>
            </div>

            {(errorValidacion || errorReporte) && (
              <p role="alert" className="text-xs font-semibold text-rose-600">
                {errorValidacion || errorReporte}
              </p>
            )}
          </section>

          {cargandoReporte && (
            <p className="text-sm text-slate">Cargando reporte de gestión…</p>
          )}

          {!cargandoReporte && reporte && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tarjeta
                  valor={reporte.solicitudesRecibidas}
                  etiqueta="solicitudes recibidas"
                  detalle="Creadas en el período"
                />
                <Tarjeta
                  valor={reporte.retiros}
                  etiqueta="retiros realizados"
                  detalle="Estado retirada"
                />
                <Tarjeta
                  valor={formatearPrecio(reporte.monto)}
                  etiqueta="monto recaudado"
                  detalle="Solo pagos confirmados"
                />
                <Tarjeta
                  valor={totalObjetosReporte}
                  etiqueta="total de objetos"
                  detalle={`${reporte.porCategoria.length} categorías`}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card space-y-3 p-5">
                  <h2 className="font-bold">Distribución por categoría</h2>
                  <Barras
                    filas={reporte.porCategoria.map((c) => ({
                      label: c.categoria,
                      total: c.objetos,
                    }))}
                    vacio="Sin objetos registrados en este rango de fechas."
                  />
                </div>

                <div className="card space-y-3 p-5">
                  <h2 className="font-bold">Detalle de participación</h2>
                  {reporte.porCategoria.length === 0 ? (
                    <p className="text-sm text-slate">
                      Sin objetos en el rango seleccionado.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs font-semibold text-slate-2">
                            <th className="py-2 pr-3">Categoría</th>
                            <th className="py-2 px-3 text-right">Objetos</th>
                            <th className="py-2 pl-3 text-right">Porcentaje</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line-2">
                          {reporte.porCategoria.map((c) => {
                            const pct =
                              totalObjetosReporte > 0
                                ? (
                                    (c.objetos / totalObjetosReporte) *
                                    100
                                  ).toFixed(1)
                                : '0.0';
                            return (
                              <tr key={c.categoria}>
                                <td className="py-2 pr-3 font-medium text-ink">
                                  {c.categoria}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold">
                                  {c.objetos}
                                </td>
                                <td className="py-2 pl-3 text-right text-slate">
                                  {pct}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="card border border-green-200/60 bg-green-50/50 p-4 text-xs text-green-900 space-y-1">
                <p className="font-semibold">
                  Período consultado: {reporte.desde} al {reporte.hasta}
                </p>
                <p className="text-slate">
                  Reporte de gestión institucional para seguimiento municipal (HU-09).
                  Los datos presentados son agregados y anonimizados según la normativa
                  de privacidad.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Tarjeta({
  valor,
  etiqueta,
  detalle,
  alerta,
}: {
  valor: number | string;
  etiqueta: string;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-3xl font-extrabold text-ink">{valor}</p>
      <p className="text-xs text-slate">{etiqueta}</p>
      {detalle && (
        <p
          className={`mt-1 text-xs font-semibold ${
            alerta ? 'text-rose-600' : 'text-slate-2'
          }`}
        >
          {detalle}
        </p>
      )}
    </div>
  );
}

function Barras({
  filas,
  vacio = 'Sin datos en el rango.',
}: {
  filas: { label: string; total: number }[];
  vacio?: string;
}) {
  const maximo = Math.max(0, ...filas.map((f) => f.total));
  if (filas.length === 0 || maximo === 0) {
    return <p className="text-sm text-slate">{vacio}</p>;
  }

  return (
    <ul className="space-y-2">
      {filas.map((f) => (
        <li key={f.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-ink">{f.label}</span>
            <span className="font-semibold">{f.total}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-line-2">
            <div
              className="h-2 rounded-full bg-green-700"
              style={{ width: `${(f.total / maximo) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SerieDiaria({ serie }: { serie: { fecha: string; total: number }[] }) {
  const maximo = Math.max(1, ...serie.map((p) => p.total));

  return (
    <div>
      <div className="flex h-32 items-end gap-px">
        {serie.map((p) => (
          <div
            key={p.fecha}
            title={`${formatoDia(p.fecha)}: ${p.total}`}
            className="flex-1 rounded-t bg-green-700/80"
            style={{
              height: `${(p.total / maximo) * 100}%`,
              minHeight: p.total > 0 ? '4px' : '1px',
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-2">
        <span>{formatoDia(serie[0]?.fecha ?? '')}</span>
        <span>{formatoDia(serie.at(-1)?.fecha ?? '')}</span>
      </div>
    </div>
  );
}
