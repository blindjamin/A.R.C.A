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

type ClaveDecision = keyof typeof ETIQUETA_DECISION;

// Colores de estado con etiqueta y número al lado: nunca solo el color.
const COLOR_DECISION: Record<ClaveDecision, string> = {
  aprobada: 'bg-green-700',
  requiere_modificacion: 'bg-gold-500',
  rechazada: 'bg-rose-600',
};

const porcentaje = (parte: number, total: number): number =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

/** Motivos antiguos que ya no están en la lista: «residuo_no_aceptado» → «Residuo no aceptado». */
const humanizar = (clave: string): string => {
  const texto = clave.replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const promedioDiario = (serie: { total: number }[]): string => {
  if (serie.length === 0) return '0';
  const promedio = serie.reduce((a, p) => a + p.total, 0) / serie.length;
  return promedio.toLocaleString('es-CL', { maximumFractionDigits: 1 });
};

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
                <Tarjeta
                  valor={datos.recibidas}
                  etiqueta="Solicitudes recibidas"
                  detalle={`${promedioDiario(datos.serieDiaria)} por día en promedio`}
                />
                <Tarjeta
                  valor={datos.cola.enRevision}
                  etiqueta="En revisión ahora"
                  detalle={
                    datos.cola.atrasadas > 0
                      ? `${datos.cola.atrasadas} con más de 48 h`
                      : 'Ninguna con más de 48 h'
                  }
                  alerta={datos.cola.atrasadas > 0}
                  ok={datos.cola.atrasadas === 0}
                />
                <Tarjeta
                  valor={formatoHoras(datos.horasPromedioRevision)}
                  etiqueta="Espera hasta la primera revisión"
                  detalle={
                    datos.horasPromedioRevision === null
                      ? 'Sin revisiones en el rango'
                      : datos.horasPromedioRevision > 48
                        ? 'Sobre 48 h en promedio'
                        : 'Bajo 48 h en promedio'
                  }
                  alerta={(datos.horasPromedioRevision ?? 0) > 48}
                  ok={
                    datos.horasPromedioRevision !== null &&
                    datos.horasPromedioRevision <= 48
                  }
                />
                <Tarjeta
                  valor={formatearPrecio(datos.recaudacion)}
                  etiqueta="Pagos registrados"
                  detalle="Solo pagos confirmados"
                />
              </div>

              <div className="card space-y-4 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-bold">Solicitudes recibidas por día</h2>
                  <p className="text-xs text-slate">
                    Pasa el cursor sobre una barra para ver el día.
                  </p>
                </div>
                <SerieDiaria serie={datos.serieDiaria} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card space-y-4 p-5">
                  <h2 className="font-bold">Decisiones de revisión</h2>
                  <Decisiones decisiones={datos.decisiones} />
                </div>

                <div className="card space-y-4 p-5">
                  <h2 className="font-bold">Motivos más usados</h2>
                  <Barras
                    filas={datos.motivos.map((m) => ({
                      label: ETIQUETA_MOTIVO[m.motivo] ?? humanizar(m.motivo),
                      total: m.total,
                    }))}
                    limite={5}
                    vacio="Sin motivos registrados en el rango."
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card space-y-4 p-5">
                  <h2 className="font-bold">Por categoría de residuo</h2>
                  <Barras
                    filas={datos.porCategoria.map((c) => ({
                      label: c.categoria,
                      total: c.total,
                    }))}
                    vacio="Sin solicitudes en el rango."
                  />
                </div>

                <div className="card space-y-4 p-5">
                  <h2 className="font-bold">Derivación a la empresa</h2>
                  <Derivacion derivacion={datos.derivacion} />
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
                  etiqueta="Solicitudes recibidas"
                  detalle="Creadas en el período"
                />
                <Tarjeta
                  valor={reporte.retiros}
                  etiqueta="Retiros realizados"
                  detalle="Estado retirada"
                />
                <Tarjeta
                  valor={formatearPrecio(reporte.monto)}
                  etiqueta="Monto recaudado"
                  detalle="Solo pagos confirmados"
                />
                <Tarjeta
                  valor={totalObjetosReporte}
                  etiqueta="Total de objetos"
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
  ok,
}: {
  valor: number | string;
  etiqueta: string;
  detalle?: string;
  alerta?: boolean;
  ok?: boolean;
}) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <p className="text-xs font-semibold text-slate">{etiqueta}</p>
      <p className="text-3xl font-extrabold tabular-nums text-ink">{valor}</p>
      {detalle && (
        <p
          className={`flex items-center gap-1 text-xs font-semibold ${
            alerta ? 'text-rose-600' : ok ? 'text-green-700' : 'text-slate-2'
          }`}
        >
          {alerta && <span aria-hidden="true">⚠</span>}
          {ok && !alerta && <span aria-hidden="true">✓</span>}
          {detalle}
        </p>
      )}
    </div>
  );
}

/**
 * Barras horizontales con cantidad y participación. Con `limite`, lo que
 * sobra se junta en «Otros» para que la lista no crezca sin fin.
 */
function Barras({
  filas,
  limite,
  vacio = 'Sin datos en el rango.',
}: {
  filas: { label: string; total: number }[];
  limite?: number;
  vacio?: string;
}) {
  const total = filas.reduce((a, f) => a + f.total, 0);
  if (total === 0) {
    return <p className="text-sm text-slate">{vacio}</p>;
  }

  const ordenadas = [...filas].sort((a, b) => b.total - a.total);
  const visibles =
    limite && ordenadas.length > limite + 1
      ? [
          ...ordenadas.slice(0, limite),
          {
            label: `Otros (${ordenadas.length - limite})`,
            total: ordenadas.slice(limite).reduce((a, f) => a + f.total, 0),
          },
        ]
      : ordenadas;
  const maximo = Math.max(...visibles.map((f) => f.total));
  const esOtros = (i: number) => visibles !== ordenadas && i === visibles.length - 1;

  return (
    <ul className="space-y-3">
      {visibles.map((f, i) => (
        <li key={f.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className={esOtros(i) ? 'text-slate' : 'text-ink'}>{f.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-ink">{f.total}</span>
              <span className="ml-1.5 text-xs text-slate-2">
                {porcentaje(f.total, total)}%
              </span>
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-line-2">
            <div
              className={`h-2 rounded-full ${esOtros(i) ? 'bg-slate-2/40' : 'bg-green-700'}`}
              style={{ width: `${(f.total / maximo) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Aprobadas, con modificación pedida y rechazadas como una sola barra al 100 %. */
function Decisiones({
  decisiones,
}: {
  decisiones: DatosMetricas['decisiones'];
}) {
  const filas = (Object.keys(ETIQUETA_DECISION) as ClaveDecision[]).map(
    (clave) => ({
      clave,
      label: ETIQUETA_DECISION[clave],
      total: decisiones[clave] ?? 0,
    }),
  );
  const total = filas.reduce((a, f) => a + f.total, 0);
  if (total === 0) {
    return <p className="text-sm text-slate">Sin decisiones en el rango.</p>;
  }

  return (
    <div className="space-y-4">
      <p>
        <span className="text-3xl font-extrabold tabular-nums text-ink">
          {porcentaje(decisiones.aprobada ?? 0, total)}%
        </span>
        <span className="ml-2 text-sm text-slate">
          de {total} decisiones fueron aprobaciones
        </span>
      </p>

      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {filas
          .filter((f) => f.total > 0)
          .map((f) => (
            <div
              key={f.clave}
              title={`${f.label}: ${f.total} (${porcentaje(f.total, total)}%)`}
              className={COLOR_DECISION[f.clave]}
              style={{ width: `${(f.total / total) * 100}%` }}
            />
          ))}
      </div>

      <ul className="space-y-2 text-sm">
        {filas.map((f) => (
          <li key={f.clave} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_DECISION[f.clave]}`}
            />
            <span className="flex-1 text-ink">{f.label}</span>
            <span className="font-semibold tabular-nums text-ink">{f.total}</span>
            <span className="w-10 text-right text-xs tabular-nums text-slate-2">
              {porcentaje(f.total, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Las derivadas se cuentan por fecha del lote y las cerradas por fecha de
 * cierre: son grupos distintos, así que no se muestran como embudo.
 */
function Derivacion({
  derivacion,
}: {
  derivacion: DatosMetricas['derivacion'];
}) {
  const { lotes, derivadas, retiradas, noRealizadas } = derivacion;
  const cerradas = retiradas + noRealizadas;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md bg-card-2 p-3">
          <p className="text-2xl font-extrabold tabular-nums text-ink">
            {derivadas}
          </p>
          <p className="text-xs text-slate">solicitudes derivadas</p>
        </div>
        <div className="rounded-md bg-card-2 p-3">
          <p className="text-2xl font-extrabold tabular-nums text-ink">{lotes}</p>
          <p className="text-xs text-slate">
            {lotes === 1 ? 'lote generado' : 'lotes generados'}
          </p>
        </div>
      </div>

      {cerradas === 0 ? (
        <p className="text-sm text-slate">Sin retiros cerrados en el rango.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-ink">
            <span className="font-semibold">
              {porcentaje(retiradas, cerradas)}% retiradas
            </span>{' '}
            <span className="text-slate">de {cerradas} cerradas en el rango</span>
          </p>
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
            {retiradas > 0 && (
              <div
                title={`Retiradas: ${retiradas}`}
                className="bg-green-700"
                style={{ width: `${(retiradas / cerradas) * 100}%` }}
              />
            )}
            {noRealizadas > 0 && (
              <div
                title={`No realizadas: ${noRealizadas}`}
                className="bg-rose-600"
                style={{ width: `${(noRealizadas / cerradas) * 100}%` }}
              />
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-green-700" />
              Retiradas <span className="font-semibold text-ink">{retiradas}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rose-600" />
              No realizadas{' '}
              <span className="font-semibold text-ink">{noRealizadas}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** Tope del eje en 4 pasos enteros: 12 → 0, 3, 6, 9, 12. */
function pasoEje(maximo: number): number {
  const paso = Math.max(1, Math.ceil(maximo / 4));
  return paso <= 5 ? paso : Math.ceil(paso / 5) * 5;
}

function SerieDiaria({ serie }: { serie: { fecha: string; total: number }[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const paso = pasoEje(Math.max(0, ...serie.map((p) => p.total)));
  const tope = paso * 4;
  const marcas = [4, 3, 2, 1, 0].map((k) => k * paso);
  const promedio =
    serie.length > 0 ? serie.reduce((a, p) => a + p.total, 0) / serie.length : 0;
  const punto = activo === null ? null : serie[activo];
  const medio = serie[Math.floor(serie.length / 2)];

  return (
    <div
      role="img"
      aria-label={`Solicitudes por día del ${formatoDia(serie[0]?.fecha ?? '')} al ${formatoDia(
        serie.at(-1)?.fecha ?? '',
      )}. Promedio ${promedioDiario(serie)} por día.`}
      className="flex gap-2"
    >
      <div className="relative h-44 w-6 shrink-0 text-right text-[11px] tabular-nums text-slate-2">
        {marcas.map((m) => (
          <span
            key={m}
            className="absolute right-0 -translate-y-1/2"
            style={{ top: `${100 - (m / tope) * 100}%` }}
          >
            {m}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-44" onMouseLeave={() => setActivo(null)}>
          {marcas.map((m) => (
            <div
              key={m}
              className={`absolute inset-x-0 border-t ${m === 0 ? 'border-line' : 'border-line-2'}`}
              style={{ top: `${100 - (m / tope) * 100}%` }}
            />
          ))}

          {promedio > 0 && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-slate-2"
              style={{ bottom: `${(promedio / tope) * 100}%` }}
            >
              <span className="absolute right-0 -top-4 bg-card px-1 text-[11px] text-slate-2">
                promedio {promedioDiario(serie)}
              </span>
            </div>
          )}

          <div
            className={`absolute inset-0 flex items-end ${serie.length > 31 ? 'gap-px' : 'gap-[2px]'}`}
          >
            {serie.map((p, i) => (
              <div
                key={p.fecha}
                onMouseEnter={() => setActivo(i)}
                className="flex h-full min-w-0 flex-1 items-end"
              >
                <div
                  className={`w-full rounded-t-[4px] transition-colors ${
                    activo === i ? 'bg-green-900' : 'bg-green-700'
                  }`}
                  style={{ height: `${(p.total / tope) * 100}%` }}
                />
              </div>
            ))}
          </div>

          {punto && activo !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-xs text-white shadow"
              style={{
                left: `${Math.min(92, Math.max(8, ((activo + 0.5) / serie.length) * 100))}%`,
              }}
            >
              <span className="font-semibold">{formatoDia(punto.fecha)}</span> ·{' '}
              {punto.total} {punto.total === 1 ? 'solicitud' : 'solicitudes'}
            </div>
          )}
        </div>

        <div className="mt-1.5 flex justify-between text-[11px] text-slate-2">
          <span>{formatoDia(serie[0]?.fecha ?? '')}</span>
          {serie.length > 2 && <span>{formatoDia(medio?.fecha ?? '')}</span>}
          <span>{formatoDia(serie.at(-1)?.fecha ?? '')}</span>
        </div>
      </div>
    </div>
  );
}
