import { iconoPorCategoria } from '../../api/arca';
import type { ArticuloMarketplace } from '../../api/marketplace';
import { ETIQUETA_BANDA } from '../../features/marketplace/distancia';
import { TIPO_ARTICULO_META } from '../../features/marketplace/formato';
import Estrellas from './Estrellas';

interface ArticuloCardProps {
  articulo: ArticuloMarketplace;
  onClick?: () => void;
}

// Tarjeta del listado del Marketplace. La reputación que muestra es la del
// vecino que publica, no la del artículo.
export default function ArticuloCard({ articulo, onClick }: ArticuloCardProps) {
  const { tipo, titulo, categoria, fotoUrl, banda, publicador } = articulo;

  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex w-full flex-col overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
    >
      <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-green-50">
        {fotoUrl ? (
          <img src={fotoUrl} alt={titulo} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl sm:text-5xl" aria-hidden="true">
            {iconoPorCategoria(categoria)}
          </span>
        )}
        <span
          className={`pill absolute left-2 top-2 font-semibold sm:left-3 sm:top-3 ${TIPO_ARTICULO_META[tipo].clase}`}
        >
          {TIPO_ARTICULO_META[tipo].etiqueta}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base">
          {titulo}
        </h3>
        {banda && (
          <p className="text-xs text-slate">📍 {ETIQUETA_BANDA[banda]}</p>
        )}
        <div className="mt-auto flex flex-col gap-0.5 border-t border-line-2 pt-2">
          <span className="truncate text-xs text-ink-2 sm:text-sm">
            {publicador.nombre}
          </span>
          <Estrellas
            valor={publicador.calificacionPromedio}
            cantidad={publicador.cantidadCalificaciones}
          />
        </div>
      </div>
    </button>
  );
}
