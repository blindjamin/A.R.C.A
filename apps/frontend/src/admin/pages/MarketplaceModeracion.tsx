import { useEffect, useState } from 'react';
import {
  aprobarArticuloMarketplace,
  fetchArticulosPendientes,
  mensajeDeError,
  rechazarArticuloMarketplace,
  type ArticuloModeracion,
} from '../api/admin';
import { EmptyState } from '../components/ui';

export default function MarketplaceModeracion() {
  const [articulos, setArticulos] = useState<ArticuloModeracion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<number | null>(null);

  // Modal de rechazo
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null);

  // Modal de foto
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    setError(null);
    fetchArticulosPendientes()
      .then(setArticulos)
      .catch((e: unknown) => setError(mensajeDeError(e)))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    let cancelado = false;
    Promise.resolve().then(() => {
      if (!cancelado) cargar();
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const handleAprobar = async (id: number) => {
    if (!window.confirm('¿Deseas aprobar esta publicación para que quede visible en el Marketplace?')) {
      return;
    }
    setAccionEnCurso(id);
    try {
      await aprobarArticuloMarketplace(id);
      setArticulos((prev) => prev.filter((a) => a.id !== id));
    } catch (e: unknown) {
      alert(`Error al aprobar: ${mensajeDeError(e)}`);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const handleConfirmarRechazo = async () => {
    if (!rechazandoId || !motivoRechazo.trim()) return;
    setAccionEnCurso(rechazandoId);
    setErrorRechazo(null);
    try {
      await rechazarArticuloMarketplace(rechazandoId, motivoRechazo.trim());
      setArticulos((prev) => prev.filter((a) => a.id !== rechazandoId));
      setRechazandoId(null);
      setMotivoRechazo('');
    } catch (e: unknown) {
      setErrorRechazo(mensajeDeError(e));
    } finally {
      setAccionEnCurso(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-ink">
              Moderación de Marketplace
            </h1>
            <span className="pill bg-amber-100 text-amber-800 font-bold text-xs py-0.5 px-2.5">
              {articulos.length} {articulos.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate mt-1">
            Revisa y autoriza las publicaciones de vecinos antes de que sean públicas para la comunidad.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className="btn-outline text-xs self-start sm:self-auto py-2 px-3.5"
        >
          {cargando ? 'Actualizando…' : '🔄 Actualizar lista'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {cargando && articulos.length === 0 ? (
        <p className="text-sm text-slate py-12 text-center">Cargando publicaciones pendientes…</p>
      ) : articulos.length === 0 ? (
        <EmptyState
          icon="🛍️"
          message="Todas las publicaciones han sido moderadas. El Marketplace está al día."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articulos.map((art) => {
            const esRegalo = art.tipo === 'regalo';
            return (
              <div
                key={art.id}
                className="card flex flex-col justify-between overflow-hidden border border-line bg-white shadow-xs rounded-xl"
              >
                <div>
                  {/* Foto con zoom */}
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden border-b border-line">
                    {art.fotoUrl ? (
                      <button
                        type="button"
                        onClick={() => setFotoZoom(art.fotoUrl)}
                        className="group relative h-full w-full cursor-zoom-in"
                        title="Ver foto ampliada"
                      >
                        <img
                          src={art.fotoUrl}
                          alt={art.titulo}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                          🔍 Ampliar
                        </span>
                      </button>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl text-slate-300">
                        📦
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span
                        className={`pill text-[10px] font-bold py-0.5 px-2 shadow-xs ${
                          esRegalo
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-gold-100 text-gold-800 border border-gold-300'
                        }`}
                      >
                        {esRegalo ? '🎁 Regalo' : '🔄 Intercambio'}
                      </span>
                      <span className="pill bg-white/90 text-ink text-[10px] font-mono py-0.5 px-1.5 shadow-2xs">
                        #{art.id}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="font-bold text-ink text-base line-clamp-1">
                        {art.titulo}
                      </h3>
                      <p className="text-xs font-semibold text-forest-700">
                        Categoría: {art.nombreResiduo}
                        {art.nombreResiduoOtro && (
                          <span className="text-slate font-normal ml-1">
                            (Personalizado)
                          </span>
                        )}
                      </p>
                    </div>

                    {art.descripcion && (
                      <p className="text-xs text-slate-700 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        «{art.descripcion}»
                      </p>
                    )}

                    <div className="text-[11px] text-slate space-y-0.5 pt-1 border-t border-slate-100">
                      <p>
                        <strong className="text-slate-700">Vecino:</strong>{' '}
                        {art.publicador.claveUnicaId}
                      </p>
                      <p>
                        <strong className="text-slate-700">Ingreso:</strong>{' '}
                        {new Date(art.fechaPublicacion).toLocaleString('es-CL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-4 pt-0 grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleAprobar(art.id)}
                    disabled={accionEnCurso === art.id}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 text-xs rounded-lg shadow-xs"
                  >
                    {accionEnCurso === art.id ? 'Aprobando…' : '✓ Aprobar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRechazandoId(art.id);
                      setMotivoRechazo('');
                      setErrorRechazo(null);
                    }}
                    disabled={accionEnCurso === art.id}
                    className="btn-outline text-rose-700 border-rose-300 hover:bg-rose-50 font-bold py-2 text-xs rounded-lg"
                  >
                    ✕ Rechazar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación de rechazo */}
      {rechazandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="card w-full max-w-md p-5 bg-white space-y-4 shadow-xl rounded-xl">
            <h2 className="text-base font-bold text-rose-700">
              Rechazar publicación #{rechazandoId}
            </h2>
            <p className="text-xs text-slate">
              Indica el motivo por el cual no se aprueba esta publicación. Este mensaje será notificado al vecino en su cuenta.
            </p>

            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Ej: La foto no corresponde a un residuo apto, contiene elementos no permitidos o falta claridad."
              rows={3}
              className="field text-xs w-full"
              maxLength={500}
            />

            {errorRechazo && (
              <p className="text-xs text-rose-600">{errorRechazo}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRechazandoId(null)}
                className="btn-outline text-xs py-2 px-3"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarRechazo}
                disabled={!motivoRechazo.trim() || accionEnCurso !== null}
                className="btn-primary bg-rose-600 hover:bg-rose-700 text-white text-xs py-2 px-4"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal zoom foto */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFotoZoom(null)}
        >
          <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-lg bg-black">
            <img
              src={fotoZoom}
              alt="Foto ampliada"
              className="max-h-[85vh] w-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setFotoZoom(null)}
              className="absolute top-3 right-3 rounded-full bg-black/70 p-2 text-white hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
