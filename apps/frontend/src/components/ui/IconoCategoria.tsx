import {
  IconMuebles,
  IconElectronica,
  IconLineaBlanca,
  IconConstruccion,
  IconOtros,
  IconRecycle,
  type IconProps,
} from './Icons';

interface IconoCategoriaProps extends IconProps {
  categoria?: string | null;
}

/**
 * Renderiza el ícono vectorial sobrio correspondiente a la categoría municipal.
 */
export function IconoCategoria({ categoria, className = 'h-5 w-5', ...props }: IconoCategoriaProps) {
  const normalizada = categoria?.trim().toLowerCase() ?? '';

  if (normalizada.includes('mueble')) {
    return <IconMuebles className={className} {...props} />;
  }
  if (normalizada.includes('electr')) {
    return <IconElectronica className={className} {...props} />;
  }
  if (
    normalizada.includes('blanca') ||
    normalizada.includes('lavad') ||
    normalizada.includes('estuf') ||
    normalizada.includes('refrig') ||
    normalizada.includes('microond')
  ) {
    return <IconLineaBlanca className={className} {...props} />;
  }
  if (normalizada.includes('construc')) {
    return <IconConstruccion className={className} {...props} />;
  }
  if (normalizada.includes('otro')) {
    return <IconOtros className={className} {...props} />;
  }
  return <IconRecycle className={className} {...props} />;
}

interface CategoriaPlaceholderProps {
  categoria?: string | null;
  className?: string;
}

/**
 * Placeholder institucional sobrio para artículos o residuos sin foto.
 * Reemplaza los emojis por una composición limpia con vector SVG y tipografía institucional.
 */
export function CategoriaPlaceholder({ categoria, className = '' }: CategoriaPlaceholderProps) {
  const nombreCategoria = categoria?.trim() || 'Sin categoría';

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-stone-50 to-emerald-50/20 p-4 text-center select-none ${className}`}
      aria-label={`Artículo de categoría ${nombreCategoria}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-stone-200/80 shadow-xs text-emerald-800">
        <IconoCategoria categoria={categoria} className="h-6 w-6 stroke-[1.8]" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
        {nombreCategoria}
      </span>
    </div>
  );
}

export default IconoCategoria;
