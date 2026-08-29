import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';

export default function SeleccionInicio() {
  const navigate = useNavigate();
  const { perfil, logout } = useSession();
  const nombre = perfil?.administrador?.nombre;

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
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight">
            {nombre ? `Hola, ${nombre}` : 'A.R.C.A.'}
          </h1>
          <p className="mx-auto md:mx-0 mt-4 max-w-xs md:max-w-md text-green-50/90 text-sm md:text-base leading-relaxed">
            Tu cuenta es municipal. ¿Con qué contexto quieres entrar?
          </p>
        </div>

        {/* Selección de contexto */}
        <div className="space-y-3 w-full max-w-md md:shrink-0 md:bg-white/10 md:backdrop-blur-md md:p-8 md:rounded-2xl md:border md:border-white/20">
          <button
            onClick={() => navigate('/inicio')}
            className="flex w-full items-center gap-4 rounded-2xl bg-white/10 p-4 text-left backdrop-blur transition-colors hover:bg-white/15"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl">
              📱
            </span>
            <span>
              <span className="block text-base font-bold">Modo vecino</span>
              <span className="block text-sm text-green-50/80">
                App ciudadana: solicita y sigue tus retiros
              </span>
            </span>
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="flex w-full items-center gap-4 rounded-2xl bg-white/10 p-4 text-left backdrop-blur transition-colors hover:bg-white/15"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl">
              🏛️
            </span>
            <span>
              <span className="block text-base font-bold">Modo funcionario</span>
              <span className="block text-sm text-green-50/80">
                Panel municipal: revisa y gestiona solicitudes
              </span>
            </span>
          </button>

          <button
            onClick={logout}
            className="w-full pt-2 text-center text-xs text-green-100/70 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
