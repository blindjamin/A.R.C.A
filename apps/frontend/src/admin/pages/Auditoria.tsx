import { useEffect, useState, useMemo, useRef } from 'react';
import { fetchAuditoriaLogs, type AuditoriaLog } from '../api/admin';
import { EmptyState } from '../components/ui';

// Se traen los últimos MAX_REGISTROS de una vez y se paginan en pantalla: así
// la búsqueda y los filtros recorren todos, no solo la página visible.
const MAX_REGISTROS = 1000;
const REGISTROS_POR_PAGINA = 100;

// Tipos de filtros por categoría de acción.
type TipoFiltro = 'todos' | 'seguridad' | 'solicitudes' | 'sistema';

const FILTROS: { value: TipoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos los logs' },
  { value: 'seguridad', label: 'Seguridad / Accesos' },
  { value: 'solicitudes', label: 'Gestión Retiros' },
  { value: 'sistema', label: 'Sistema' },
];

const formatoFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

// Retorna un estilo visual para la criticidad de la acción.
const colorAccion = (accion: string): string => {
  const a = accion.toLowerCase();
  if (a.includes('cancelar') || a.includes('eliminar') || a.includes('rechazada')) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (a.includes('inicio') || a.includes('sesión') || a.includes('login')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (a.includes('aprobada') || a.includes('derivada')) {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  if (a.includes('catálogo') || a.includes('actualizar')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditoriaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros de búsqueda.
  const [filtro, setFiltro] = useState<TipoFiltro>('todos');
  const [query, setQuery] = useState('');
  const [pagina, setPagina] = useState(1);
  const inicioLista = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchAuditoriaLogs(MAX_REGISTROS)
      .then(setLogs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Procesamiento y filtrado de logs.
  const logsFiltrados = useMemo(() => {
    return logs.filter((log) => {
      const matchText = 
        log.usuario.toLowerCase().includes(query.toLowerCase()) ||
        log.objetoAfectado.toLowerCase().includes(query.toLowerCase()) ||
        log.accion.toLowerCase().includes(query.toLowerCase());

      if (filtro === 'todos') return matchText;
      
      const accion = log.accion.toLowerCase();
      if (filtro === 'seguridad') {
        return matchText && (accion.includes('sesión') || accion.includes('login') || accion.includes('auth'));
      }
      if (filtro === 'solicitudes') {
        return matchText && (accion.includes('solicitud') || accion.includes('estado'));
      }
      if (filtro === 'sistema') {
        return matchText && (!accion.includes('sesión') && !accion.includes('login') && !accion.includes('solicitud') && !accion.includes('estado'));
      }
      return matchText;
    });
  }, [logs, filtro, query]);

  const totalPaginas = Math.max(1, Math.ceil(logsFiltrados.length / REGISTROS_POR_PAGINA));
  const logsPagina = logsFiltrados.slice(
    (pagina - 1) * REGISTROS_POR_PAGINA,
    pagina * REGISTROS_POR_PAGINA,
  );

  const irAPagina = (nueva: number) => {
    setPagina(nueva);
    inicioLista.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Estadísticas rápidas calculadas en base a los logs.
  const stats = useMemo(() => {
    const totales = logs.length;
    const logins = logs.filter(l => l.accion.toLowerCase().includes('sesión')).length;
    const criticos = logs.filter(l => l.accion.toLowerCase().includes('cancelar')).length;
    return { totales, logins, criticos };
  }, [logs]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Log de auditoría</h1>
        <p className="text-sm text-slate">
          Registro inmutable de acciones de usuarios en el sistema.
        </p>
      </header>

        {/* Panel de Estadísticas (WOW Factor / Glassmorphism) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex flex-col justify-between bg-white border border-line">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-2">
              Acciones registradas
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-ink">{stats.totales}</span>
              <span className="text-xs text-green-600">
                {stats.totales >= MAX_REGISTROS ? `Últimos ${MAX_REGISTROS}` : 'Histórico completo'}
              </span>
            </div>
          </div>
          <div className="card p-4 flex flex-col justify-between bg-white border border-line">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-2">
              Inicios de sesión
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-emerald-700">{stats.logins}</span>
              <span className="text-xs text-slate">Sesiones de usuario</span>
            </div>
          </div>
          <div className="card p-4 flex flex-col justify-between bg-white border border-line">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-2">
              Acciones críticas
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-extrabold text-rose-700">{stats.criticos}</span>
              <span className="text-xs text-rose-500">Cancelaciones / Alertas</span>
            </div>
          </div>
        </section>

        {/* Buscador y Filtros */}
        <section ref={inicioLista} className="scroll-mt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por usuario, acción u objeto..."
            className="field max-w-md"
          />

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setFiltro(f.value);
                  setPagina(1);
                }}
                className={`pill shrink-0 border text-xs py-1.5 px-3.5 ${
                  filtro === f.value
                    ? 'border-transparent bg-green-700 text-white'
                    : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tabla / Lista Responsiva */}
        {loading ? (
          <p className="text-slate py-8 text-center">Cargando logs de auditoría…</p>
        ) : error ? (
          <p className="text-rose-600 py-8 text-center">{error}</p>
        ) : logsFiltrados.length === 0 ? (
          <EmptyState message="No se encontraron registros de auditoría para tu búsqueda." />
        ) : (
          <>
            {/* VISTA MÓVIL: Tarjetas compactas */}
            <div className="block md:hidden space-y-3">
              {logsPagina.map((log) => (
                <div key={log.id} className="card p-4 space-y-3 border border-line bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold block text-sm text-ink">{log.usuario}</span>
                      <span className="text-xs text-slate-2">{log.rol}</span>
                    </div>
                    <span className="text-[11px] text-slate-2">{formatoFecha(log.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className={`pill border text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorAccion(log.accion)}`}>
                      {log.accion}
                    </span>
                    <span className="text-xs font-mono text-slate-2">{log.ip}</span>
                  </div>

                  <div className="bg-canvas/50 rounded p-2 text-xs">
                    <span className="text-slate-2 uppercase font-semibold text-[9px] block">Objeto afectado</span>
                    <span className="text-ink font-medium">{log.objetoAfectado}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA DESKTOP / TABLET: Tabla formal */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line bg-canvas/30 text-xs font-semibold uppercase text-slate-2">
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Acción</th>
                    <th className="px-6 py-4">Objeto Afectado</th>
                    <th className="px-6 py-4">Dirección IP</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {logsPagina.map((log) => (
                    <tr key={log.id} className="hover:bg-canvas/10 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-ink block">{log.usuario}</span>
                          <span className="text-xs text-slate-2">{log.rol}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`pill border text-xs font-semibold px-2.5 py-0.5 rounded-full ${colorAccion(log.accion)}`}>
                          {log.accion}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-ink">
                        {log.objetoAfectado}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate">
                        {log.ip}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate">
                        {formatoFecha(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <nav
                aria-label="Páginas del registro de auditoría"
                className="flex flex-wrap items-center justify-center gap-2"
              >
                <button
                  onClick={() => irAPagina(pagina - 1)}
                  disabled={pagina === 1}
                  className="pill border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100 disabled:opacity-40"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => irAPagina(n)}
                    aria-current={n === pagina ? 'page' : undefined}
                    className={`pill min-w-8 border px-2.5 py-1.5 text-xs ${
                      n === pagina
                        ? 'border-transparent bg-green-700 text-white'
                        : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => irAPagina(pagina + 1)}
                  disabled={pagina === totalPaginas}
                  className="pill border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100 disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </nav>
            )}
            <p className="text-center text-xs text-slate-2">
              Mostrando {(pagina - 1) * REGISTROS_POR_PAGINA + 1}–
              {Math.min(pagina * REGISTROS_POR_PAGINA, logsFiltrados.length)} de{' '}
              {logsFiltrados.length} registros
            </p>

          <p className="text-center text-xs text-slate-2 pt-2">
            🛡️ Logs inmutables de auditoría protegidos bajo normativas de trazabilidad municipal.
          </p>
        </>
      )}
    </div>
  );
}
