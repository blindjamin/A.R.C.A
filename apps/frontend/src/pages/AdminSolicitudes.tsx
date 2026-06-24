import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  actualizarSolicitud,
  fetchSolicitudesAdmin,
  type EstadoSolicitud,
  type SolicitudRetiro,
} from '../api/arca';

const ESTADO_META: Record<EstadoSolicitud, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-gold-100 text-gold-600' },
  asignada: { label: 'Asignada', cls: 'bg-sky-100 text-sky-600' },
  en_proceso: { label: 'En ruta', cls: 'bg-green-100 text-green-700' },
  completada: { label: 'Completada', cls: 'bg-green-600 text-white' },
  cancelada: { label: 'Cancelada', cls: 'bg-line-2 text-slate' },
};

const FILTROS: { value: EstadoSolicitud | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'asignada', label: 'Asignadas' },
  { value: 'en_proceso', label: 'En ruta' },
  { value: 'completada', label: 'Completadas' },
  { value: 'cancelada', label: 'Canceladas' },
];

const formatoFecha = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('es-CL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default function AdminSolicitudes() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<EstadoSolicitud | 'todas'>('todas');
  const [items, setItems] = useState<SolicitudRetiro[]>([]);
  const [seleccion, setSeleccion] = useState<SolicitudRetiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    setLoading(true);
    fetchSolicitudesAdmin(filtro === 'todas' ? undefined : filtro)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const onActualizada = () => {
    setSeleccion(null);
    cargar();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-canvas shadow-lg">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-extrabold tracking-tight text-green-700">
            A.R.C.A. · Admin
          </span>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-slate-2 hover:text-ink"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 py-5">
        {seleccion ? (
          <DetalleSolicitud
            solicitud={seleccion}
            onVolver={() => setSeleccion(null)}
            onActualizada={onActualizada}
          />
        ) : (
          <div className="space-y-4">
            <header>
              <h1 className="text-2xl font-extrabold">Solicitudes de retiro</h1>
              <p className="text-sm text-slate">
                Revisa, asigna y gestiona los retiros municipales.
              </p>
            </header>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltro(f.value)}
                  className={`pill shrink-0 ${
                    filtro === f.value
                      ? 'bg-green-700 text-white'
                      : 'bg-line-2 text-slate'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-slate">Cargando solicitudes…</p>
            ) : error ? (
              <p className="text-rose-600">{error}</p>
            ) : items.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-sm text-slate">
                  No hay solicitudes en este estado.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {items.map((s) => {
                  const meta = ESTADO_META[s.estado];
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setSeleccion(s)}
                        className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-green-50/40"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-green-50 text-xl">
                          ♻️
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-bold">
                              #{s.id} ·{' '}
                              {s.residuoCatalogo?.nombre ??
                                `Residuo ${s.residuoCatalogoId}`}
                            </p>
                            <span className={`pill ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="truncate text-sm text-slate">
                            {s.descripcion ?? 'Sin descripción'}
                          </p>
                          <p className="text-xs text-slate-2">
                            {formatoFecha(s.fechaSolicitud)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// --- Detalle + acciones -----------------------------------------------------

function DetalleSolicitud({
  solicitud,
  onVolver,
  onActualizada,
}: {
  solicitud: SolicitudRetiro;
  onVolver: () => void;
  onActualizada: () => void;
}) {
  const [operadorId, setOperadorId] = useState('');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = ESTADO_META[solicitud.estado];

  const aplicar = async (cambios: Parameters<typeof actualizarSolicitud>[1]) => {
    setGuardando(true);
    setError(null);
    try {
      await actualizarSolicitud(solicitud.id, cambios);
      onActualizada();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  const asignar = () => {
    if (!operadorId.trim()) {
      setError('Indica el ID del operador para asignar.');
      return;
    }
    aplicar({
      estado: 'asignada',
      operadorAsignadoId: operadorId.trim(),
      ...(fechaProgramada
        ? { fechaProgramada: new Date(fechaProgramada).toISOString() }
        : {}),
    });
  };

  const cancelar = () => {
    const razon = window.prompt('Motivo de la cancelación / rechazo:');
    if (razon === null) return;
    if (!razon.trim()) {
      setError('Debes indicar una razón para cancelar.');
      return;
    }
    aplicar({ estado: 'cancelada', razonRechazo: razon.trim() });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onVolver}
        className="text-sm text-slate-2 hover:text-ink"
      >
        ← Volver al listado
      </button>

      <div className="card space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold">
              Solicitud #{solicitud.id}
            </h1>
            <p className="text-sm text-slate">
              {solicitud.residuoCatalogo?.nombre ??
                `Residuo ${solicitud.residuoCatalogoId}`}
            </p>
          </div>
          <span className={`pill ${meta.cls}`}>{meta.label}</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Dato label="Categoría" valor={solicitud.residuoCatalogo?.categoria} />
          <Dato label="Ciudadano" valor={solicitud.usuarioCiudadanoId} />
          <Dato label="Solicitada" valor={formatoFecha(solicitud.fechaSolicitud)} />
          <Dato label="Programada" valor={formatoFecha(solicitud.fechaProgramada)} />
          <Dato label="Completada" valor={formatoFecha(solicitud.fechaCompletada)} />
          <Dato label="Operador" valor={solicitud.operadorAsignadoId} />
          <Dato
            label="Dirección"
            valor={solicitud.direccionAnonimizada}
            full
          />
          <Dato label="Descripción" valor={solicitud.descripcion} full />
          {solicitud.razonRechazo && (
            <Dato label="Razón rechazo" valor={solicitud.razonRechazo} full />
          )}
        </dl>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* Acciones según estado actual (la validación final la hace el backend) */}
      <div className="card space-y-3 p-5">
        <h2 className="font-bold">Acciones</h2>

        {solicitud.estado === 'pendiente' && (
          <div className="space-y-2">
            <input
              value={operadorId}
              onChange={(e) => setOperadorId(e.target.value)}
              placeholder="ID del operador (UUID)"
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              value={fechaProgramada}
              onChange={(e) => setFechaProgramada(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
            <button
              onClick={asignar}
              disabled={guardando}
              className="btn-primary w-full"
            >
              Asignar operador
            </button>
          </div>
        )}

        {solicitud.estado === 'asignada' && (
          <button
            onClick={() => aplicar({ estado: 'en_proceso' })}
            disabled={guardando}
            className="btn-primary w-full"
          >
            Iniciar retiro (en ruta)
          </button>
        )}

        {solicitud.estado === 'en_proceso' && (
          <button
            onClick={() => aplicar({ estado: 'completada' })}
            disabled={guardando}
            className="btn-primary w-full"
          >
            Marcar como completada
          </button>
        )}

        {(solicitud.estado === 'pendiente' ||
          solicitud.estado === 'asignada' ||
          solicitud.estado === 'en_proceso') && (
          <button
            onClick={cancelar}
            disabled={guardando}
            className="w-full rounded-pill border border-rose-300 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            Cancelar / rechazar
          </button>
        )}

        {(solicitud.estado === 'completada' ||
          solicitud.estado === 'cancelada') && (
          <p className="text-sm text-slate">
            Esta solicitud ya está {meta.label.toLowerCase()}. No admite más
            cambios.
          </p>
        )}
      </div>
    </div>
  );
}

function Dato({
  label,
  valor,
  full,
}: {
  label: string;
  valor?: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-xs uppercase tracking-wide text-slate-2">{label}</dt>
      <dd className="break-words text-ink">{valor || '—'}</dd>
    </div>
  );
}
