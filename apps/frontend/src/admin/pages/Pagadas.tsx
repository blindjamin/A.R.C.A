import { useEffect, useMemo, useState } from 'react';
import {
  descargarPagadas,
  fetchPagadas,
  fetchSectoresPagadas,
  formatearPrecio,
  mensajeDeError,
  type EstadoSolicitud,
  type FiltroPagadas,
  type FormatoExportacion,
  type SolicitudPagada,
} from '../api/admin';
import { EmptyState, ESTADO_META, EstadoPill } from '../components/ui';
import {
  errorDeRango,
  finDelDia,
  formatoFechaHora,
  inicioDelDia,
} from '../fechas';

// El backend devuelve como máximo las 1000 más recientes.
const MAX_FILAS = 1000;

export default function Pagadas() {
  const [estado, setEstado] = useState<EstadoSolicitud | ''>('');
  const [diaDesde, setDiaDesde] = useState('');
  const [diaHasta, setDiaHasta] = useState('');
  const [sector, setSector] = useState('');
  const [sectores, setSectores] = useState<string[]>([]);
  const [descargando, setDescargando] = useState<FormatoExportacion | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const errorRango = useMemo(
    () => errorDeRango(diaDesde, diaHasta),
    [diaDesde, diaHasta],
  );

  const filtroApi = useMemo<FiltroPagadas>(
    () => ({
      estado: estado || undefined,
      sector: sector || undefined,
      desde: diaDesde ? inicioDelDia(diaDesde) : undefined,
      hasta: diaHasta ? finDelDia(diaHasta) : undefined,
    }),
    [estado, sector, diaDesde, diaHasta],
  );
  const hayFiltro = Boolean(estado || sector || diaDesde || diaHasta);

  useEffect(() => {
    fetchSectoresPagadas()
      .then(setSectores)
      .catch(() => setSectores([]));
  }, []);

  // El resultado guarda para qué filtro se pidió: mientras no coincida con el
  // filtro actual, la consulta está en curso.
  const clave = JSON.stringify(filtroApi);
  const [resultado, setResultado] = useState<{
    clave: string;
    filas: SolicitudPagada[];
    error: string | null;
  } | null>(null);
  const filas = useMemo(() => resultado?.filas ?? [], [resultado]);
  const error = resultado?.error ?? null;
  const loading = !errorRango && resultado?.clave !== clave;

  useEffect(() => {
    if (errorRango) return;
    // Si el filtro cambia antes de que llegue la respuesta, esa se descarta.
    let vigente = true;
    fetchPagadas(filtroApi)
      .then((datos) => {
        if (vigente) setResultado({ clave, filas: datos, error: null });
      })
      .catch((e: unknown) => {
        if (vigente)
          setResultado({ clave, filas: [], error: mensajeDeError(e) });
      });
    return () => {
      vigente = false;
    };
  }, [filtroApi, clave, errorRango]);

  const total = useMemo(
    () => filas.reduce((t, s) => t + (s.monto ?? 0), 0),
    [filas],
  );

  const descargar = async (formato: FormatoExportacion) => {
    setDescargando(formato);
    setErrorDescarga(null);
    try {
      await descargarPagadas(filtroApi, formato);
    } catch (e) {
      setErrorDescarga(mensajeDeError(e));
    } finally {
      setDescargando(null);
    }
  };

  const limpiarFiltros = () => {
    setEstado('');
    setSector('');
    setDiaDesde('');
    setDiaHasta('');
  };

  const monto = (s: SolicitudPagada) =>
    s.monto === null ? '—' : formatearPrecio(s.monto);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Solicitudes pagadas</h1>
        <p className="text-sm text-slate">
          Qué solicitudes ya se pagaron, dónde hay que retirar y por cuánto.
        </p>
      </header>

      <section
        aria-label="Filtrar y exportar"
        className="card flex flex-col gap-3 border border-line bg-white p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-2">
            Estado
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoSolicitud | '')}
              className="field"
            >
              <option value="">Todos</option>
              {Object.entries(ESTADO_META).map(([valor, meta]) => (
                <option key={valor} value={valor}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-2">
            Desde
            <input
              type="date"
              value={diaDesde}
              max={diaHasta || undefined}
              onChange={(e) => setDiaDesde(e.target.value)}
              className="field"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-2">
            Hasta
            <input
              type="date"
              value={diaHasta}
              min={diaDesde || undefined}
              onChange={(e) => setDiaHasta(e.target.value)}
              className="field"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-2">
            Sector
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="field"
            >
              <option value="">Todos</option>
              {sectores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['csv', 'xlsx'] as const).map((formato) => (
            <button
              key={formato}
              type="button"
              onClick={() => void descargar(formato)}
              disabled={descargando !== null || errorRango !== null}
              className="pill border border-transparent bg-green-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              {descargando === formato
                ? 'Descargando…'
                : formato === 'csv'
                  ? 'Descargar CSV'
                  : 'Descargar Excel'}
            </button>
          ))}
          {/* Al final, para que al aparecer no corra los botones de descarga. */}
          {hayFiltro && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="pill border border-line bg-white px-3.5 py-2 text-xs text-slate hover:bg-canvas"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>
      {(errorRango ?? errorDescarga) && (
        <p role="alert" className="-mt-3 text-sm text-rose-600">
          {errorRango ?? errorDescarga}
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card flex flex-col justify-between border border-line bg-white p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-2">
            Solicitudes
          </span>
          <span className="mt-2 text-3xl font-extrabold text-ink">
            {filas.length}
          </span>
        </div>
        <div className="card flex flex-col justify-between border border-line bg-white p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-2">
            Total pagado
          </span>
          <span className="mt-2 text-3xl font-extrabold text-emerald-700">
            {formatearPrecio(total)}
          </span>
        </div>
      </section>
      {filas.length >= MAX_FILAS && (
        <p className="-mt-3 text-xs text-slate-2">
          Se muestran las {MAX_FILAS} más recientes; acota los filtros o
          descarga el archivo.
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-slate">
          Cargando solicitudes pagadas…
        </p>
      ) : error ? (
        <p className="py-8 text-center text-rose-600">{error}</p>
      ) : filas.length === 0 ? (
        <EmptyState message="No hay solicitudes pagadas con estos filtros." />
      ) : (
        <>
          {/* VISTA MÓVIL: tarjetas */}
          <div className="block space-y-3 md:hidden">
            {filas.map((s) => (
              <div
                key={s.id}
                className="card space-y-2 border border-line bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">#{s.id}</span>
                  <EstadoPill estado={s.estado} />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1 text-sm">
                    <p className="break-words font-medium text-ink">
                      {s.residuo} · {s.categoria}
                    </p>
                    <p className="text-xs text-slate">{s.sector}</p>
                    <p className="break-words text-xs text-slate">
                      {s.direccion || '—'}
                    </p>
                    <p className="text-[11px] text-slate-2">
                      Solicitud: {formatoFechaHora(s.fechaSolicitud)}
                      {s.fechaRevision &&
                        ` · Aprobada: ${formatoFechaHora(s.fechaRevision)}`}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-ink">
                    {monto(s)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* VISTA ESCRITORIO: tabla */}
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white shadow-sm md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-canvas/30 text-xs font-semibold uppercase text-slate-2">
                  <th className="px-4 py-3">Solicitud</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Residuo</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Dirección de retiro</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {filas.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-canvas/10">
                    <td className="px-4 py-3 font-bold text-ink">#{s.id}</td>
                    <td className="px-4 py-3 text-xs text-slate">
                      {formatoFechaHora(s.fechaSolicitud)}
                      {s.fechaRevision && (
                        <span className="block text-[11px] text-slate-2">
                          Aprobada: {formatoFechaHora(s.fechaRevision)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoPill estado={s.estado} />
                    </td>
                    <td className="break-words px-4 py-3 font-medium text-ink">
                      {s.residuo}
                      <span className="block text-xs font-normal text-slate-2">
                        {s.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate">{s.sector}</td>
                    <td className="break-words px-4 py-3 text-slate">
                      {s.direccion || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                      {monto(s)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
