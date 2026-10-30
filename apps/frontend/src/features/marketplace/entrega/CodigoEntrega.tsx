import { useEffect, useState } from 'react';
import { IconX } from '../../../components/ui';

interface CodigoEntregaProps {
  codigo: string;
  sector: string | null;
}

/**
 * Tarjeta de quien recibió el artículo (HU-15). El código se muestra en una
 * ventana aparte, en grande, para dictarlo en el momento de la entrega y no
 * dejarlo a la vista todo el tiempo.
 */
export default function CodigoEntrega({ codigo, sector }: CodigoEntregaProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <section className="card space-y-3 p-4 text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
          Reservado para ti
        </h2>
        {sector && <p className="text-sm text-ink-2">Sector: {sector}</p>}
        <p className="text-sm text-ink-2">
          Cuando quien publica te entregue el artículo, muéstrale este código: lo
          escribe en su teléfono y el intercambio queda cerrado.
        </p>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="btn-primary w-full py-3.5"
        >
          Ver mi código de entrega
        </button>
        <p className="text-xs text-slate">
          No lo dictes por chat antes de tener el artículo en la mano.
        </p>
      </section>

      {abierto && (
        <ModalCodigo codigo={codigo} onCerrar={() => setAbierto(false)} />
      )}
    </>
  );
}

function ModalCodigo({
  codigo,
  onCerrar,
}: {
  codigo: string;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Código de entrega"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="card w-full max-w-md space-y-4 bg-white p-6 text-center">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
            Tu código de entrega
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            autoFocus
            aria-label="Cerrar el código de entrega"
            className="rounded-md p-1.5 text-slate hover:bg-canvas hover:text-ink"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <p className="whitespace-nowrap font-display text-[clamp(2rem,13vw,3.5rem)] font-extrabold leading-none tracking-[0.12em] text-green-700 tabular-nums">
          {codigo}
        </p>

        <p className="text-sm text-ink-2">
          Díctaselo a quien te entrega el artículo.
        </p>
        <p className="text-xs text-slate">
          Muéstralo solo cuando tengas el artículo en la mano.
        </p>
      </div>
    </div>
  );
}
