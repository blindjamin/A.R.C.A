import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelarSolicitud,
  fetchMisSolicitudes,
  formatearPrecio,
  type EstadoSolicitud,
  type SolicitudRetiro,
} from '../api/arca';
import {
  BackButton,
  EmptyState,
  ESTADO_META,
  EstadoPill,
  ListItemCard,
  ScreenHeader,
} from '../components/ui';
import { useSession } from '../auth/SessionContext';

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
    const categoria = seleccion.residuoCatalogo?.categoria;
    const puedeCancelar = CANCELABLES.includes(seleccion.estado);
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <BackButton onClick={() => setSeleccion(null)} />

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
                  {categoria} · {formatearPrecio(seleccion.residuoCatalogo?.precio ?? 0)}
                </p>
              )}
            </div>
            <EstadoPill estado={seleccion.estado} />
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
            Esta solicitud ya está {ESTADO_META[seleccion.estado].label.toLowerCase()} y no
            se puede cancelar.
          </p>
        )}
      </div>
    );
  }

  // --- Listado ---------------------------------------------------------------
  return (
    <div className="space-y-4">
      <ScreenHeader
        title="Mis solicitudes"
        subtitle="Toca una solicitud para ver el detalle."
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {visibles.length === 0 ? (
        <EmptyState
          icon="📋"
          message="Aún no tienes solicitudes."
          action={
            <Link to="/solicitar" className="btn-primary inline-flex">
              Solicitar un retiro
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((s) => {
            const categoria = s.residuoCatalogo?.categoria;
            return (
              <li key={s.id}>
                <ListItemCard
                  icon="♻️"
                  title={s.residuoCatalogo?.nombre ?? `Residuo #${s.residuoCatalogoId}`}
                  titleBadge={<EstadoPill estado={s.estado} />}
                  lines={[
                    `${categoria ? `${categoria} · ` : ''}${
                      s.residuoCatalogo ? formatearPrecio(s.residuoCatalogo.precio) : ''
                    }`,
                    fechaLarga(s.fechaSolicitud),
                  ]}
                  trailing={<span className="text-slate-2">›</span>}
                  onClick={() => {
                    setError(null);
                    setSeleccion(s);
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
