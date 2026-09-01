import { useEffect, useState } from 'react';
import {
  actualizarSolicitud,
  fetchSolicitudesAdmin,
  type EstadoSolicitud,
  type SolicitudRetiro,
} from '../api/admin';
import {
  BackButton,
  EmptyState,
  ESTADO_META,
  EstadoPill,
  ListItemCard,
} from '../components/ui';
import AsignarRetiroModal, {
  type AsignacionRetiroPayload,
} from '../components/AsignarRetiroModal';

const ESTADOS: EstadoSolicitud[] = [
  'pendiente',
  'asignada',
  'en_proceso',
  'completada',
  'cancelada',
];

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

export default function Solicitudes() {
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
    let cancelado = false;
    Promise.resolve().then(() => {
      if (!cancelado) cargar();
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const onActualizada = () => {
    setSeleccion(null);
    cargar();
  };

  if (seleccion) {
    return (
      <DetalleSolicitud
        solicitud={seleccion}
        onVolver={() => setSeleccion(null)}
        onActualizada={onActualizada}
      />
    );
  }

  return (
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
        <EmptyState message="No hay solicitudes en este estado." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <li key={s.id}>
              <ListItemCard
                icon="♻️"
                title={
                  <>
                    #{s.id} ·{' '}
                    {s.residuoCatalogo?.nombre ?? `Residuo ${s.residuoCatalogoId}`}
                  </>
                }
                titleBadge={<EstadoPill estado={s.estado} />}
                lines={[s.descripcion ?? 'Sin descripción', formatoFecha(s.fechaSolicitud)]}
                onClick={() => setSeleccion(s)}
              />
            </li>
          ))}
        </ul>
      )}
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
  const [mostrarAsignacion, setMostrarAsignacion] = useState(false);

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

  const cambiarEstado = (nuevo: EstadoSolicitud) => {
    if (nuevo === solicitud.estado || guardando) return;

    if (nuevo === 'asignada') {
      const op = operadorId.trim() || solicitud.operadorAsignadoId || '';
      if (!op) {
        setError('Indica el ID del operador para asignar.');
        return;
      }
      aplicar({
        estado: 'asignada',
        operadorAsignadoId: op,
        ...(fechaProgramada
          ? { fechaProgramada: new Date(fechaProgramada).toISOString() }
          : {}),
      });
      return;
    }

    if (nuevo === 'cancelada') {
      const razon = window.prompt('Motivo de la cancelación / rechazo (opcional):') ?? '';
      aplicar({ estado: 'cancelada', ...(razon.trim() ? { razonRechazo: razon.trim() } : {}) });
      return;
    }

    aplicar({ estado: nuevo });
  };

  const handleAsignarRetiro = async ({
    operadorId: operadorSeleccionado,
    fechaProgramada: fechaSeleccionada,
    estado,
  }: AsignacionRetiroPayload) => {
    await aplicar({
      estado,
      operadorAsignadoId: operadorSeleccionado,
      fechaProgramada: fechaSeleccionada,
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <BackButton onClick={onVolver}>← Volver al listado</BackButton>

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
          <EstadoPill estado={solicitud.estado} />
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

      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">Programar retiro</h2>
          <button
            type="button"
            onClick={() => setMostrarAsignacion(true)}
            className="btn-primary"
          >
            Programar retiro
          </button>
        </div>
        <p className="text-sm text-slate">
          Define fecha, franja horaria y operador para esta solicitud.
        </p>
      </div>

      <AsignarRetiroModal
        isOpen={mostrarAsignacion}
        onClose={() => setMostrarAsignacion(false)}
        solicitud={solicitud}
        onConfirm={handleAsignarRetiro}
      />

      {/* Cambio de estado libre (incl. revertir), para operar/probar el flujo. */}
      <div className="card space-y-3 p-5">
        <h2 className="font-bold">Cambiar estado</h2>

        <div className="space-y-2">
          <input
            value={operadorId}
            onChange={(e) => setOperadorId(e.target.value)}
            placeholder="ID del operador (UUID) — requerido para asignar"
            className="w-full rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={fechaProgramada}
            onChange={(e) => setFechaProgramada(e.target.value)}
            className="w-full rounded-md border border-line px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {ESTADOS.map((est) => {
            const m = ESTADO_META[est];
            const actual = est === solicitud.estado;
            return (
              <button
                key={est}
                onClick={() => cambiarEstado(est)}
                disabled={guardando || actual}
                className={`pill justify-center py-2 text-sm ${
                  actual
                    ? `${m.cls} ring-2 ring-offset-1 ring-green-600`
                    : 'border border-line text-ink hover:bg-canvas'
                } disabled:cursor-default`}
              >
                {actual ? `● ${m.label}` : m.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-2">
          Estado actual marcado con ●. Puedes avanzar o revertir libremente.
        </p>
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
