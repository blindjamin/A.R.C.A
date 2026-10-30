import { useRef, useState } from 'react';
import { IconFlag } from '../../components/ui/Icons';
import ModalDenuncia, { type ModalDenunciaProps } from './ModalDenuncia';

/**
 * Enlace discreto que abre la denuncia (HU-16). Con `compacto`, en pantallas
 * chicas muestra solo la bandera; el texto queda para el lector de pantalla.
 */
export default function BotonDenunciar({
  texto = 'Denunciar',
  compacto = false,
  className = '',
  ...modal
}: Omit<ModalDenunciaProps, 'onCerrar'> & {
  texto?: string;
  compacto?: boolean;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto(true)}
        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 text-xs text-slate underline underline-offset-2 hover:text-rose-700 ${className}`}
      >
        <IconFlag className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className={compacto ? 'sr-only sm:not-sr-only' : undefined}>{texto}</span>
      </button>
      {abierto && (
        <ModalDenuncia
          {...modal}
          onCerrar={() => {
            setAbierto(false);
            boton.current?.focus();
          }}
        />
      )}
    </>
  );
}
