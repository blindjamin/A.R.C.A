import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Solicitudes', icon: '📋', end: true },
  { to: '/auditoria', label: 'Auditoría', icon: '🛡️', end: false },
];

// Layout de escritorio del panel: barra lateral fija + contenido. Reemplaza el
// header/tabs que cada pantalla admin repetía por separado en el frontend
// ciudadano (no tiene sentido la tab bar móvil de AppShell.tsx en un panel
// municipal de escritorio).
export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-canvas">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-white">
        <div className="border-b border-line px-5 py-4">
          <span className="font-display text-lg font-extrabold tracking-tight text-green-700">
            A.R.C.A. · Panel
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-green-50 text-green-700' : 'text-slate hover:bg-line'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
