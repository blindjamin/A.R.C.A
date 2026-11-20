import type { ArticuloMarketplace } from '../../api/marketplace';
import { ETIQUETA_BANDA } from '../../features/marketplace/distancia';
import { TIPO_ARTICULO_META } from '../../features/marketplace/formato';
import Estrellas from './Estrellas';
import { IconMapPin, IconUser } from './Icons';
import { CategoriaPlaceholder } from './IconoCategoria';

interface ArticuloCardProps {
  articulo: ArticuloMarketplace;
  onClick?: () => void;
}

// Tarjeta del listado del Marketplace mobile-first. Diferencia con claridad
// publicaciones propias vs. de la comunidad y usa iconografía institucional sobria.
export default function ArticuloCard({ articulo, onClick }: ArticuloCardProps) {
  const { tipo, titulo, categoria, fotoUrl, banda, publicador, esPropio } = articulo;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card flex w-full flex-col overflow-hidden text-left transition-all active:scale-[0.98] sm:hover:-translate-y-0.5 sm:hover:shadow-md ${
        esPropio ? 'border-emerald-300 ring-1 ring-emerald-200/70 bg-emerald-50/10' : 'hover:border-green-300'
      }`}
    >
      <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-stone-100 overflow-hidden">
        {fotoUrl ? (
          <img src={fotoUrl} alt={titulo} className="h-full w-full object-cover" />
        ) : (
          <CategoriaPlaceholder categoria={categoria} />
        )}

        {/* Tipo de publicación (Regalo / Intercambio) */}
        <span
          className={`pill absolute left-2 top-2 font-semibold text-[11px] sm:left-3 sm:top-3 sm:text-xs shadow-xs ${TIPO_ARTICULO_META[tipo].clase}`}
        >
          {TIPO_ARTICULO_META[tipo].etiqueta}
        </span>

        {/* Distintivo claro de pertenencia: Tuyo vs Vecino */}
        {esPropio ? (
          <span className="pill absolute right-2 top-2 bg-emerald-800 text-white font-semibold text-[11px] shadow-xs flex items-center gap-1 sm:right-3 sm:top-3 sm:text-xs">
            <IconUser className="h-3 w-3" />
            <span>Tuyo</span>
          </span>
        ) : (
          <span className="pill absolute right-2 top-2 bg-white/95 text-stone-700 backdrop-blur-xs font-medium text-[11px] shadow-xs sm:right-3 sm:top-3 sm:text-xs">
            Vecino
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink sm:text-base">
          {titulo}
        </h3>
        {banda && (
          <p className="text-xs text-slate flex items-center gap-1">
            <IconMapPin className="h-3 w-3 text-slate-2 shrink-0" />
            <span>{ETIQUETA_BANDA[banda]}</span>
          </p>
        )}
        <div className="mt-auto flex flex-col gap-0.5 border-t border-line-2 pt-2">
          {esPropio ? (
            <span className="truncate text-xs font-semibold text-emerald-800 flex items-center gap-1 sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
              Publicado por ti
            </span>
          ) : (
            <span className="truncate text-xs text-ink-2 font-medium sm:text-sm">
              {publicador.nombre}
            </span>
          )}
          <Estrellas
            valor={publicador.calificacionPromedio}
            cantidad={publicador.cantidadCalificaciones}
          />
        </div>
      </div>
    </button>
  );
}

