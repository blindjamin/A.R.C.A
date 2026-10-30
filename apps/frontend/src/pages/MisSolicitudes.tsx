import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  IconCreditCard,
} from '../components/ui';
import { useSession } from '../auth/SessionContext';
import { CampoFoto } from '../features/solicitud-retiro/CampoFoto';

// Misma regla que ESTADOS_CANCELABLES_POR_VECINO en @arca/core: el vecino cancela
// antes de la derivación y solo si no pagó. El backend la valida igual.

const conEstadoPago = (s: SolicitudRetiro): SolicitudRetiro => {
  if (s.estado === 'aprobada' && s.estadoPago !== 'pagado') {
    return {
      ...s,
      estadoPago: 'pendiente',
      monto: s.monto ?? s.residuoCatalogo?.precio ?? 5000,
    };
  }
  return s;
};

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
  const navigate = useNavigate();
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
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevaFoto, setNuevaFoto] = useState<File | null>(null);
  const [nuevaFotoPreview, setNuevaFotoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalogo()
      .then(setCatalogo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!usuarioCiudadanoId) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    let cancelado = false;
    Promise.resolve().then(() => {
      if (!cancelado) {
        setOcultas(leerOcultas(usuarioCiudadanoId));
      }
    });
    fetchMisSolicitudes(usuarioCiudadanoId)
      .then((data) => {
        if (!cancelado) setItems(data.map(conEstadoPago));
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
    const conPago = conEstadoPago(s);
    setError(null);
    setMensajeExito(null);
    setSeleccion(conPago);
    setEditandoCorreccion(false);
    setNuevaDescripcion(s.descripcion || '');
    setNuevoResiduoId(s.residuoCatalogoId ?? '');
    setNuevaDireccion(s.direccionRetiro || '');
    setNuevaFoto(null);
    setNuevaFotoPreview(null);

    // Cargar detalle completo desde el backend con su última revisión municipal
    fetchSolicitud(conPago.id)
      .then((det) => {
        const detPago = conEstadoPago(det);
        setSeleccion(detPago);
        setNuevaDescripcion(det.descripcion || '');
        setNuevoResiduoId(det.residuoCatalogoId ?? '');
        setNuevaDireccion(det.direccionRetiro || '');
      })
      .catch(() => {});
  };

  const cancelar = async (id: number) => {
    if (!usuarioCiudadanoId) return;
    const esAprobadaOPendiente =
      seleccion?.id === id &&
      (seleccion.estado === 'aprobada' || seleccion.estadoPago === 'pendiente');
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
      if (
        esAprobadaOPendiente &&
        window.confirm(
          '¿Quieres aprovechar los datos y la foto de este residuo para ofrecerlo gratis en el Marketplace ahora?',
        )
      ) {
        const item = seleccion;
        setSeleccion(null);
        navigate('/marketplace/subir', {
          state: {
            importarSolicitud: {
              solicitudId: item.id,
              titulo: item.nombreResiduoOtro || item.residuoCatalogo?.nombre || '',
              descripcion: item.descripcion ?? '',
              residuoCatalogoId: item.residuoCatalogoId,
              nombreResiduoOtro: item.nombreResiduoOtro,
              fotoUrl: item.fotoUrl,
            },
          },
        });
        return;
      }
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
    const direccion = nuevaDireccion.trim();
    if (!direccion) {
      setError('La dirección de retiro no puede quedar vacía.');
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      const actualizada = await reenviarSolicitud(seleccion.id, {
        descripcion: nuevaDescripcion.trim() || undefined,
        residuoCatalogoId: nuevoResiduoId ? Number(nuevoResiduoId) : undefined,
        // Solo se mandan si cambiaron: el backend deja el resto como estaba.
        direccionRetiro:
          direccion !== (seleccion.direccionRetiro ?? '') ? direccion : undefined,
        foto: nuevaFoto ?? undefined,
      });

      setSeleccion(actualizada);
      setItems((prev) =>
        prev.map((s) => (s.id === actualizada.id ? actualizada : s)),
      );
      setEditandoCorreccion(false);
      setNuevaFoto(null);
      setNuevaFotoPreview(null);
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

  if (loading) return <p className="text-ink-2">Cargando solicitudes…</p>;

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

                <div>
                  <label
                    htmlFor="direccion-correccion"
                    className="block text-xs font-bold text-ink mb-1"
                  >
                    Dirección de retiro
                  </label>
                  <input
                    id="direccion-correccion"
                    type="text"
                    value={nuevaDireccion}
                    onChange={(e) => setNuevaDireccion(e.target.value)}
                    maxLength={500}
                    required
                    autoComplete="street-address"
                    className="field text-xs bg-white py-2"
                  />
                </div>

                <div>
                  <p className="block text-xs font-bold text-ink mb-1">
                    Foto <span className="font-normal text-slate-2">(sube una nueva si te la pidieron)</span>
                  </p>
                  <CampoFoto
                    preview={nuevaFotoPreview ?? seleccion.fotoUrl ?? null}
                    onElegir={(archivo, preview) => {
                      setError(null);
                      setNuevaFoto(archivo);
                      setNuevaFotoPreview(preview);
                    }}
                    onError={setError}
                    textoCambiar="Nueva foto"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoCorreccion(false);
                      setNuevaFoto(null);
                      setNuevaFotoPreview(null);
                    }}
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

        
        {/* Banner HU: Pago pendiente */}
        {seleccion.estadoPago === 'pendiente' && (
          <section className="rounded-lg border-2 border-amber-300 bg-amber-50/90 p-5 space-y-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-bold text-xs">
                  $
                </span>
                <div>
                  <h2 className="text-base font-bold text-amber-950">
                    Pago de retiro pendiente
                  </h2>
                  <p className="text-xs text-amber-800 font-medium">
                    Monto a pagar: {formatearPrecio(seleccion.monto ?? seleccion.residuoCatalogo?.precio ?? 5000)}
                  </p>
                </div>
              </div>
              <span className="pill bg-amber-200 text-amber-950 text-[11px] font-bold border border-amber-300">
                Requiere pago
              </span>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              Tu solicitud fue aprobada por la municipalidad. Para que la cuadrilla de aseo pueda programar el retiro en tu domicilio, debes realizar el pago correspondiente de los derechos municipales.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(`/pago/${seleccion.id}`, {
                  state: { solicitud: seleccion },
                })
              }
              className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <IconCreditCard className="h-4 w-4" />
              <span>Pagar retiro ({formatearPrecio(seleccion.monto ?? seleccion.residuoCatalogo?.precio ?? 5000)})</span>
            </button>
          </section>
        )}

        {/* Banner HU: Pago completado */}
        {pagada && (
          <section className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 shrink-0">
                <IconCheck className="h-4 w-4 stroke-[2.5]" />
              </span>
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Derechos municipales pagados
                </p>
                <p className="text-[11px] text-emerald-800">
                  Tu retiro está listo para ser programado por la cuadrilla.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(`/pago/${seleccion.id}`, {
                  state: { solicitud: seleccion },
                })
              }
              className="btn-outline border-emerald-300 text-emerald-900 bg-white py-1.5 px-3 text-xs font-semibold shrink-0 hover:bg-emerald-100"
            >
              Ver comprobante
            </button>
          </section>
        )}

        {/* Tarjeta de Información General de la Solicitud */}
        <div className="card space-y-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-extrabold text-ink">
                {seleccion.nombreResiduoOtro ?? seleccion.residuoCatalogo?.nombre ??
                  `Residuo #${seleccion.residuoCatalogoId}`}
              </h1>
              {categoria && (
                <p className="text-sm text-ink-2">
                  {categoria} ·{' '}
                  {formatearPrecio(seleccion.residuoCatalogo?.precio ?? 0)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <EstadoPill estado={seleccion.estado} />
              {seleccion.estadoPago === 'pendiente' && (
                <span className="pill border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-bold">
                  Pago pendiente
                </span>
              )}
              {seleccion.estadoPago === 'pagado' && (
                <span className="pill border border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                  Pagado
                </span>
              )}
            </div>
          </div>

          {seleccion.fotoUrl && (
            <img
              src={seleccion.fotoUrl}
              alt={seleccion.residuoCatalogo?.nombre ?? 'Foto del residuo'}
              className="h-48 w-full rounded-md border border-line object-cover"
            />
          )}

          {seleccion.direccionRetiro && (
            <div className="border-t border-line pt-4">
              <p className="text-xs uppercase tracking-wide text-black">
                Dirección de retiro
              </p>
              <p className="mt-1 text-ink-2">{seleccion.direccionRetiro}</p>
            </div>
          )}

          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2 sm:gap-0">
            <div className="pb-3 sm:pb-0 sm:pr-4">
              <p className="text-xs uppercase tracking-wide text-black">
                Descripción
              </p>
              <p className="mt-1 text-ink-2">
                {seleccion.descripcion || 'Sin descripción.'}
              </p>
            </div>

            <div className="border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <p className="text-xs uppercase tracking-wide text-black">
                Solicitada
              </p>
              <p className="mt-1 text-ink-2">
                {fechaLarga(seleccion.fechaSolicitud)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          {/* Opción de publicar en Marketplace */}
          <button
            type="button"
            onClick={() => {
              navigate('/marketplace/subir', {
                state: {
                  importarSolicitud: {
                    solicitudId: seleccion.id,
                    titulo: seleccion.residuoCatalogo?.nombre ?? '',
                    descripcion: seleccion.descripcion ?? '',
                    residuoCatalogoId: seleccion.residuoCatalogoId,
                    fotoUrl: seleccion.fotoUrl,
                  },
                },
              });
            }}
            className="btn-gold flex w-full items-center justify-center gap-2 py-3 text-sm font-bold shadow-sm"
          >
            <IconRecycle className="h-4 w-4 text-ink" />
            <span>Publicar este residuo en Marketplace</span>
          </button>

          {puedeCancelar ? (
            <button
              onClick={() => cancelar(seleccion.id)}
              disabled={procesando}
              className="w-full rounded-pill border border-rose-300 bg-rose-50 py-2.5 text-xs font-medium text-rose-600 transition-colors hover:border-rose-600 hover:bg-rose-600 hover:text-white disabled:opacity-50"
            >
              {procesando ? 'Cancelando…' : 'Cancelar solicitud'}
            </button>
          ) : (
            <p className="text-center text-xs text-ink-2">
              {pagada
                ? 'Esta solicitud ya fue pagada y no se puede cancelar.'
                : `Esta solicitud está en estado «${metaDeEstado(seleccion.estado).label}» y no se puede cancelar.`}
            </p>
          )}
        </div>
      </div>
    );
  }

  // --- Listado ---------------------------------------------------------------
  return (
    <div className="space-y-4">
      <ScreenHeader
        title="Mis solicitudes"
        subtitle={<span className="text-ink-2">Toca una solicitud para ver el detalle.</span>}
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {visibles.length === 0 ? (
        <EmptyState
          icon={<IconClipboard className="h-7 w-7 text-green-700" />}
          message={<span className="text-ink-2">Aún no tienes solicitudes registradas.</span>}
          action={
            <Link to="/nueva-solicitud" className="btn-primary inline-flex">
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
                  title={s.nombreResiduoOtro ?? s.residuoCatalogo?.nombre ?? `Residuo #${s.residuoCatalogoId}`}
                  titleBadge={
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <EstadoPill estado={s.estado} />
                      {s.estadoPago === 'pendiente' && (
                        <span className="pill border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-bold">
                          Pago pendiente
                        </span>
                      )}
                      {s.estadoPago === 'pagado' && (
                        <span className="pill border border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                          Pagado
                        </span>
                      )}
                    </div>
                  }
                  lines={[
                    <span className="text-ink-2">{`${categoria ? `${categoria} · ` : ''}${
                      s.residuoCatalogo ? formatearPrecio(s.residuoCatalogo.precio) : ''
                    }`}</span>,
                    <span className="text-ink-2">{fechaLarga(s.fechaSolicitud)}</span>,
                  ]}
                  trailing={<span className="text-ink-2">›</span>}
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
