import { Navigate, NavLink } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useSession } from '../auth/SessionContext';

export function Cargando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-slate">
      Cargando…
    </div>
  );
}

export function RequireSession({ children }: { children: ReactElement }) {
  const { usuarioCiudadanoId, cargando } = useSession();
  if (cargando) return <Cargando />;
  return usuarioCiudadanoId ? children : <Navigate to="/login" replace />;
}

type Tab = { to: string; label: string; icon: string };
const TABS: Tab[] = [
  { to: '/inicio', label: 'Inicio', icon: '🏠' },
  { to: '/solicitar', label: 'Solicitar', icon: '📷' },
  { to: '/mis-solicitudes', label: 'Solicitudes', icon: '📋' },
];

function TabBar() {
  return (
    <nav className="sticky bottom-0 z-10 border-t border-line bg-white/90 backdrop-blur w-full">
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-around px-2 py-1.5 md:max-w-6xl md:justify-center md:gap-4">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1 md:flex-initial">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium transition-colors md:px-8 md:py-2 md:text-sm ${
                  isActive ? 'text-green-700' : 'text-slate-2'
                }`
              }
            >
              <span className="text-xl leading-none md:text-2xl">{tab.icon}</span>
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Shell({ children }: { children: ReactElement }) {
  const { logout } = useSession();
  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 px-5 py-3 backdrop-blur w-full">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <span className="font-display text-lg font-extrabold tracking-tight text-green-700">
            A.R.C.A.
          </span>
          <button onClick={logout} className="text-xs text-slate-2 hover:text-ink">
            Salir
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-5">{children}</main>
      <TabBar />
    </div>
  );
}

// Wrapper estándar de ruta: exige sesión y monta el shell (header + tab bar).
// Vive fuera de App.tsx para que módulos de features (ej. solicitud-retiro)
// puedan envolver sus propias rutas sin crear un import circular con App.tsx.
export function Protected({ children }: { children: ReactElement }) {
  return (
    <RequireSession>
      <Shell>{children}</Shell>
    </RequireSession>
  );
}
