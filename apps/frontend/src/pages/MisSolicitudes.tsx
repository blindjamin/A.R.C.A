import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelarSolicitud,
  fetchMisSolicitudes,
  formatearPrecio,
  precioReferencial,
  type EstadoSolicitud,
  type SolicitudRetiro,
} from '../api/arca';
import { useSession } from '../auth/SessionContext';

const ESTADO_META: Record<EstadoSolicitud, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-gold-100 text-gold-600' },
  asignada: { label: 'Asignada', cls: 'bg-sky-100 text-sky-600' },
  en_proceso: { label: 'En ruta', cls: 'bg-green-100 text-green-700' },
  completada: { label: 'Completada', cls: 'bg-green-600 text-white' },
  cancelada: { label: 'Cancelada', cls: 'bg-line-2 text-slate' },
};

// El ciudadano solo puede cancelar si NO está en tránsito ni completada.
const CANCELABLES: EstadoSolicitud[] = ['pendiente', 'asignada'];

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

// Las solicitudes que el ciudadano cancela se ocultan de SU lista (ids por usuario).
const claveOcultas = (usuarioId: string) => `arca.solicitudesOcultas.${usuarioId}`;
const leerOcultas = (usuarioId: string): number[] => {
  try {
    return JSON.parse(localStorage.getItem(claveOcultas(usuarioId)) ?? '[]');
  } catch {
    return [];
  }
};

export default function MisSolicitudes() {
  const { usuarioCiudadanoId } = useSession();
  const [items, setItems] = useState<SolicitudRetiro[]>([]);
  const [ocultas, setOcultas] = useState<number[]>([]);
  const [seleccion, setSeleccion] = useState<SolicitudRetiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!usuarioCiudadanoId) return;
    setOcultas(leerOcultas(usuarioCiudadanoId));
    fetchMisSolicitudes(usuarioCiudadanoId)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [usuarioCiudadanoId]);

  const visibles = useMemo(
    () => items.filter((s) => !ocultas.includes(s.id)),
    [items, ocultas],
  );

  const cancelar = async (id: number) => {
    if (!usuarioCiudadanoId) return;
    if (
      !window.confirm(
        '¿Cancelar esta solicitud? Dejará de aparecer en tu lista.',
      )
    )
      return;

    setProcesando(true);
    setError(null);
    try {
      await cancelarSolicitud(id, usuarioCiudadanoId, 'Cancelada por el ciudadano');
      const nuevas = [...leerOcultas(usuarioCiudadanoId), id];
      localStorage.setItem(claveOcultas(usuarioCiudadanoId), JSON.stringify(nuevas));
      setOcultas(nuevas);
      setSeleccion(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <p className="text-slate">Cargando solicitudes…</p>;

  // --- Detalle de una solicitud ---------------------------------------------
  if (seleccion) {
    const meta = ESTADO_META[seleccion.estado];
    const categoria = seleccion.residuoCatalogo?.categoria;
    const puedeCancelar = CANCELABLES.includes(seleccion.estado);
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSeleccion(null)}
          className="text-sm text-slate-2 hover:text-ink"
        >
          ← Volver
        </button>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="card space-y-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-extrabold">
                {seleccion.residuoCatalogo?.nombre ??
                  `Residuo #${seleccion.residuoCatalogoId}`}
              </h1>
              {categoria && (
                <p className="text-sm text-slate">
                  {categoria} · {formatearPrecio(precioReferencial(categoria))}
                </p>
              )}
            </div>
            <span className={`pill ${meta.cls}`}>{meta.label}</span>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-2">
              Descripción
            </p>
            <p className="mt-1 text-ink">
              {seleccion.descripcion || 'Sin descripción.'}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-2">
              Solicitada
            </p>
            <p className="mt-1 text-ink">{fechaLarga(seleccion.fechaSolicitud)}</p>
          </div>
        </div>

        {puedeCancelar ? (
          <button
            onClick={() => cancelar(seleccion.id)}
            disabled={procesando}
            className="w-full rounded-pill border border-rose-300 py-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            {procesando ? 'Cancelando…' : 'Cancelar solicitud'}
          </button>
        ) : (
          <p className="text-center text-xs text-slate-2">
            Esta solicitud ya está {meta.label.toLowerCase()} y no se puede cancelar.
          </p>
        )}
      </div>
    );
  }

  // --- Listado ---------------------------------------------------------------
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Mis solicitudes</h1>
        <p className="text-sm text-slate">
          Toca una solicitud para ver el detalle.
        </p>
      </header>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {visibles.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
            📋
          </div>
          <p className="text-sm text-slate">Aún no tienes solicitudes.</p>
          <Link to="/solicitar" className="btn-primary mt-4 inline-flex">
            Solicitar un retiro
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((s) => {
            const meta = ESTADO_META[s.estado];
            const categoria = s.residuoCatalogo?.categoria;
            return (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setError(null);
                    setSeleccion(s);
                  }}
                  className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-green-50/40"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-green-50 text-xl">
                    ♻️
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold">
                        {s.residuoCatalogo?.nombre ?? `Residuo #${s.residuoCatalogoId}`}
                      </p>
                      <span className={`pill ${meta.cls}`}>{meta.label}</span>
                    </div>
                    <p className="truncate text-sm text-slate">
                      {categoria ? `${categoria} · ` : ''}
                      {categoria ? formatearPrecio(precioReferencial(categoria)) : ''}
                    </p>
                    <p className="text-xs text-slate-2">{fechaLarga(s.fechaSolicitud)}</p>
                  </div>
                  <span className="text-slate-2">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
