import { useId } from 'react';

interface EstrellasInputProps {
  /** Estrellas elegidas; 0 = ninguna todavía. */
  valor: number;
  onChange: (valor: number) => void;
  disabled?: boolean;
}

const ETIQUETAS = ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

/**
 * Selector de 1 a 5 estrellas. Son radios nativos con la estrella encima: el
 * teclado y el lector de pantalla funcionan sin lógica extra. La estrella llena
 * y la vacía se distinguen por forma (★ / ☆), no solo por color, para que el
 * alto contraste no las iguale.
 */
export default function EstrellasInput({
  valor,
  onChange,
  disabled = false,
}: EstrellasInputProps) {
  const grupo = useId();

  return (
    <div
      role="radiogroup"
      aria-label="Calificación de 1 a 5 estrellas"
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <label
          key={n}
          className="cursor-pointer rounded-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"
        >
          <input
            type="radio"
            name={grupo}
            value={n}
            checked={valor === n}
            onChange={() => onChange(n)}
            disabled={disabled}
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className={`text-3xl leading-none ${n <= valor ? 'text-gold-500' : 'text-line'}`}
          >
            {n <= valor ? '★' : '☆'}
          </span>
          <span className="sr-only">
            {n} de 5 estrellas, {ETIQUETAS[n - 1]}
          </span>
        </label>
      ))}
    </div>
  );
}
