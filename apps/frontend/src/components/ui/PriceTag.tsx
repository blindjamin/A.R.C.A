import { formatearPrecio } from '../../api/arca';

interface PriceTagProps {
  amount: number;
  className?: string;
}

// Envuelve formatearPrecio con el estilo visual ya usado en catálogo,
// nueva solicitud, sugerencias IA y mis solicitudes.
export default function PriceTag({ amount, className = '' }: PriceTagProps) {
  return (
    <span className={`font-display font-extrabold text-green-700 ${className}`.trim()}>
      {formatearPrecio(amount)}
    </span>
  );
}
