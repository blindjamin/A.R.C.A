import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  crearDenuncia,
  LARGO_DESCRIPCION_DENUNCIA,
  MAX_MENSAJES_ADJUNTOS,
  MOTIVOS_DENUNCIA,
  type MotivoDenuncia,
  type OrigenDenuncia,
} from '../../api/denuncias';
import type { MensajeChat } from '../../api/chat';
import { mensajeDeError } from '../marketplace/formato';

export interface ModalDenunciaProps {
  articuloId: number;
  origen: OrigenDenuncia;
  /** Nombre de pila del vecino denunciado, solo para el texto. */
  nombre: string;
  /** Solo para quien publicó: con cuál interesado. */
  conversacion?: number;
  /** Mensajes del chat que se pueden adjuntar como prueba. */
  mensajes?: MensajeChat[];
  onCerrar: () => void;
}

/**
 * Denuncia de un vecino (HU-16). El denunciado no ve quién lo denunció y el
 * funcionario ve solo los mensajes que se adjuntan, no la conversación entera.
 */
export default function ModalDenuncia({
  articuloId,
  origen,
  nombre,
  conversacion,
  mensajes = [],
  onCerrar,
}: ModalDenunciaProps) {
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [adjuntos, setAdjuntos] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  // Los pendientes de envío (id negativo) no existen en el servidor.
  const adjuntables = mensajes.filter((m) => m.id > 0).slice(-20);

  const alternarAdjunto = (id: number) =>
    setAdjuntos((previos) =>
      previos.includes(id)
        ? previos.filter((x) => x !== id)
        : previos.length < MAX_MENSAJES_ADJUNTOS
          ? [...previos, id]
          : previos,
    );

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo) return;
    setEnviando(true);
    setError(null);
    try {
      await crearDenuncia({
        articuloId,
        origen,
        motivo,
        descripcion: descripcion.trim() || undefined,
        conversacion,
        mensajes: adjuntos.length > 0 ? adjuntos : undefined,
      });
      setEnviada(true);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-denuncia"
        className="card max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="titulo-denuncia" className="font-display text-lg font-bold text-ink">
            {enviada ? 'Denuncia enviada' : `Denunciar a ${nombre}`}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1 text-lg leading-none text-slate-2 hover:text-ink"
          >
            ✕
          </button>
        </div>

        {enviada ? (
          <div className="space-y-4 text-sm text-ink-2">
            <p>
              Un funcionario municipal la revisará. El vecino denunciado no sabrá
              quién lo denunció.
            </p>
            <p>
              Puedes seguir su estado en{' '}
              <Link to="/denuncias" className="font-semibold text-green-700 underline">
                Mis denuncias
              </Link>
              .
            </p>
            <button type="button" onClick={onCerrar} className="btn-primary w-full py-3">
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void enviar(e)} className="space-y-4">
            <p className="text-sm text-ink-2">
              Úsala si el intercambio no se cumplió o hubo un problema. La revisa
              la Municipalidad y el vecino denunciado no sabrá quién lo denunció.
            </p>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-semibold text-ink">¿Qué pasó?</legend>
              {MOTIVOS_DENUNCIA.map((m) => (
                <label
                  key={m.valor}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-2 text-sm has-[:checked]:border-green-700 has-[:checked]:bg-green-50"
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m.valor}
                    checked={motivo === m.valor}
                    onChange={() => setMotivo(m.valor)}
                  />
                  {m.etiqueta}
                </label>
              ))}
            </fieldset>

            <div>
              <label htmlFor="descripcion-denuncia" className="mb-1 block text-xs font-semibold text-ink">
                Cuéntanos más (opcional)
              </label>
              <textarea
                id="descripcion-denuncia"
                rows={3}
                maxLength={LARGO_DESCRIPCION_DENUNCIA}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="field resize-none text-sm"
              />
              <p className="mt-1 text-xs text-slate-2">
                No escribas direcciones, teléfonos ni RUN. {descripcion.length}/
                {LARGO_DESCRIPCION_DENUNCIA}
              </p>
            </div>

            {adjuntables.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-semibold text-ink">
                  Adjunta mensajes del chat como prueba (opcional, hasta {MAX_MENSAJES_ADJUNTOS})
                </legend>
                <p className="text-xs text-slate-2">
                  El funcionario verá solo los que marques, no toda la conversación.
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {adjuntables.map((m) => (
                    <li key={m.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-canvas">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={adjuntos.includes(m.id)}
                          disabled={
                            !adjuntos.includes(m.id) && adjuntos.length >= MAX_MENSAJES_ADJUNTOS
                          }
                          onChange={() => alternarAdjunto(m.id)}
                        />
                        <span className="min-w-0">
                          <span className="font-semibold">{m.esMio ? 'Tú' : nombre}: </span>
                          <span className="break-words">{m.contenido}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}

            {error && (
              <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!motivo || enviando}
              className="btn-primary w-full py-3"
            >
              {enviando ? 'Enviando…' : 'Enviar denuncia'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
