import { useId, useState } from 'react';
import { calificar } from '../../api/marketplace';
import { EstrellasInput } from '../../components/ui';
import { mensajeDeError } from './formato';

const LARGO_MAXIMO_COMENTARIO = 1000;

interface CalificarIntercambioProps {
  articuloId: number;
  /** Nombre de quien publicó: a esa persona se califica. */
  nombrePublicador: string;
  /** Se llama cuando la calificación quedó guardada, para refrescar el artículo. */
  onCalificado: () => void;
}

/**
 * Calificación del intercambio (HU-15). Solo se muestra a quien recibió el
 * artículo y mientras `puedoCalificar` sea true: el backend rechaza el resto
 * (403 si no lo recibió, 409 si ya calificó o no está entregado).
 */
export default function CalificarIntercambio({
  articuloId,
  nombrePublicador,
  onCalificado,
}: CalificarIntercambioProps) {
  const idComentario = useId();
  const [puntuacion, setPuntuacion] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (puntuacion < 1) return;

    setEnviando(true);
    setError(null);
    try {
      await calificar(articuloId, {
        puntuacion,
        comentario: comentario.trim() || undefined,
      });
      setListo(true);
      onCalificado();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <p className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
        ¡Gracias! Calificaste a {nombrePublicador} con {puntuacion}{' '}
        {puntuacion === 1 ? 'estrella' : 'estrellas'}.
      </p>
    );
  }

  return (
    <section className="space-y-3 rounded-md border border-line p-4">
      <div>
        <h3 className="text-base font-bold text-ink">¿Cómo estuvo el intercambio?</h3>
        <p className="mt-1 text-xs text-slate">
          Califica a {nombrePublicador}. Con 4 o 5 estrellas recibe un bono de créditos.
        </p>
      </div>

      <form onSubmit={enviar} className="space-y-3 text-left">
        <EstrellasInput valor={puntuacion} onChange={setPuntuacion} disabled={enviando} />

        <div>
          <label htmlFor={idComentario} className="text-sm font-semibold">
            Comentario <span className="font-normal text-slate-2">(opcional)</span>
          </label>
          <textarea
            id={idComentario}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={LARGO_MAXIMO_COMENTARIO}
            rows={3}
            placeholder="¿Llegó en buen estado? ¿Fue puntual?"
            className="field mt-1 resize-none"
          />
          <p className="mt-1 text-right text-xs text-slate-2">
            {comentario.length}/{LARGO_MAXIMO_COMENTARIO}
          </p>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={puntuacion < 1 || enviando}
          className="btn-primary w-full"
        >
          {enviando ? 'Enviando…' : 'Enviar calificación'}
        </button>
      </form>
    </section>
  );
}
