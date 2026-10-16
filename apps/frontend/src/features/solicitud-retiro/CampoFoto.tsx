import { useRef, type ChangeEvent } from 'react';
import { IconCamera, IconImage } from '../../components/ui';
import { validarFoto } from './fotoSolicitud';

interface CampoFotoProps {
  /** Vista previa a mostrar: la foto elegida o la que ya tiene la solicitud. */
  preview: string | null;
  onElegir: (archivo: File, preview: string) => void;
  onError: (mensaje: string) => void;
  /** Texto del botón cuando ya hay una foto. */
  textoCambiar?: string;
}

export function CampoFoto({
  preview,
  onElegir,
  onError,
  textoCambiar = 'Cambiar foto',
}: CampoFotoProps) {
  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de un error.
    e.target.value = '';
    if (!archivo) return;

    const error = validarFoto(archivo);
    if (error) {
      onError(error);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onElegir(archivo, reader.result as string);
    reader.readAsDataURL(archivo);
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <img
          src={preview}
          alt="Foto del residuo"
          className="h-44 w-full rounded-md border border-line object-cover"
        />
      ) : (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line bg-canvas text-slate">
          <IconCamera className="h-8 w-8" />
          <p className="text-xs">Agrega una foto del objeto completo</p>
        </div>
      )}

      <input
        ref={camaraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => camaraRef.current?.click()}
          className="btn-outline flex flex-1 items-center justify-center gap-2 py-2 text-xs"
        >
          <IconCamera className="h-4 w-4" />
          <span>{preview ? textoCambiar : 'Cámara'}</span>
        </button>
        <button
          type="button"
          onClick={() => galeriaRef.current?.click()}
          className="btn-outline flex flex-1 items-center justify-center gap-2 py-2 text-xs"
        >
          <IconImage className="h-4 w-4" />
          <span>Galería</span>
        </button>
      </div>
    </div>
  );
}
