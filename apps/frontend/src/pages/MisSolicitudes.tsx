import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelarSolicitud,
  fetchCatalogo,
  fetchMisSolicitudes,
  fetchSolicitud,
  formatearPrecio,
  reenviarSolicitud,
  type EstadoSolicitud,
  type ResiduoCatalogo,
  type SolicitudRetiro,
} from '../api/arca';
import {
  BackButton,
  EmptyState,
  EstadoPill,
  ListItemCard,
  metaDeEstado,
  ScreenHeader,
  IconClipboard,
  IconRecycle,
  IconCheck,
  IconPencil,
} from '../components/ui';
import { useSession } from '../auth/SessionContext';

// Misma regla que ESTADOS_CANCELABLES_POR_VECINO en @arca/core: el vecino cancela
// antes de la derivación y solo si no pagó. El backend la valida igual.
const CANCELABLES: EstadoSolicitud[] = [
  'en_revision',
  'requiere_modificacion',
  'aprobada',
];

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
  const { sesion } = useSession();
  const usuarioCiudadanoId = sesion?.ciudadanoId ?? null;
  const [items, setItems] = useState<SolicitudRetiro[]>([]);
  const [ocultas, setOcultas] = useState<number[]>([]);
  const [seleccion, setSeleccion] = useState<SolicitudRetiro | null>(null);
  const [catalogo, setCatalogo] = useState<ResiduoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  // Estados para HU-03 (Corregir y reenviar solicitud que requiere cambios)
  const [editandoCorreccion, setEditandoCorreccion] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [nuevoResiduoId, setNuevoResiduoId] = useState<number | ''>('');

  useEffect(() => {
    fetchCatalogo()
      .then(setCatalogo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!usuarioCiudadanoId) return;
    let cancelado = false;
    Promise.resolve().then(() => {
      if (!cancelado) {
        setOcultas(leerOcultas(usuarioCiudadanoId));
      }
    });
    fetchMisSolicitudes(usuarioCiudadanoId)
      .then((data) => {
        if (!cancelado) setItems(data);
      })
      .catch((e: Error) => {
        if (!cancelado) setError(e.message);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [usuarioCiudadanoId]);

  const visibles = useMemo(
    () => items.filter((s) => !ocultas.includes(s.id)),
    [items, ocultas],
  );

  const abrirDetalle = (s: SolicitudRetiro) => {
    setError(null);
    setMensajeExito(null);
    setSeleccion(s);
    setEditandoCorreccion(false);
    setNuevaDescripcion(s.descripcion || '');
    setNuevoResiduoId(s.residuoCatalogoId);

    // Cargar detalle completo desde el backend con su última revisión municipal
    fetchSolicitud(s.id)
      .then((det) => {
        setSeleccion(det);
        setNuevaDescripcion(det.descripcion || '');
        setNuevoResiduoId(det.residuoCatalogoId);
      })
      .catch(() => {});
  };

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
      await cancelarSolicitud(
        id,
        usuarioCiudadanoId,
        'Cancelada por el ciudadano',
      );
      const nuevas = [...leerOcultas(usuarioCiudadanoId), id];
      localStorage.setItem(
        claveOcultas(usuarioCiudadanoId),
        JSON.stringify(nuevas),
      );
      setOcultas(nuevas);
      setSeleccion(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcesando(false);
    }
  };

  const enviarCorreccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seleccion) return;
    setProcesando(true);
    setError(null);
    try {
      const actualizada = await reenviarSolicitud(seleccion.id, {
        descripcion: nuevaDescripcion.trim() || undefined,
        residuoCatalogoId: nuevoResiduoId ? Number(nuevoResiduoId) : undefined,
      });

      setSeleccion(actualizada);
      setItems((prev) =>
        prev.map((s) => (s.id === actualizada.id ? actualizada : s)),
      );
      setEditandoCorreccion(false);
      setMensajeExito(
        'Tu solicitud ha sido corregida y reenviada exitosamente a revisión municipal.',
      );
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <p className="text-slate">Cargando solicitudes…</p>;

  // --- Detalle de una solicitud ---------------------------------------------
  if (seleccion) {
    const categoria = seleccion.residuoCatalogo?.categoria;
    const pagada = seleccion.estadoPago === 'pagado';
    const puedeCancelar = CANCELABLES.includes(seleccion.estado) && !pagada;
    const requiereCambios = seleccion.estado === 'requiere_modificacion';

    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <BackButton onClick={() => setSeleccion(null)} />

        {error && <p className="pill w-full bg-rose-100 text-rose-600">{error}</p>}

        {mensajeExito && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            <IconCheck className="h-4 w-4 text-green-700 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Banner HU-03: Tu solicitud requiere cambios */}
        {requiereCambios && (
          <section className="rounded-lg border-2 border-sky-300 bg-sky-50/80 p-5 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-200 text-sky-800 font-bold text-xs">
                  !
                </span>
                <h2 className="text-base font-bold text-sky-950">
                  Tu solicitud requiere cambios
                </h2>
              </div>
              <span className="pill bg-sky-200 text-sky-900 text-[11px] font-semibold">
                Acción requerida
              </span>
            </div>

            <p className="text-xs text-sky-900 leading-relaxed">
              El equipo municipal revisó tu solicitud y necesita información adicional o corregir datos para poder aprobar el retiro.
            </p>

            {/* Motivo y Comentario del funcionario (NUNCA notas internas ni checklist) */}
            <div className="rounded-md bg-white p-3.5 border border-sky-200 text-xs space-y-2">
              {seleccion.ultimaRevision?.motivo && (
                <div>
                  <span className="font-bold text-sky-900 uppercase tracking-wider text-[10px]">
                    Motivo indicado:
                  </span>
                  <p className="font-semibold text-ink mt-0.5">
                    {seleccion.ultimaRevision.motivo}
                  </p>
                </div>
              )}

              <div>
                <span className="font-bold text-sky-900 uppercase tracking-wider text-[10px]">
                  Comentario del funcionario:
                </span>
                <p className="text-ink mt-0.5 leading-relaxed bg-canvas/60 p-2.5 rounded border border-line">
                  {seleccion.ultimaRevision?.comentario ||
                    'Por favor revisa la descripción o la categoría asignada y reenvía tu solicitud para continuar con la coordinación.'}
                </p>
              </div>
            </div>

            {/* Formulario de corrección o botón para abrirlo */}
            {!editandoCorreccion ? (
              <button
                type="button"
                onClick={() => setEditandoCorreccion(true)}
                className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <IconPencil className="h-3.5 w-3.5" />
                <span>Corregir y reenviar solicitud</span>
              </button>
            ) : (
              <form onSubmit={enviarCorreccion} className="space-y-3 pt-2 border-t border-sky-200">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Tipo de residuo
                  </label>
                  <select
                    value={nuevoResiduoId}
                    onChange={(e) =>
                      setNuevoResiduoId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="field text-xs bg-white py-2"
                  >
                    {catalogo.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre} — {cat.categoria} ({formatearPrecio(cat.precio)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Descripción corregida
                  </label>
                  <textarea
                    rows={3}
                    value={nuevaDescripcion}
                    onChange={(e) => setNuevaDescripcion(e.target.value)}
                    placeholder="Escribe los detalles o correcciones solicitadas por el municipio..."
                    className="field text-xs bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditandoCorreccion(false)}
                    className="btn-outline flex-1 py-2 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={procesando}
                    className="btn-primary flex-1 py-2 text-xs font-semibold"
                  >
                    {procesando ? 'Reenviando…' : 'Reenviar solicitud a revisión'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* Tarjeta de Información General de la Solicitud */}
        <div className="card space-y-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-extrabold text-ink">
                {seleccion.residuoCatalogo?.nombre ??
                  `Residuo #${seleccion.residuoCatalogoId}`}
              </h1>
              {categoria && (
                <p className="text-sm text-slate">
                  {categoria} ·{' '}
                  {formatearPrecio(seleccion.residuoCatalogo?.precio ?? 0)}
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
            {pagada
              ? 'Esta solicitud ya fue pagada y no se puede cancelar.'
              : `Esta solicitud está en estado «${metaDeEstado(seleccion.estado).label}» y no se puede cancelar.`}
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
          icon={<IconClipboard className="h-7 w-7 text-green-700" />}
          message="Aún no tienes solicitudes registradas."
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
                  icon={<IconRecycle className="h-5 w-5 text-green-700" />}
                  title={s.residuoCatalogo?.nombre ?? `Residuo #${s.residuoCatalogoId}`}
                  titleBadge={<EstadoPill estado={s.estado} />}
                  lines={[
                    `${categoria ? `${categoria} · ` : ''}${
                      s.residuoCatalogo ? formatearPrecio(s.residuoCatalogo.precio) : ''
                    }`,
                    fechaLarga(s.fechaSolicitud),
                  ]}
                  trailing={<span className="text-slate-2">›</span>}
                  onClick={() => abrirDetalle(s)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
