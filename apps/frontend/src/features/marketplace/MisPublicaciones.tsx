import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { iconoPorCategoria } from '../../api/arca';
import {
  listarMisPublicaciones,
  type ArticuloMarketplace,
} from '../../api/marketplace';
import {
  BackButton,
  EmptyState,
  ListItemCard,
  ScreenHeader,
} from '../../components/ui';
import { ESTADO_ARTICULO_META, TIPO_ARTICULO_META, haceCuanto } from './formato';

export default function MisPublicaciones() {
  const navigate = useNavigate();
  const [articulos, setArticulos] = useState<ArticuloMarketplace[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarMisPublicaciones()
      .then(setArticulos)
      .catch((e: Error) => setError(e.message));
  }, []);

  const irAPublicar = () => navigate('/marketplace/subir');

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <BackButton onClick={() => navigate('/marketplace')} />
      <div className="flex items-start justify-between gap-3">
        <ScreenHeader
          title="Mis publicaciones"
          subtitle="Lo que has regalado o puesto para intercambio."
        />
        <button onClick={irAPublicar} className="btn-gold shrink-0">
          ♻️ Publicar
        </button>
      </div>

      {error ? (
        <p className="text-rose-600">{error}</p>
      ) : articulos === null ? (
        <p className="text-slate">Cargando tus publicaciones…</p>
      ) : articulos.length === 0 ? (
        <EmptyState
          icon="♻️"
          message="Todavía no has publicado nada."
          action={
            <button onClick={irAPublicar} className="btn-primary">
              Publicar un artículo
            </button>
          }
        />
      ) : (
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
              trailing={<span className="text-slate-2">›</span>}
              onClick={() => navigate(`/marketplace/${a.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
