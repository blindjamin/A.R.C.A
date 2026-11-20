import { useEffect, useRef } from 'react';
import { IconX } from './Icons';

/**
 * Foto a pantalla completa. Se cierra con el botón, con Escape o tocando el
 * fondo. El foco entra al botón y vuelve a donde estaba al cerrar.
 */
export default function VisorFoto({
  url,
  alt,
  onCerrar,
}: {
  url: string;
  alt: string;
  onCerrar: () => void;
}) {
  const botonRef = useRef<HTMLButtonElement>(null);
  // El padre suele pasar una función nueva en cada render: no debe reiniciar el foco.
  const cerrarRef = useRef(onCerrar);
  useEffect(() => {
    cerrarRef.current = onCerrar;
  });

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    botonRef.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarRef.current();
      // Único elemento enfocable: el foco no se escapa al fondo.
      if (e.key === 'Tab') {
        e.preventDefault();
        botonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      previo?.focus?.();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
      onClick={onCerrar}
    >
      <img
        src={url}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        ref={botonRef}
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar foto"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <IconX className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
