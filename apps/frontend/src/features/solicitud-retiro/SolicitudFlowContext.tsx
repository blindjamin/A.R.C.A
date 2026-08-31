import { createContext, useContext, useState, type ReactNode } from 'react';

// Estado efímero del flujo "Solicitar retiro" (captura → IA → sugerencia).
// Vive solo en memoria; al recargar se reinicia y el guard manda a /solicitar.
interface SolicitudFlowState {
  fotoPreview: string | null; // dataURL de la foto capturada (solo cosmético)
  setFotoPreview: (url: string | null) => void;
  reset: () => void;
}

const SolicitudFlowContext = createContext<SolicitudFlowState | null>(null);

export function SolicitudFlowProvider({ children }: { children: ReactNode }) {
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const reset = () => setFotoPreview(null);
  return (
    <SolicitudFlowContext.Provider value={{ fotoPreview, setFotoPreview, reset }}>
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
