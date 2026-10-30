import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { iconoPorCategoria } from '../../api/arca';
import {
  listarMisPublicaciones,
  type ArticuloMarketplace,
} from '../../api/marketplace';
import {
  BackButton,
  BadgeNoLeidos,
  EmptyState,
  ListItemCard,
  ScreenHeader,
  IconBox,
  IconChevronRight,
  IconPlus,
  IconRecycle,
} from '../../components/ui';
import { useNoLeidos } from './chat/NoLeidosContext';
import { ESTADO_ARTICULO_META, TIPO_ARTICULO_META, haceCuanto } from './formato';

export default function MisPublicaciones() {
  const navigate = useNavigate();
  const { conversaciones } = useNoLeidos();
  const [articulos, setArticulos] = useState<ArticuloMarketplace[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarMisPublicaciones()
      .then(setArticulos)
      .catch((e: Error) => setError(e.message));
  }, []);

  const irAPublicar = () => navigate('/marketplace/subir');

  // Reservados: tienen el código de entrega esperando. Van primero para que
  // cerrar la entrega no dependa de buscar el artículo en la lista.
  const pendientes = (articulos ?? []).filter((a) => a.estado === 'en_negociacion');

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <BackButton onClick={() => navigate('/marketplace')} />
      <div className="flex items-start justify-between gap-3">
        <ScreenHeader
          title="Mis publicaciones"
          subtitle="Lo que has regalado o puesto para intercambio."
        />
        <button onClick={irAPublicar} className="btn-gold shrink-0 flex items-center gap-1.5">
          <IconPlus className="h-4 w-4" />
          <span>Publicar</span>
        </button>
      </div>

      {error ? (
        <p className="text-rose-600">{error}</p>
      ) : articulos === null ? (
        <p className="text-slate">Cargando tus publicaciones…</p>
      ) : articulos.length === 0 ? (
        <EmptyState
          icon={<IconRecycle className="h-8 w-8 text-green-700" />}
          message="Todavía no has publicado nada."
          action={
            <button onClick={irAPublicar} className="btn-primary">
              Publicar un artículo
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {pendientes.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
                Entregas pendientes
              </h2>
              {pendientes.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => navigate(`/marketplace/${a.id}`)}
                  className="card flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-700">
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

          <div className="space-y-3">
            {articulos.map((a) => (
              <ListItemCard
                key={a.id}
                icon={iconoPorCategoria(a.categoria)}
                title={a.titulo}
                titleBadge={
                  <span className={`pill shrink-0 ${ESTADO_ARTICULO_META[a.estado].clase}`}>
                    {ESTADO_ARTICULO_META[a.estado].etiqueta}
                  </span>
                }
                lines={[
                  `${TIPO_ARTICULO_META[a.tipo].etiqueta} · ${a.categoria}`,
                  `Publicado ${haceCuanto(a.fechaPublicacion)}`,
                ]}
                trailing={
                  <>
                    <BadgeNoLeidos
                      cantidad={conversaciones
                        .filter((c) => c.soyPublicador && c.articulo.id === a.id)
                        .reduce((suma, c) => suma + c.noLeidos, 0)}
                    />{' '}
                    <span className="text-slate-2">›</span>
                  </>
                }
                onClick={() => navigate(`/marketplace/${a.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
