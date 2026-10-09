import { useState } from 'react';
import { instalar, useEstadoInstalacion } from './instalacion';

// Si la persona dice «Ahora no», no se vuelve a ofrecer en una semana.
const CLAVE_POSPUESTA = 'arca.instalacion.pospuesta';
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

function pospuestaHastaAhora(): boolean {
  try {
    const hasta = Number(localStorage.getItem(CLAVE_POSPUESTA));
    return Date.now() < hasta;
  } catch {
    return false;
  }
}

/**
 * Aviso inferior que ofrece instalar A.R.C.A. en el celular: botón con el
 * diálogo nativo en Android, instrucciones en iOS. No aparece si la app ya
 * está instalada o el navegador no permite instalarla.
 */
export function OfertaInstalacion() {
  const estado = useEstadoInstalacion();
  const [pospuesta, setPospuesta] = useState(pospuestaHastaAhora);

  if (pospuesta || (estado !== 'disponible' && estado !== 'ios')) return null;

  const posponer = () => {
    try {
      localStorage.setItem(CLAVE_POSPUESTA, String(Date.now() + SEMANA_MS));
    } catch {
      // Sin almacenamiento se oculta solo durante esta visita.
    }
    setPospuesta(true);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="oferta-instalacion-titulo"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-white p-4 text-gray-900 shadow-xl ring-1 ring-black/5">
        <img src="/icono-192.png" alt="" className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p id="oferta-instalacion-titulo" className="text-sm font-bold">
            Instala A.R.C.A. en tu celular
          </p>
          {estado === 'disponible' ? (
            <p className="text-xs text-gray-600">
              Queda en tu pantalla de inicio, como cualquier app.
            </p>
          ) : (
            <p className="text-xs text-gray-600">
              Toca <strong>Compartir</strong> y luego{' '}
              <strong>«Agregar a inicio»</strong>.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-1">
          {estado === 'disponible' && (
            <button
              type="button"
              onClick={() => void instalar()}
              className="rounded-pill bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
            >
              Instalar
            </button>
          )}
          <button
            type="button"
            onClick={posponer}
            className="rounded-pill px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
