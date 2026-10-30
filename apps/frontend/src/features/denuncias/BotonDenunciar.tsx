import { useState } from 'react';
import ModalDenuncia, { type ModalDenunciaProps } from './ModalDenuncia';

/** Enlace discreto que abre la denuncia (HU-16). */
export default function BotonDenunciar({
  texto = 'Denunciar',
  className = 'text-xs text-slate underline underline-offset-2 hover:text-rose-700',
  ...modal
}: Omit<ModalDenunciaProps, 'onCerrar'> & { texto?: string; className?: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={className}>
        {texto}
      </button>
      {abierto && <ModalDenuncia {...modal} onCerrar={() => setAbierto(false)} />}
    </>
  );
}
