import type { ReactNode } from 'react';

interface BackButtonProps {
  onClick: () => void;
  children?: ReactNode;
}

// Link de "volver" usado en las vistas de detalle.
export default function BackButton({ onClick, children = '← Volver' }: BackButtonProps) {
  return (
    <button onClick={onClick} className="text-sm text-black hover:text-green-800">
      {children}
    </button>
  );
}
