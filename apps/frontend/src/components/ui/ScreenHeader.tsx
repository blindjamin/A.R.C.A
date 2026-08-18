import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
}

// Cabecera estándar de pantalla: título + descripción corta.
export default function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <header>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      {subtitle && <p className="text-sm text-slate">{subtitle}</p>}
    </header>
  );
}
