import { Link } from 'react-router-dom';
import type { MiBloqueo } from '../../api/bloqueo';

/** Aviso al vecino bloqueado en el Marketplace (HU-18). Motivo siempre como texto. */
export default function AvisoBloqueo({
  bloqueo,
  compacto = false,
}: {
  bloqueo: MiBloqueo | null;
  /** Versión corta para pantallas con poco alto, como el chat. */
  compacto?: boolean;
}) {
  if (!bloqueo?.bloqueado) return null;
  if (compacto) {
    return (
      <section
        role="alert"
        className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900"
      >
        <p className="break-words">
          <span className="font-bold">Tu cuenta está bloqueada en el Marketplace.</span> Motivo:{' '}
          {bloqueo.motivo}.{' '}
          <Link to="/ayuda" className="font-semibold underline">
            Pide que lo revisen
          </Link>
        </p>
      </section>
    );
  }
  return (
    <section
      role="alert"
      className="card space-y-2 border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
    >
      <h2 className="font-bold">Tu cuenta está bloqueada en el Marketplace</h2>
      <p className="break-words">Motivo: {bloqueo.motivo}</p>
      <p>
        No puedes publicar ni contactar a otros vecinos. Tus solicitudes de retiro siguen
        igual.
      </p>
      <p>
        Si crees que es un error, pide que lo revisen a la Municipalidad.{' '}
        <Link to="/ayuda" className="font-semibold underline">
          Ver cómo contactarla
        </Link>
      </p>
    </section>
  );
}
