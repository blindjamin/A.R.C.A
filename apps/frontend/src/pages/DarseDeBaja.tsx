import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import { darseDeBaja, fetchEstadoBaja, type EstadoBaja } from '../api/baja';
import { BackButton, ScreenHeader } from '../components/ui';

// HU-38 y decisión 011: la baja desactiva la cuenta y no borra el historial;
// volver es automático pasadas 48 h. Borrar los datos es la supresión, que va
// por solicitud a la Municipalidad (política de privacidad).
export default function DarseDeBaja() {
  const navigate = useNavigate();
  const { sesion, recargar } = useSession();
  const [estado, setEstado] = useState<EstadoBaja | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entiendo, setEntiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const esMunicipal = sesion?.rol !== 'vecino';

  useEffect(() => {
    if (esMunicipal) return;
    fetchEstadoBaja().then(setEstado, () =>
      setError('No pudimos revisar tu cuenta. Inténtalo de nuevo en un momento.'),
    );
  }, [esMunicipal]);

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const baja = await darseDeBaja();
      // El backend ya cerró la sesión y borró la cookie. Primero se navega al
      // login con el aviso: si se recargara antes, el guardia de la ruta
      // mandaría a /login sin él.
      navigate(`/login?baja=${encodeURIComponent(baja.puedeVolverDesde)}`, {
        replace: true,
      });
      void recargar();
    } catch (e) {
      setError(
        (e as Error).message.startsWith('Error 409')
          ? 'Algo cambió mientras confirmabas. Revisa tus solicitudes e intercambios e inténtalo de nuevo.'
          : 'No pudimos darte de baja. Inténtalo de nuevo en un momento.',
      );
      setEnviando(false);
      fetchEstadoBaja().then(setEstado, () => {});
    }
  };

  return (
    <div className="page-text-contrast mx-auto max-w-2xl space-y-5 pb-10">
      <BackButton onClick={() => navigate('/perfil')} />
      <ScreenHeader
        title="Darme de baja"
        subtitle="Desactiva tu cuenta de A.R.C.A. Puedes volver cuando quieras, pasadas 48 horas."
      />

      {esMunicipal ? (
        <p className="card p-5 text-sm leading-relaxed text-ink-2">
          Tu cuenta tiene acceso al panel municipal, así que no puedes darte de baja
          desde la aplicación. Pídeselo al equipo de informática de la Municipalidad.
        </p>
      ) : (
        <>
          <section className="card space-y-3 p-5 text-sm leading-relaxed text-ink-2">
            <h2 className="text-base font-bold text-ink">Qué pasa si te das de baja</h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>No podrás entrar a A.R.C.A. hasta que vuelvas.</li>
              <li>Tus publicaciones del Marketplace dejan de verse.</li>
              <li>
                Se borran tus datos de contacto (teléfono y dirección) y se apagan las
                notificaciones en tus dispositivos.
              </li>
              {estado && estado.solicitudesQueSeCancelan.length > 0 && (
                <li>
                  Se cancelan tus solicitudes de retiro que no has pagado (
                  {estado.solicitudesQueSeCancelan.map((id) => `#${id}`).join(', ')}).
                </li>
              )}
            </ul>
            <p>
              <strong className="text-ink">Volver es automático:</strong> pasadas{' '}
              {estado?.horasParaVolver ?? 48} horas, entra de nuevo con ClaveÚnica y tu
              historial aparece como lo dejaste.
            </p>
            <p>
              <strong className="text-ink">Darte de baja no borra tus datos.</strong> Si
              quieres que se borren, pídelo a la Municipalidad como solicitud de supresión.
              Te explicamos cómo en la{' '}
              <Link to="/privacidad" className="font-semibold text-green-700 underline">
                política de privacidad
              </Link>
              .
            </p>
          </section>

          {estado && !estado.puedeDarseDeBaja && (
            <section
              role="alert"
              className="card space-y-2 border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
            >
              <h2 className="font-bold">Antes de darte de baja</h2>
              {estado.solicitudesQueBloquean.length > 0 && (
                <p>
                  Tienes solicitudes pagadas o en retiro (
                  {estado.solicitudesQueBloquean.map((id) => `#${id}`).join(', ')}). Espera a
                  que se complete el retiro.{' '}
                  <Link to="/mis-solicitudes" className="font-semibold underline">
                    Ver mis solicitudes
                  </Link>
                </p>
              )}
              {estado.articulosQueBloquean.length > 0 && (
                <p>
                  Tienes intercambios reservados en el Marketplace. Entrégalos o libéralos
                  primero:{' '}
                  {estado.articulosQueBloquean.map((id, i) => (
                    <span key={id}>
                      {i > 0 && ', '}
                      <Link to={`/marketplace/${id}`} className="font-semibold underline">
                        artículo #{id}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </section>
          )}

          {error && (
            <p role="alert" className="card border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </p>
          )}

          {estado?.puedeDarseDeBaja && (
            <section className="card space-y-4 p-5">
              <label className="flex items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={entiendo}
                  onChange={(e) => setEntiendo(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-red-700"
                />
                Entiendo que mi cuenta quedará desactivada y que podré volver pasadas{' '}
                {estado.horasParaVolver} horas.
              </label>
              <button
                type="button"
                disabled={!entiendo || enviando}
                onClick={confirmar}
                className="w-full rounded-pill bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando ? 'Dándote de baja…' : 'Darme de baja'}
              </button>
            </section>
          )}

          {!estado && !error && <p className="text-sm text-slate">Revisando tu cuenta…</p>}
        </>
      )}
    </div>
  );
}
