import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  listarMisPublicaciones,
  type ArticuloMarketplace,
} from '../../api/marketplace';
import {
  BadgeNoLeidos,
  EmptyState,
  IconoCategoria,
  IconBox,
  IconChevronRight,
  IconPlus,
  IconRecycle,
} from '../../components/ui';
import { useNoLeidos } from './chat/NoLeidosContext';
import {
  metaDeEstadoArticulo,
  metaDeTipoArticulo,
  haceCuanto,
} from './formato';
import { MarketplaceHeader } from './MarketplaceNav';

type FiltroEstadoMisPub =
  | 'todos'
  | 'pendiente_aprobacion'
  | 'disponible'
  | 'en_negociacion'
  | 'rechazado'
  | 'finalizados';

export default function MisPublicaciones() {
  const navigate = useNavigate();
  const { conversaciones } = useNoLeidos();
  const [articulos, setArticulos] = useState<ArticuloMarketplace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroEstadoMisPub>('todos');

  useEffect(() => {
    listarMisPublicaciones()
      .then(setArticulos)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Conteos por estado para los indicadores táctiles
  const conteos = useMemo(() => {
    if (!articulos) {
      return {
        todos: 0,
        pendiente_aprobacion: 0,
        disponible: 0,
        en_negociacion: 0,
        rechazado: 0,
        finalizados: 0,
      };
    }
    return {
      todos: articulos.length,
      pendiente_aprobacion: articulos.filter(
        (a) => a.estado === 'pendiente_aprobacion',
      ).length,
      disponible: articulos.filter((a) => a.estado === 'disponible').length,
      en_negociacion: articulos.filter((a) => a.estado === 'en_negociacion').length,
      rechazado: articulos.filter((a) => a.estado === 'rechazado').length,
      finalizados: articulos.filter(
        (a) => a.estado === 'completado' || a.estado === 'retirado',
      ).length,
    };
  }, [articulos]);

  // Filtrado según la pestaña activa
  const articulosFiltrados = useMemo(() => {
    if (!articulos) return [];
    if (filtro === 'pendiente_aprobacion') {
      return articulos.filter((a) => a.estado === 'pendiente_aprobacion');
    }
    if (filtro === 'disponible') {
      return articulos.filter((a) => a.estado === 'disponible');
    }
    if (filtro === 'en_negociacion') {
      return articulos.filter((a) => a.estado === 'en_negociacion');
    }
    if (filtro === 'rechazado') {
      return articulos.filter((a) => a.estado === 'rechazado');
    }
    if (filtro === 'finalizados') {
      return articulos.filter(
        (a) => a.estado === 'completado' || a.estado === 'retirado',
      );
    }
    return articulos;
  }, [articulos, filtro]);

  // Reservados: tienen el código de entrega esperando. Van primero para que
  // cerrar la entrega no dependa de buscar el artículo en la lista.
  const pendientes = (articulos ?? []).filter((a) => a.estado === 'en_negociacion');

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-12">
      {/* Cabecera y Navegación segmentada unificada */}
      <MarketplaceHeader
        titulo="Mis Publicaciones"
        subtitulo="Artículos que has ofrecido a vecinos de Santo Domingo."
        tabActiva="mis-publicaciones"
      />

      {error ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
          <p className="font-bold">Error al cargar publicaciones</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : articulos === null ? (
        <div className="py-16 text-center space-y-3">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-sm text-slate animate-pulse">Cargando tus publicaciones…</p>
        </div>
      ) : articulos.length === 0 ? (
        <EmptyState
          icon={<IconRecycle className="h-10 w-10 text-emerald-700" />}
          message="Todavía no tienes artículos publicados en el Marketplace."
          action={
            <Link to="/marketplace/subir" className="btn-primary inline-flex items-center gap-1.5 text-xs sm:text-sm">
              <IconPlus className="h-4 w-4" />
              <span>Publicar mi primer artículo</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Entregas pendientes para cerrar con el código */}
          {pendientes.length > 0 && (
            <section className="space-y-2 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
                Entregas pendientes
              </h2>
              {pendientes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => navigate(`/marketplace/${a.id}`)}
                  className="card flex w-full items-center gap-3 p-4 text-left hover:border-emerald-300 transition-colors"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                    <IconBox className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-ink">{a.titulo}</span>
                    <span className="block truncate text-sm text-ink-2">
                      Para {a.reservadoPara ?? 'un vecino'}
                    </span>
                    <span className="block text-xs text-slate">
                      Confirma la entrega con el código de 6 dígitos.
                    </span>
                  </span>
                  <IconChevronRight className="h-4 w-4 shrink-0 text-slate-2" />
                </button>
              ))}
            </section>
          )}

          {/* Barra táctil de filtros rápidos con contadores numéricos */}
          <div
            role="tablist"
            aria-label="Filtrar mis publicaciones por estado"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'todos'}
              onClick={() => setFiltro('todos')}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-all shrink-0 active:scale-95 ${
                filtro === 'todos'
                  ? 'bg-ink text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              Todos ({conteos.todos})
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'pendiente_aprobacion'}
              onClick={() => setFiltro('pendiente_aprobacion')}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                filtro === 'pendiente_aprobacion'
                  ? 'bg-amber-700 text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              <span>En revisión</span>
              <span className="opacity-75">({conteos.pendiente_aprobacion})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'disponible'}
              onClick={() => setFiltro('disponible')}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                filtro === 'disponible'
                  ? 'bg-emerald-800 text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              <span>Disponibles</span>
              <span className="opacity-75">({conteos.disponible})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'en_negociacion'}
              onClick={() => setFiltro('en_negociacion')}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                filtro === 'en_negociacion'
                  ? 'bg-sky-800 text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              <span>En trato</span>
              <span className="opacity-75">({conteos.en_negociacion})</span>
            </button>

            {conteos.rechazado > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={filtro === 'rechazado'}
                onClick={() => setFiltro('rechazado')}
                className={`rounded-full px-3.5 py-1.5 font-medium transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                  filtro === 'rechazado'
                    ? 'bg-rose-800 text-white font-bold shadow-xs'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span>Rechazados</span>
                <span className="opacity-75">({conteos.rechazado})</span>
              </button>
            )}

            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'finalizados'}
              onClick={() => setFiltro('finalizados')}
              className={`rounded-full px-3.5 py-1.5 font-medium transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                filtro === 'finalizados'
                  ? 'bg-stone-800 text-white font-bold shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              <span>Entregados / Retirados</span>
              <span className="opacity-75">({conteos.finalizados})</span>
            </button>
          </div>

          {/* Listado de tarjetas de publicaciones */}
          {articulosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center space-y-2 bg-stone-50/50">
              <p className="text-sm font-medium text-stone-600">
                No tienes artículos en esta categoría.
              </p>
              <button
                type="button"
                onClick={() => setFiltro('todos')}
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
                Ver todas mis publicaciones
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {articulosFiltrados.map((a) => {
                const interesados = conversaciones.filter(
                  (c) => c.soyPublicador && c.articulo.id === a.id,
                );
                const noLeidos = interesados.reduce(
                  (suma, c) => suma + c.noLeidos,
                  0,
                );

                const estadoMeta = metaDeEstadoArticulo(a.estado);
                const tipoMeta = metaDeTipoArticulo(a.tipo);

                return (
                  <article
                    key={a.id}
                    onClick={() => navigate(`/marketplace/${a.id}`)}
                    className="card p-3.5 sm:p-4 hover:border-emerald-300/80 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] group space-y-3"
                  >
                    {/* Fila superior: Badges de estado, tipo y fecha relativa */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`pill text-xs font-semibold shadow-2xs ${estadoMeta.clase}`}
                        >
                          {estadoMeta.etiqueta}
                        </span>
                        <span
                          className={`pill text-xs font-medium ${tipoMeta.clase}`}
                        >
                          {tipoMeta.etiqueta}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 font-medium">
                        Publicado {haceCuanto(a.fechaPublicacion)}
                      </span>
                    </div>

                    {/* Aviso si está pendiente de aprobación por moderación */}
                    {a.estado === 'pendiente_aprobacion' && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 text-xs text-amber-900 space-y-0.5">
                        <p className="font-bold flex items-center gap-1 text-amber-950">
                          <span>⏳ En revisión técnica</span>
                        </p>
                        <p className="text-[11px] text-amber-800">
                          Tu publicación está siendo validada por el equipo municipal antes de estar visible para los vecinos.
                        </p>
                      </div>
                    )}

                    {/* Aviso si fue rechazado por moderación */}
                    {a.estado === 'rechazado' && (
                      <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-2.5 text-xs text-rose-800 space-y-1">
                        <p className="font-bold flex items-center gap-1 text-rose-900">
                          <span>⚠️ Publicación no aprobada</span>
                        </p>
                        <p className="text-rose-700">
                          {a.motivoRechazo
                            ? `Motivo: ${a.motivoRechazo}`
                            : 'No cumple con las pautas comunitarias de Santo Domingo.'}
                        </p>
                      </div>
                    )}

                    {/* Fila central: Miniatura con ícono institucional + Textos */}
                    <div className="flex items-start gap-3">
                      {/* Miniatura cuadrada */}
                      <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/80 flex items-center justify-center relative">
                        {a.fotoUrl ? (
                          <img
                            src={a.fotoUrl}
                            alt={a.titulo}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <IconoCategoria
                            categoria={a.categoria}
                            className="h-8 w-8 text-emerald-800"
                          />
                        )}
                      </div>

                      {/* Información principal */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h2 className="font-bold text-ink text-sm sm:text-base leading-snug truncate group-hover:text-emerald-800 transition-colors">
                          {a.titulo}
                        </h2>
                        {a.descripcion && (
                          <p className="text-xs text-stone-500 line-clamp-1 leading-relaxed">
                            {a.descripcion}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-0.5 text-xs text-stone-600">
                          <span className="font-medium text-stone-700">
                            {a.categoria}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-emerald-700">
                            +{a.creditos} CC
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fila inferior: Estado de interesados y botón de acción */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-2.5 mt-1 text-xs">
                      <div className="flex items-center gap-2">
                        {interesados.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-stone-700">
                            <span>
                              💬 {interesados.length}{' '}
                              {interesados.length === 1
                                ? 'vecino interesado'
                                : 'vecinos interesados'}
                            </span>
                            {noLeidos > 0 && (
                              <BadgeNoLeidos cantidad={noLeidos} />
                            )}
                          </span>
                        ) : (
                          <span className="text-stone-400">
                            Sin interesados aún
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform">
                        <span>
                          {a.estado === 'en_negociacion'
                            ? 'Gestionar entrega'
                            : 'Ver detalle'}
                        </span>
                        <IconChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
