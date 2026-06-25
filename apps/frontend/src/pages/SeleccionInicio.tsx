import { useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';

export default function SeleccionInicio() {
  const navigate = useNavigate();
  const { perfil, logout } = useSession();
  const nombre = perfil?.administrador?.nombre;

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
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            {nombre ? `Hola, ${nombre}` : 'A.R.C.A.'}
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-green-50/90">
            Tu cuenta es municipal. ¿Con qué contexto quieres entrar?
          </p>
        </div>

        {/* Selección de contexto */}
        <div className="space-y-3">
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
