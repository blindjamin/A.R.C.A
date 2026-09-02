import type { ReactNode } from 'react';
import IconBadge from './IconBadge';

interface ListItemCardProps {
  icon: string;
  iconClassName?: string;
  title: ReactNode;
  /** Pill/badge junto al título (ej. estado, "Reutilizable"). */
  titleBadge?: ReactNode;
  /** Líneas secundarias bajo el título (categoría+precio, descripción, fecha, etc.). */
  lines?: ReactNode[];
  /** Contenido al extremo derecho (chevron, botón de acción, etc.). */
  trailing?: ReactNode;
  /** Si se pasa, toda la fila es clickeable (button). Si no, es una tarjeta estática. */
  onClick?: () => void;
  className?: string;
}

// Fila de item de lista: ícono + título (+badge) + líneas secundarias + trailing.
// Cubre tanto filas clickeables (Mis solicitudes, Admin) como tarjetas con acción
// propia embebida (Catálogo, que trae su botón "Solicitar" en `trailing`).
export default function ListItemCard({
  icon,
  iconClassName,
  title,
  titleBadge,
  lines = [],
  trailing,
  onClick,
  className = '',
}: ListItemCardProps) {
  const inner = (
    <>
      <IconBadge icon={icon} className={iconClassName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-bold">{title}</p>
          {titleBadge}
        </div>
        {lines.map(
          (line, i) =>
            line != null && (
              <p
                key={i}
                className={i === 0 ? 'truncate text-sm text-slate' : 'text-xs text-slate-2'}
              >
                {line}
              </p>
            ),
        )}
      </div>
      {trailing}
    </>
  );

  const base = `card flex items-center gap-3 p-4 text-left ${className}`.trim();

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} w-full transition-colors hover:bg-green-50/40`}
      >
        {inner}
      </button>
    );
  }

  return <div className={base}>{inner}</div>;
}
