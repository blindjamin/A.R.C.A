import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSolicitudFlow } from '../flow/SolicitudFlow';

export default function AnalizandoIA() {
  const navigate = useNavigate();
  const { fotoPreview } = useSolicitudFlow();

  // Reconocimiento IA simulado: avanza solo tras la "verificación".
  useEffect(() => {
    const t = setTimeout(() => navigate('/solicitar/sugerencias'), 2200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <header>
        <h1 className="text-2xl font-extrabold">Analizando…</h1>
        <p className="text-sm text-slate">Identificando el objeto con IA local.</p>
      </header>

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-line bg-ink">
        {fotoPreview && (
          <img
            src={fotoPreview}
            alt="Analizando residuo"
            className="h-full w-full object-cover opacity-80"
          />
        )}
        {/* Línea de escaneo */}
        <div className="scanline" />
        <div className="absolute inset-6 rounded-md border-2 border-green-500/70" />
      </div>

      <div className="flex items-center gap-2 text-sm font-medium text-green-700">
        <span className="h-2 w-2 animate-ping rounded-full bg-green-500" />
        Verificando características…
      </div>
    </div>
  );
}
