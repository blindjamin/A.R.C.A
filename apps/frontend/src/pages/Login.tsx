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
    <div
      className="flex min-h-screen w-full items-center justify-center text-white"
      style={{
        backgroundImage: 'linear-gradient(165deg,#0f6b45,#138a57,#1bb46f)',
      }}
    >
      <div className="relative mx-auto flex min-h-screen w-full flex-col justify-between overflow-hidden px-7 py-12 md:min-h-0 md:h-auto md:flex-row md:items-center md:justify-between md:max-w-5xl md:px-16 md:py-20 md:gap-16">
        {/* Hero */}
        <div className="mt-16 md:mt-0 text-center md:text-left md:max-w-lg">
          <div className="mx-auto md:mx-0 mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-white/15 text-4xl backdrop-blur">
            🌿
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tight">
            A.R.C.A.
          </h1>
          <p className="mx-auto md:mx-0 mt-6 max-w-xs md:max-w-md text-green-50/90 text-sm md:text-base leading-relaxed">
            Tus voluminosos tienen una segunda vida. Gestión de residuos para
            Santo Domingo.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3 w-full max-w-md md:shrink-0 md:bg-white/10 md:backdrop-blur-md md:p-8 md:rounded-2xl md:border md:border-white/20">
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
