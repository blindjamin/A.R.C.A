import { useNavigate } from 'react-router-dom';
import { DEV_USERS, useSession } from '../auth/SessionContext';

export default function Login() {
  const { login } = useSession();
  const navigate = useNavigate();

  const entrar = (usuarioCiudadanoId: string) => {
    login(usuarioCiudadanoId);
    // El gate de "/" decide a dónde ir según el perfil (admin o solo ciudadano).
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-stretch justify-center bg-canvas">
      <div
        className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-between overflow-hidden px-7 py-12 text-white"
        style={{
          backgroundImage: 'linear-gradient(165deg,#0f6b45,#138a57,#1bb46f)',
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
          <p className="mx-auto mt-6 max-w-xs text-green-50/90">
            Tus voluminosos tienen una segunda vida. Gestión de residuos para
            Santo Domingo.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <button
            onClick={() => entrar(DEV_USERS.vecino)}
            className="btn-gold w-full py-4 text-base"
          >
            Ingresar con ClaveÚnica
          </button>

          {/* Accesos de desarrollo: simulan distintas identidades de ClaveÚnica
              para probar el login diferido (solo ciudadano vs. doble rol). */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => entrar(DEV_USERS.vecino)}
              className="rounded-pill border border-white/30 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              Vecino (dev)
            </button>
            <button
              onClick={() => entrar(DEV_USERS.funcionario)}
              className="rounded-pill border border-white/30 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              Funcionario (dev)
            </button>
          </div>

          <p className="pt-2 text-center text-xs text-green-100/70">
            ClaveÚnica + JWT llegará en una fase posterior. Tras autenticar, si la
            persona es funcionaria podrá elegir App ciudadana o Panel municipal.
          </p>
        </div>
      </div>
    </div>
  );
}
