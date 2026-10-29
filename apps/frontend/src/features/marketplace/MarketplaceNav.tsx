import { Link } from 'react-router-dom';
import { BadgeNoLeidos, IconBox, IconMail, IconPlus, IconStore } from '../../components/ui';
import { useNoLeidos } from './chat/NoLeidosContext';

export type MarketplaceTab = 'explorar' | 'mis-publicaciones' | 'mensajes';

interface MarketplaceNavProps {
  tabActiva: MarketplaceTab;
}

/**
 * Navegación segmentada móvil para el Marketplace de Santo Domingo.
 * Diseñada mobile-first como barra de navegación táctil limpia y robusta.
 */
export default function MarketplaceNav({ tabActiva }: MarketplaceNavProps) {
  const { totalNoLeidos } = useNoLeidos();

  return (
    <nav aria-label="Navegación del Marketplace" className="mb-3">
      {/* Barra segmentada táctil de 3 opciones */}
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1 border border-stone-200/80 shadow-xs">
        {/* 1. Explorar */}
        <Link
          to="/marketplace"
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs sm:text-sm transition-all select-none touch-manipulation active:scale-95 ${
            tabActiva === 'explorar'
              ? 'bg-emerald-700 text-white font-bold shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-medium'
          }`}
          aria-current={tabActiva === 'explorar' ? 'page' : undefined}
        >
          <IconStore className="h-4 w-4 shrink-0" />
          <span className="truncate">Explorar</span>
        </Link>

        {/* 2. Mis publicaciones */}
        <Link
          to="/marketplace/mis-publicaciones"
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs sm:text-sm transition-all select-none touch-manipulation active:scale-95 ${
            tabActiva === 'mis-publicaciones'
              ? 'bg-emerald-700 text-white font-bold shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-medium'
          }`}
          aria-current={tabActiva === 'mis-publicaciones' ? 'page' : undefined}
        >
          <IconBox className="h-4 w-4 shrink-0" />
          <span className="truncate">Mis publicaciones</span>
        </Link>

        {/* 3. Mensajes */}
        <Link
          to="/marketplace/mensajes"
          className={`relative flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl py-2 px-1 text-xs sm:text-sm transition-all select-none touch-manipulation active:scale-95 ${
            tabActiva === 'mensajes'
              ? 'bg-emerald-700 text-white font-bold shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 font-medium'
          }`}
          aria-current={tabActiva === 'mensajes' ? 'page' : undefined}
        >
          <IconMail className="h-4 w-4 shrink-0" />
          <span className="truncate">Mensajes</span>
          {totalNoLeidos > 0 && <BadgeNoLeidos cantidad={totalNoLeidos} />}
        </Link>
      </div>
    </nav>
  );
}

interface MarketplaceHeaderProps {
  titulo: string;
  subtitulo: string;
  tabActiva: MarketplaceTab;
  mostrarBotonPublicar?: boolean;
}

export function MarketplaceHeader({
  titulo,
  subtitulo,
  tabActiva,
  mostrarBotonPublicar = true,
}: MarketplaceHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Cabecera con botón de acción directa en mobile */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
            {titulo}
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            {subtitulo}
          </p>
        </div>
        {mostrarBotonPublicar && (
          <Link
            to="/marketplace/subir"
            className="btn-gold shrink-0 flex min-h-[38px] items-center gap-1.5 py-2 px-3.5 text-xs sm:text-sm shadow-xs select-none touch-manipulation active:scale-95 transition-transform"
          >
            <IconPlus className="h-4 w-4" />
            <span>Publicar</span>
          </Link>
        )}
      </div>

      {/* Navegación segmentada persistente */}
      <MarketplaceNav tabActiva={tabActiva} />
    </div>
  );
}
