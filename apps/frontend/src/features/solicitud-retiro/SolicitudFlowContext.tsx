import { createContext, useContext, useState, type ReactNode } from 'react';

// Estado efímero del flujo "Solicitar retiro" (captura → IA → sugerencia).
// Vive solo en memoria; al recargar se reinicia y el guard manda a /solicitar.
interface SolicitudFlowState {
  fotoPreview: string | null; // dataURL de la foto capturada, para mostrarla
  fotoArchivo: File | null; // la misma foto, que se sube con la solicitud
  setFoto: (archivo: File | null, preview: string | null) => void;
  reset: () => void;
}

const SolicitudFlowContext = createContext<SolicitudFlowState | null>(null);

export function SolicitudFlowProvider({ children }: { children: ReactNode }) {
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const setFoto = (archivo: File | null, preview: string | null) => {
    setFotoArchivo(archivo);
    setFotoPreview(preview);
  };
  const reset = () => setFoto(null, null);
  return (
    <SolicitudFlowContext.Provider
      value={{ fotoPreview, fotoArchivo, setFoto, reset }}
    >
      {children}
    </SolicitudFlowContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSolicitudFlow(): SolicitudFlowState {
  const ctx = useContext(SolicitudFlowContext);
  if (!ctx)
    throw new Error('useSolicitudFlow debe usarse dentro de SolicitudFlowProvider');
  return ctx;
}
