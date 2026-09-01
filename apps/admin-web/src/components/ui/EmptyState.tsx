import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  message: ReactNode;
  action?: ReactNode;
}

// Bloque "no hay nada que mostrar", con ícono e acción opcionales.
export default function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div className="card p-8 text-center">
      {icon && (
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
          {icon}
        </div>
      )}
      <p className="text-sm text-slate">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
