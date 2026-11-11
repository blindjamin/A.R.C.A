import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import {
  Anillo,
  AreaDiaria,
  AZUL,
  Cuadritos,
  DORADO,
  Dona,
  GRIS,
  ROJO,
  Sparkline,
  VERDE,
  VERDE_CLARO,
  type Porcion,
} from '../components/GraficosMetricas';

/** Orden fijo de colores por categoría (validado para daltonismo); el resto va a «Otras». */
const COLORES_CATEGORIA = [VERDE, DORADO, AZUL, VERDE_CLARO];

// Indicadores agregados de la gestión (docs/specs/SPEC-dashboard-metricas.md).
// HU-09: Reporte de gestión por rango de fechas y exportación CSV.
// Gráficos en SVG propio (components/GraficosMetricas.tsx), sin librería.

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
  aprobada: VERDE,
  requiere_modificacion: DORADO,
  rechazada: ROJO,
};

/** Las 4 categorías más grandes con color propio; el resto en gris como «Otros». */
function gruposCategoria(filas: { categoria: string; total: number }[]): Porcion[] {
  const ordenadas = [...filas].sort((a, b) => b.total - a.total);
  const grupos: Porcion[] = ordenadas
    .slice(0, COLORES_CATEGORIA.length)
    .map((c, i) => ({
      clave: c.categoria,
      label: c.categoria,
      total: c.total,
      color: COLORES_CATEGORIA[i],
    }));
  const resto = ordenadas.slice(COLORES_CATEGORIA.length);
  if (resto.length > 0) {
    grupos.push({
      clave: 'otros',
      label: resto.length === 1 ? resto[0].categoria : `Otras (${resto.length})`,
      total: resto.reduce((a, c) => a + c.total, 0),
      color: GRIS,
    });
  }
  return grupos;
}

/** Diferencia entre la segunda y la primera mitad del rango, en %. */
function tendencia(serie: { total: number }[]): number | null {
  const mitad = Math.floor(serie.length / 2);
  const antes = serie.slice(0, mitad).reduce((a, p) => a + p.total, 0);
  const despues = serie.slice(serie.length - mitad).reduce((a, p) => a + p.total, 0);
  if (antes === 0) return null;
  return Math.round(((despues - antes) / antes) * 100);
}

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
                  extra={<Sparkline valores={datos.serieDiaria.map((p) => p.total)} />}
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
                  extra={
                    datos.cola.enRevision > 0 && (
                      <BarraProgreso
                        fraccion={datos.cola.atrasadas / datos.cola.enRevision}
                        color="bg-rose-600"
                        titulo={`${porcentaje(datos.cola.atrasadas, datos.cola.enRevision)}% atrasadas`}
                      />
                    )
                  }
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
                  extra={
                    datos.horasPromedioRevision !== null && (
                      <EscalaEspera horas={datos.horasPromedioRevision} />
                    )
                  }
                />
                <Tarjeta
                  valor={formatearPrecio(datos.recaudacion)}
                  etiqueta="Pagos registrados"
                  detalle="Solo pagos confirmados"
                />
              </div>

              <div className="card space-y-5 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-bold">Solicitudes recibidas por día</h2>
                    <p className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span className="font-display text-3xl font-extrabold tabular-nums text-ink">
                        {datos.recibidas}
                      </span>
                      <span className="text-sm text-slate">en el período</span>
                      <ChipTendencia valor={tendencia(datos.serieDiaria)} />
                    </p>
                  </div>
                  <p className="text-xs text-slate">
                    Recorre el gráfico con el cursor para ver cada día.
                  </p>
                </div>
                <AreaDiaria serie={datos.serieDiaria} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="card space-y-4 p-5">
                  <div>
                    <h2 className="font-bold">Decisiones de revisión</h2>
                    <p className="text-xs text-slate">
                      {totalDecisiones(datos.decisiones)} decisiones en el período
                    </p>
                  </div>
                  {totalDecisiones(datos.decisiones) === 0 ? (
                    <p className="text-sm text-slate">Sin decisiones en el rango.</p>
                  ) : (
                    <Dona
                      porciones={(Object.keys(ETIQUETA_DECISION) as ClaveDecision[]).map(
                        (clave) => ({
                          clave,
                          label: ETIQUETA_DECISION[clave],
                          total: datos.decisiones[clave] ?? 0,
                          color: COLOR_DECISION[clave],
                        }),
                      )}
                      centro={`${porcentaje(
                        datos.decisiones.aprobada ?? 0,
                        totalDecisiones(datos.decisiones),
                      )}%`}
                      subtitulo="aprobadas"
                    />
                  )}
                </div>

                <div className="card space-y-4 p-5">
                  <div>
                    <h2 className="font-bold">Por categoría de residuo</h2>
                    <p className="text-xs text-slate">Cada cuadrito es 1 % de las solicitudes</p>
                  </div>
                  <Cuadritos grupos={gruposCategoria(datos.porCategoria)} />
                </div>

                <div className="card space-y-4 p-5">
                  <div>
                    <h2 className="font-bold">Derivación a la empresa</h2>
                    <p className="text-xs text-slate">Retiros cerrados en el período</p>
                  </div>
                  <Derivacion derivacion={datos.derivacion} />
                </div>
              </div>

              <div className="card space-y-4 p-5">
                <div>
                  <h2 className="font-bold">Motivos más usados</h2>
                  <p className="text-xs text-slate">
                    Al pedir una modificación o rechazar una solicitud
                  </p>
                </div>
                <Barras
                  filas={datos.motivos.map((m) => ({
                    label: ETIQUETA_MOTIVO[m.motivo] ?? humanizar(m.motivo),
                    total: m.total,
                  }))}
                  limite={7}
                  dosColumnas
                  vacio="Sin motivos registrados en el rango."
                />
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
  extra,
}: {
  valor: number | string;
  etiqueta: string;
  detalle?: string;
  alerta?: boolean;
  ok?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <p className="text-xs font-semibold text-slate">{etiqueta}</p>
      <p className="font-display text-3xl font-extrabold tabular-nums text-ink">{valor}</p>
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
      {extra && <div className="mt-auto pt-2">{extra}</div>}
    </div>
  );
}

function BarraProgreso({
  fraccion,
  color,
  titulo,
}: {
  fraccion: number;
  color: string;
  titulo: string;
}) {
  return (
    <div title={titulo} className="h-1.5 overflow-hidden rounded-full bg-line-2">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.min(100, fraccion * 100)}%` }}
      />
    </div>
  );
}

/** Escala de 0 a 96 h: tramo verde hasta 48 h, rojo después, y una marca en el promedio. */
function EscalaEspera({ horas }: { horas: number }) {
  const MAX = 96;
  const posicion = Math.min(100, (horas / MAX) * 100);
  return (
    <div>
      <div className="relative h-1.5">
        <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-green-200" />
        <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-full bg-rose-100" />
        <span
          className="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: `${posicion}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-2">
        <span>0 h</span>
        <span>48 h</span>
        <span>{horas > MAX ? `+${MAX} h` : `${MAX} h`}</span>
      </div>
    </div>
  );
}

function ChipTendencia({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  const sube = valor >= 0;
  return (
    <span
      title="Segunda mitad del período frente a la primera"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        sube ? 'bg-green-100 text-green-800' : 'bg-canvas text-slate'
      }`}
    >
      <span aria-hidden="true">{sube ? '▲' : '▼'}</span>
      {sube ? '+' : ''}
      {valor}% vs. la primera mitad
    </span>
  );
}

const totalDecisiones = (d: DatosMetricas['decisiones']): number =>
  (d.aprobada ?? 0) + (d.requiere_modificacion ?? 0) + (d.rechazada ?? 0);

/**
 * Las derivadas se cuentan por fecha del lote y las cerradas por fecha de
 * cierre: son grupos distintos, así que no se muestran como embudo.
 */
function Derivacion({ derivacion }: { derivacion: DatosMetricas['derivacion'] }) {
  const { lotes, derivadas, retiradas, noRealizadas } = derivacion;
  const cerradas = retiradas + noRealizadas;
  const filas = [
    { label: 'Solicitudes derivadas', valor: derivadas },
    { label: lotes === 1 ? 'Lote generado' : 'Lotes generados', valor: lotes },
    { label: 'Retiradas', valor: retiradas, punto: 'bg-green-700' },
    { label: 'No realizadas', valor: noRealizadas, punto: 'bg-rose-600' },
  ];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
      {cerradas > 0 ? (
        <Anillo valor={retiradas} total={cerradas} etiqueta="retiradas" />
      ) : (
        <p className="text-sm text-slate">Sin retiros cerrados en el rango.</p>
      )}
      <ul className="w-full flex-1 divide-y divide-line-2 text-sm">
        {filas.map((f) => (
          <li key={f.label} className="flex items-center gap-2 px-2 py-1.5">
            {f.punto && (
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${f.punto}`} />
            )}
            <span className="flex-1 text-ink">{f.label}</span>
            <span className="font-semibold tabular-nums text-ink">{f.valor}</span>
          </li>
        ))}
      </ul>
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
  dosColumnas,
  vacio = 'Sin datos en el rango.',
}: {
  filas: { label: string; total: number }[];
  limite?: number;
  dosColumnas?: boolean;
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
    <ul className={dosColumnas ? 'grid gap-x-10 gap-y-3 md:grid-cols-2' : 'space-y-3'}>
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
          <div className="mt-1.5 h-2.5 rounded-full bg-line-2">
            <div
              className={`h-2.5 rounded-full ${
                esOtros(i) ? 'bg-slate-2/40' : 'bg-gradient-to-r from-green-600 to-green-700'
              }`}
              style={{ width: `${(f.total / maximo) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
