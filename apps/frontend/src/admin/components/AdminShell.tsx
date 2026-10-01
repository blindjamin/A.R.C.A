import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useSession } from '../../auth/SessionContext';
import { IconLeaf } from '../../components/ui/Icons';

const NAV = [
  { to: '/admin', label: 'Solicitudes', icon: '📋', end: true, reqAdmin: false },
  { to: '/admin/metricas', label: 'Métricas', icon: '📊', end: false, reqAdmin: false },
  { to: '/admin/derivacion', label: 'Derivación', icon: '📦', end: false, reqAdmin: false },
  { to: '/admin/mapa-calor', label: 'Mapa de calor', icon: '🗺️', end: false, reqAdmin: false },
  { to: '/admin/auditoria', label: 'Auditoría', icon: '🛡️', end: false, reqAdmin: true },
];

// Layout de escritorio del panel: barra lateral fija + contenido. Reemplaza el
// header/tabs que cada pantalla admin repetía por separado en el frontend
// ciudadano (no tiene sentido la tab bar móvil de AppShell.tsx en un panel
// municipal de escritorio).
export default function AdminShell({ children }: { children: ReactNode }) {
  const { sesion, salir } = useSession();
  const isAdmin = sesion?.rol === 'admin';
  const visibleNav = NAV.filter((item) => !item.reqAdmin || isAdmin);

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/20 bg-green-700">
        <div className="flex items-center gap-2.5 border-b border-white/20 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white">
            <IconLeaf className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-base font-extrabold leading-none tracking-tight text-white">
              A.R.C.A.
            </span>
            <span className="mt-1 text-[10px] font-medium leading-none text-white/75">
              Panel municipal
            </span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/20 px-3 py-3">
          <p className="truncate px-2 text-sm font-semibold text-white">
            {sesion?.nombre ?? 'Sesión municipal'}
          </p>
          <p className="px-2 text-xs capitalize text-white/75">{sesion?.rol}</p>
          <button
            onClick={() => void salir()}
            className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-xs text-white/90 hover:bg-white/10 hover:text-white"
          >
            Salir
          </button>
        </div>
      </aside>
      <main className="page-text-contrast min-w-0 flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
