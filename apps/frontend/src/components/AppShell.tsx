import { Navigate, NavLink, Link } from 'react-router-dom';
import type { ComponentType, ReactElement } from 'react';
import { useSession, type Rol } from '../auth/SessionContext';
import {
  IconHome,
  IconCamera,
  IconClipboard,
  IconRecycle,
  IconUser,
  IconLogout,
  type IconProps,
} from './ui/Icons';

export function Cargando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-slate">
      Cargando…
    </div>
  );
}

export function RequireSession({ children }: { children: ReactElement }) {
  const { sesion, cargando } = useSession();
  if (cargando) return <Cargando />;
  return sesion ? children : <Navigate to="/login" replace />;
}

// Guarda de interfaz por rol: sin sesión manda a /login, con un rol que no
// corresponde manda a /inicio. Es comodidad de interfaz, no una barrera — la
// barrera real es el RolesGuard del backend (SPEC-frontend-unificado §2.2),
// que rechaza con 401/403 sin importar lo que decida esto.
export function RequireRol({
  roles,
  children,
}: {
  roles: Rol[];
  children: ReactElement;
}) {
  const { sesion, cargando } = useSession();
  if (cargando) return <Cargando />;
  if (!sesion) return <Navigate to="/login" replace />;
  return roles.includes(sesion.rol) ? children : <Navigate to="/inicio" replace />;
}

type Tab = { to: string; label: string; Icon: ComponentType<IconProps> };
const TABS: Tab[] = [
  { to: '/inicio', label: 'Inicio', Icon: IconHome },
  { to: '/solicitar', label: 'Solicitar', Icon: IconCamera },
  { to: '/mis-solicitudes', label: 'Solicitudes', Icon: IconClipboard },
  { to: '/marketplace', label: 'Mercado', Icon: IconRecycle },
  { to: '/perfil', label: 'Perfil', Icon: IconUser },
];

function TabBar() {
  return (
    <nav className="sticky bottom-0 z-10 border-t border-line bg-white/95 backdrop-blur w-full">
      <ul className="mx-auto flex w-full max-w-lg items-stretch justify-around px-2 py-1.5 md:max-w-6xl md:justify-center md:gap-4">
        {TABS.map((tab) => {
          const TabIcon = tab.Icon;
          return (
            <li key={tab.to} className="flex-1 md:flex-initial">
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-medium transition-colors md:px-6 md:py-2 md:text-sm ${
                    isActive ? 'text-green-700 font-semibold' : 'text-slate-2 hover:text-ink'
                  }`
                }
              >
                <TabIcon className="h-5 w-5 md:h-5 md:w-5" />
                <span>{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Shell({ children }: { children: ReactElement }) {
  const { sesion, salir } = useSession();
  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur w-full sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link to="/inicio" className="flex items-center gap-2 group">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-green-700 text-white font-display font-extrabold text-xs tracking-wider transition-colors group-hover:bg-green-800">
              AR
            </span>
            <div className="flex flex-col">
              <span className="font-display text-sm font-extrabold tracking-tight text-green-700 leading-none">
                A.R.C.A.
              </span>
              <span className="text-[10px] text-slate font-medium leading-tight">
                Santo Domingo
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link
              to="/perfil"
              className="flex items-center gap-1.5 rounded-pill border border-line bg-white px-3 py-1 text-xs text-ink transition-colors hover:border-green-300 hover:shadow-sm"
            >
              <IconUser className="h-3.5 w-3.5 text-green-700" />
              <span className="max-w-[120px] truncate font-medium text-slate hover:text-ink sm:max-w-[180px]">
                {sesion?.nombre || 'Mi Perfil'}
              </span>
            </Link>
            <button
              onClick={() => void salir()}
              title="Cerrar sesión"
              className="flex items-center gap-1 rounded-pill p-1.5 text-xs text-slate-2 transition-colors hover:text-rose-600 sm:px-2.5 sm:py-1 hover:bg-white"
            >
              <IconLogout className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">{children}</main>
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
