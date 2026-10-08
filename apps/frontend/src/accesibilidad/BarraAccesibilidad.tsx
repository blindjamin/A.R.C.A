import { useEffect, useRef, useState } from 'react';
import {
  NIVEL_LETRA_MAXIMO,
  cambiarLetra,
  cambiarPreferencias,
  usePreferenciasAccesibilidad,
} from './preferencias';

const CLASE_BOTON =
  'flex h-9 min-w-9 items-center justify-center rounded-md border border-white/60 px-2 text-sm font-bold text-white transition-colors hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent aria-pressed:bg-white aria-pressed:text-green-800';

function IconContraste() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
  );
}

function IconAccesibilidad() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="4.5" r="1.5" />
      <path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3 6M12 14.5l3 6" />
    </svg>
  );
}

/**
 * Botones de tamaño de letra (A− / A+) y de alto contraste, para fondos
 * oscuros (login y cabecera de la app).
 */
export function BarraAccesibilidad() {
  const { letra, contraste } = usePreferenciasAccesibilidad();

  return (
    <div role="group" aria-label="Accesibilidad" className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => cambiarLetra(-1)}
        disabled={letra === 0}
        aria-label="Reducir el tamaño de la letra"
        title="Reducir letra"
        className={CLASE_BOTON}
      >
        A−
      </button>
      <button
        type="button"
        onClick={() => cambiarLetra(1)}
        disabled={letra === NIVEL_LETRA_MAXIMO}
        aria-label="Aumentar el tamaño de la letra"
        title="Aumentar letra"
        className={CLASE_BOTON}
      >
        A+
      </button>
      <button
        type="button"
        onClick={() => cambiarPreferencias({ contraste: !contraste })}
        aria-pressed={contraste}
        aria-label="Alto contraste"
        title="Alto contraste"
        className={CLASE_BOTON}
      >
        <IconContraste />
      </button>
    </div>
  );
}

/**
 * Versión compacta para la cabecera de la app, donde en el celular no caben
 * tres botones más: un solo botón que despliega la barra.
 */
export function MenuAccesibilidad() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrarAlTocarFuera = (e: PointerEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('pointerdown', cerrarAlTocarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarAlTocarFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-label="Opciones de accesibilidad"
        title="Accesibilidad"
        className="flex h-8 w-8 items-center justify-center rounded-pill text-white transition-colors hover:bg-white/15"
      >
        <IconAccesibilidad />
      </button>
      {abierto && (
        <div className="brand-gradient absolute right-0 top-full z-30 mt-2 rounded-lg border border-white/30 p-2 shadow-lg">
          <BarraAccesibilidad />
        </div>
      )}
    </div>
  );
}
