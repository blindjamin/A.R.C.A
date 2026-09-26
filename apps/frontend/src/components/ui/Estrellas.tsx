interface EstrellasProps {
  /** Promedio 1–5; null si nunca lo han calificado. */
  valor: number | null;
  cantidad: number;
  className?: string;
}

const formatearPromedio = (valor: number): string =>
  valor.toLocaleString('es-CL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

// Reputación de un vecino: 5 estrellas + promedio + cantidad de calificaciones.
export default function Estrellas({ valor, cantidad, className = '' }: EstrellasProps) {
  if (valor === null || cantidad === 0) {
    return (
      <span className={`text-xs text-slate-2 ${className}`.trim()}>
        Sin calificaciones
      </span>
    );
  }

  const llenas = Math.round(valor);
  const promedio = formatearPromedio(valor);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${className}`.trim()}
      aria-label={`${promedio} de 5 estrellas, ${cantidad} calificaciones`}
    >
      <span aria-hidden="true" className="tracking-tight">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= llenas ? 'text-gold-500' : 'text-line'}>
            ★
          </span>
        ))}
      </span>
      <span aria-hidden="true" className="font-semibold text-ink-2">
        {promedio}
      </span>
      <span aria-hidden="true" className="text-slate-2">
        ({cantidad})
      </span>
    </span>
  );
}
