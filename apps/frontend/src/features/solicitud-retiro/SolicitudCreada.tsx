import { useNavigate } from 'react-router-dom';
import { useSolicitudFlow } from './SolicitudFlowContext';

export default function SolicitudCreada() {
  const navigate = useNavigate();
  const { reset } = useSolicitudFlow();

  // Salir del flujo limpia la foto efímera.
  const irA = (ruta: string) => {
    reset();
    navigate(ruta);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      {/* SuccessRing dorado */}
      <div className="success-ring mt-4 flex h-28 w-28 items-center justify-center rounded-full bg-gold-50 text-5xl">
        ✅
      </div>

      <header>
        <h1 className="text-2xl font-extrabold">¡Solicitud creada!</h1>
        <p className="mt-1 text-sm text-slate">
          Tu retiro quedó registrado. Te avisaremos cuando sea agendado.
        </p>
      </header>

      <span className="pill bg-gold-100 text-gold-600">+5 Circular Credits</span>

      <div className="w-full space-y-3 pt-2">
        <p className="text-sm font-semibold text-slate">¿Qué quieres hacer ahora?</p>
        <button
          onClick={() => irA('/retiro-municipal')}
          className="btn-primary w-full py-3.5"
        >
          Registrar retiro municipal
        </button>
        <button
          onClick={() => irA('/marketplace/subir')}
          className="btn-gold w-full py-3.5"
        >
          ♻️ Subir al Marketplace
        </button>
        <button
          onClick={() => irA('/mis-solicitudes')}
          className="btn-ghost w-full"
        >
          Ver mis solicitudes
        </button>
      </div>
    </div>
  );
}
