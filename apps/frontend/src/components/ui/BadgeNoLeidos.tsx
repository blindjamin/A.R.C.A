export default function BadgeNoLeidos({ cantidad }: { cantidad: number }) {
  if (cantidad <= 0) return null;
  return (
    <span
      aria-label={`${cantidad} ${cantidad === 1 ? 'mensaje' : 'mensajes'} sin leer`}
      className="rounded-pill bg-green-600 px-1.5 text-[10px] font-bold text-white"
    >
      {cantidad > 9 ? '9+' : cantidad}
    </span>
  );
}
