interface IconBadgeProps {
  icon: string;
  className?: string;
}

// Insignia circular/redondeada con ícono, usada como avatar de ítem en listas,
// tarjetas de módulo y resúmenes. El tamaño/tipografía se ajustan vía className.
export default function IconBadge({
  icon,
  className = 'h-12 w-12 text-xl',
}: IconBadgeProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-green-50 ${className}`}
    >
      {icon}
    </div>
  );
}
