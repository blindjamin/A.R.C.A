import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';

export default function Login() {
  const { login } = useSession();
  const navigate = useNavigate();

  const handleLogin = () => {
    login();
    navigate('/inicio');
  };

  return (
    <div className="flex min-h-screen items-stretch justify-center bg-canvas">
      <div
        className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-between overflow-hidden px-7 py-12 text-white"
        style={{
          backgroundImage:
            'linear-gradient(165deg,#0f6b45,#138a57,#1bb46f)',
        }}
      >
        {/* Hero */}
        <div className="mt-16 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-white/15 text-4xl backdrop-blur">
            🌿
          </div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight">
            A.R.C.A.
          </h1>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.3em] text-green-100">
            Ciudadano
          </p>
          <p className="mx-auto mt-6 max-w-xs text-green-50/90">
            Tus voluminosos tienen una segunda vida. Gestión de residuos para
            Santo Domingo.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={handleLogin}
            className="btn-gold w-full py-4 text-base"
          >
            Ingresar con ClaveÚnica
          </button>
          <button
            onClick={handleLogin}
            className="w-full rounded-pill border border-white/30 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
          >
            Entrar como vecino (dev)
          </button>
          <p className="pt-2 text-center text-xs text-green-100/70">
            ClaveÚnica + JWT llegará en una fase posterior.
          </p>
        </div>
      </div>
    </div>
  );
}
