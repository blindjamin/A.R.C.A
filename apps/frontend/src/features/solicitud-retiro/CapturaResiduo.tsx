import { useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenHeader } from '../../components/ui';
import { useSolicitudFlow } from './SolicitudFlowContext';

export default function CapturaResiduo() {
  const navigate = useNavigate();
  const { fotoPreview, setFotoPreview } = useSolicitudFlow();
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  // La captura es solo visual: si el usuario elige una foto la mostramos,
  // pero no es obligatoria para continuar.
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Captura el residuo"
        subtitle="Toma una foto y la IA identificará el objeto."
      />

      {/* Visor / preview */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-line bg-ink">
        {fotoPreview ? (
          <img
            src={fotoPreview}
            alt="Residuo capturado"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
            <span className="text-5xl">📷</span>
            <p className="text-sm">Encuadra el objeto completo</p>
            <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-dashed border-white/30" />
          </div>
        )}
      </div>

      {/* Inputs opcionales: cámara y galería */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <div className="space-y-3">
        <button
          onClick={() => navigate('/solicitar/analizando')}
          className="btn-primary w-full py-3.5"
        >
          Analizar con IA
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => camaraRef.current?.click()}
            className="btn-outline flex-1"
          >
            📷 Cámara
          </button>
          <button
            onClick={() => galeriaRef.current?.click()}
            className="btn-outline flex-1"
          >
            🖼️ Galería
          </button>
        </div>
      </div>
    </div>
  );
}
