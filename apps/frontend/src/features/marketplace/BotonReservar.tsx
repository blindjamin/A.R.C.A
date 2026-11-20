import { useState } from 'react';
import { reservar } from '../../api/marketplace';
import { mensajeDeError } from './formato';

interface BotonReservarProps {
  articuloId: number;
  conversacionId: number;
  nombre: string;
  onReservado: () => void;
  className?: string;
}

// Reservar pide confirmar con el nombre (segundo clic), sin window.confirm.
export default function BotonReservar({
  articuloId,
  conversacionId,
  nombre,
  onReservado,
  className = 'btn-primary px-4 py-2',
}: BotonReservarProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await reservar(articuloId, conversacionId);
      onReservado();
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  };

  if (!confirmando) {
    return (
      <button onClick={() => setConfirmando(true)} className={className}>
        Reservar
      </button>
    );
  }

  return (
    <div className="space-y-2 text-left">
      <p className="text-sm text-ink-2">
        ¿Reservar este artículo para {nombre}? Los demás chats quedarán de solo lectura.
      </p>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setConfirmando(false)} disabled={enviando} className="btn-ghost px-4 py-2">
          Cancelar
        </button>
        <button onClick={confirmar} disabled={enviando} className="btn-primary px-4 py-2">
          {enviando ? 'Reservando…' : `Sí, reservar`}
        </button>
      </div>
    </div>
  );
}
