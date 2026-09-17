import { useEffect, useState } from 'react';
import {
  actualizarSolicitud,
  fetchSolicitud,
  fetchSolicitudesAdmin,
  formatearPrecio,
  liberarSolicitud,
  mensajeDeError,
  tomarSolicitud,
  type EstadoPago,
  type EstadoSolicitud,
  type SolicitudDetalle,
  type SolicitudRetiro,
} from '../api/admin';
import {
  BackButton,
  EmptyState,
  EstadoPill,
  ListItemCard,
} from '../components/ui';
import {
  HistorialYNotas,
  TarjetaRevision,
} from '../components/RevisionSolicitud';

const FILTROS: { value: EstadoSolicitud | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'requiere_modificacion', label: 'Modificación pedida' },
  { value: 'aprobada', label: 'Aprobadas' },
  { value: 'derivada', label: 'Derivadas' },
  { value: 'retirada', label: 'Retiradas' },
  { value: 'no_realizada', label: 'No realizadas' },
  { value: 'rechazada', label: 'Rechazadas' },
  { value: 'cancelada', label: 'Canceladas' },
];

// Texto del botón según el estado destino. El panel nunca ofrece `cancelada`
// (es acción del vecino), pero el Record exige todas las claves.
const ACCION: Record<EstadoSolicitud, { label: string; peligro?: boolean }> = {
  en_revision: { label: 'Reabrir', peligro: true },
  requiere_modificacion: { label: 'Pedir modificación' },
  aprobada: { label: 'Aprobar' },
  rechazada: { label: 'Rechazar', peligro: true },
  derivada: { label: 'Marcar como derivada' },
  retirada: { label: 'Marcar como retirada' },
  no_realizada: { label: 'Marcar como no realizada', peligro: true },
  cancelada: { label: 'Cancelar', peligro: true },
};

const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  no_aplica: 'Sin cobro',
  pendiente: 'Pago pendiente',
  pagado: 'Pagado',
};

// Plazo tras el cual una solicitud en revisión se marca como atrasada.
const HORAS_ATRASO = 48;

const atrasada = (s: SolicitudRetiro): boolean =>
  s.estado === 'en_revision' &&
  Date.now() - new Date(s.fechaSolicitud).getTime() >
    HORAS_ATRASO * 60 * 60 * 1000;

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
  const [filtro, setFiltro] = useState<EstadoSolicitud | 'todas'>(
    'en_revision',
  );
  const [items, setItems] = useState<SolicitudRetiro[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
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

  if (seleccionId !== null) {
    return (
      <DetalleSolicitud
        id={seleccionId}
        onVolver={() => {
          setSeleccionId(null);
          cargar();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Solicitudes de retiro</h1>
        <p className="text-sm text-slate">
          Revisa cada solicitud y deriva las aprobadas a la empresa operadora.
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
                lines={[
                  s.descripcion ?? 'Sin descripción',
                  <>
                    {formatoFecha(s.fechaSolicitud)}
                    {atrasada(s) && (
                      <span className="font-semibold text-rose-600">
                        {' '}· +{HORAS_ATRASO} h sin revisar
                      </span>
                    )}
                  </>,
                ]}
                onClick={() => setSeleccionId(s.id)}
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
  id,
  onVolver,
}: {
  id: number;
  onVolver: () => void;
}) {
  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Acción elegida esperando confirmación.
  const [porConfirmar, setPorConfirmar] = useState<EstadoSolicitud | null>(null);
  // La tiene tomada otro funcionario: la revisión queda en solo lectura.
  const [tomadaPorOtro, setTomadaPorOtro] = useState(false);
  // Sube cada vez que la solicitud cambia, para recargar historial y notas.
  const [version, setVersion] = useState(0);

  const cargar = () =>
    fetchSolicitud(id)
      .then((s) => {
        setSolicitud(s);
        setVersion((v) => v + 1);
      })
      .catch((e: Error) => setError(e.message));

  // Al abrir una solicitud en revisión el panel la toma, para que dos
  // funcionarios no la revisen a la vez, y la libera al salir del detalle.
  useEffect(() => {
    let cancelado = false;
    let tomada = false;

    const abrir = async () => {
      try {
        const s = await fetchSolicitud(id);
        // Si ya se salió (o StrictMode desmontó), no se toma: soltarla después
        // podría liberar la toma del montaje que sí sigue abierto.
        if (cancelado) return;
        if (s.estado === 'en_revision') {
          try {
            await tomarSolicitud(id);
            tomada = true;
            if (cancelado) void liberarSolicitud(id);
          } catch (e) {
            if (!(e as Error).message.startsWith('Error 409')) throw e;
            if (!cancelado) setTomadaPorOtro(true);
          }
        }
        // Se vuelve a leer para mostrar quién la tiene tomada.
        const actual = s.estado === 'en_revision' ? await fetchSolicitud(id) : s;
        if (!cancelado) setSolicitud(actual);
      } catch (e) {
        if (!cancelado) setError(mensajeDeError(e));
      }
    };
    void abrir();

    return () => {
      cancelado = true;
      if (tomada) void liberarSolicitud(id);
    };
  }, [id]);

  const confirmar = async () => {
    if (!porConfirmar) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarSolicitud(id, { estado: porConfirmar });
      setPorConfirmar(null);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  if (!solicitud) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <BackButton onClick={onVolver}>← Volver al listado</BackButton>
        {error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : (
          <p className="text-slate">Cargando solicitud…</p>
        )}
      </div>
    );
  }

  const revisor = solicitud.revisadoPor
    ? `${solicitud.revisadoPor.nombre} ${solicitud.revisadoPor.apellido}`
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <BackButton onClick={onVolver}>← Volver al listado</BackButton>

      <div className="card space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold">Solicitud #{solicitud.id}</h1>
            <p className="text-sm text-slate">
              {solicitud.residuoCatalogo?.nombre ??
                `Residuo ${solicitud.residuoCatalogoId}`}
            </p>
          </div>
          <EstadoPill estado={solicitud.estado} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Dato label="Categoría" valor={solicitud.residuoCatalogo?.categoria} />
          {/* Referencia seudónima, igual que en la auditoría: el panel no necesita saber quién es. */}
          <Dato
            label="Vecino"
            valor={`Vecino · ${solicitud.usuarioCiudadanoId.slice(0, 8)}`}
          />
          <Dato label="Solicitada" valor={formatoFecha(solicitud.fechaSolicitud)} />
          <Dato
            label="Revisión"
            valor={
              solicitud.fechaRevision
                ? `${formatoFecha(solicitud.fechaRevision)}${revisor ? ` · ${revisor}` : ''}`
                : null
            }
          />
          <Dato
            label="Pago"
            valor={
              solicitud.monto !== null
                ? `${ETIQUETA_PAGO[solicitud.estadoPago]} · ${formatearPrecio(solicitud.monto)}`
                : ETIQUETA_PAGO[solicitud.estadoPago]
            }
          />
          <Dato label="Cierre" valor={formatoFecha(solicitud.fechaCierre)} />
          <Dato label="Dirección" valor={solicitud.direccionAnonimizada} full />
          <Dato label="Descripción" valor={solicitud.descripcion} full />
          {solicitud.razonRechazo && (
            <Dato label="Motivo" valor={solicitud.razonRechazo} full />
          )}
        </dl>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {solicitud.estado === 'en_revision' && (
        <>
          {tomadaPorOtro && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {solicitud.tomadaPor
                ? `${solicitud.tomadaPor.nombre} ${solicitud.tomadaPor.apellido} está revisando esta solicitud.`
                : 'Otro funcionario está revisando esta solicitud.'}{' '}
              Puedes verla, pero no decidir hasta que la libere.
            </p>
          )}
          <TarjetaRevision
            solicitud={solicitud}
            soloLectura={tomadaPorOtro}
            onCambio={cargar}
          />
        </>
      )}

      {(solicitud.estado !== 'en_revision' ||
        solicitud.transicionesDisponibles.length > 0) && (
        <div className="card space-y-3 p-5">
          <h2 className="font-bold">Acciones</h2>

          {solicitud.transicionesDisponibles.length === 0 ? (
            <p className="text-sm text-slate">
              No hay acciones disponibles para tu perfil en este estado.
            </p>
          ) : porConfirmar ? (
            <div className="space-y-3">
              <p className="text-sm text-ink">
                ¿Confirmas la acción <strong>«{ACCION[porConfirmar].label}»</strong> para la
                solicitud #{solicitud.id}?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={guardando}
                  className="btn-primary"
                >
                  {guardando ? 'Guardando…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => setPorConfirmar(null)}
                  disabled={guardando}
                  className="btn-ghost"
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {solicitud.transicionesDisponibles.map((estado) => (
                <button
                  key={estado}
                  type="button"
                  onClick={() => setPorConfirmar(estado)}
                  className={`pill border px-4 py-2 text-sm ${
                    ACCION[estado].peligro
                      ? 'border-rose-600 text-rose-600 hover:bg-rose-100'
                      : 'border-green-700 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {ACCION[estado].label}
                </button>
              ))}
            </div>
          )}

          {solicitud.estado === 'aprobada' && solicitud.estadoPago === 'pendiente' && (
            <p className="text-xs text-slate-2">
              Se podrá derivar cuando el vecino complete el pago.
            </p>
          )}
        </div>
      )}

      <HistorialYNotas solicitudId={solicitud.id} version={version} />
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
