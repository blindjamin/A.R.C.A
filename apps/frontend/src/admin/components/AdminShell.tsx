import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BarraAccesibilidad, MenuAccesibilidad } from '../../accesibilidad/BarraAccesibilidad';
import { useSession } from '../../auth/SessionContext';
import {
  IconFlag,
  IconChart,
  IconClipboard,
  IconCreditCard,
  IconMap,
  IconMarketplace,
  IconMenu,
  IconShield,
  IconTruck,
  IconX,
} from '../../components/ui/Icons';

const NAV = [
  { to: '/admin', label: 'Solicitudes', icon: IconClipboard, end: true, reqAdmin: false },
  { to: '/admin/marketplace', label: 'Marketplace', icon: IconMarketplace, end: false, reqAdmin: false },
  { to: '/admin/denuncias', label: 'Denuncias', icon: IconFlag, end: false, reqAdmin: false },
  { to: '/admin/metricas', label: 'Métricas', icon: IconChart, end: false, reqAdmin: false },
  { to: '/admin/derivacion', label: 'Derivación', icon: IconTruck, end: false, reqAdmin: false },
  { to: '/admin/pagadas', label: 'Pagadas', icon: IconCreditCard, end: false, reqAdmin: false },
  { to: '/admin/mapa-calor', label: 'Mapa de calor', icon: IconMap, end: false, reqAdmin: false },
  { to: '/admin/auditoria', label: 'Auditoría', icon: IconShield, end: false, reqAdmin: true },
];

// Layout del panel: barra lateral + contenido. Desde `lg` la barra queda fija;
// en pantallas más chicas se esconde y se abre como menú desde la barra
// superior (menú y no tab bar, para poder sumar secciones sin que no quepan).
export default function AdminShell({ children }: { children: ReactNode }) {
  const { sesion, salir } = useSession();
  const isAdmin = sesion?.rol === 'admin';
  const visibleNav = NAV.filter((item) => !item.reqAdmin || isAdmin);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!menuAbierto) return;
    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [menuAbierto]);

  return (
    // Marco fijo de app: la barra queda quieta y solo se desplaza el contenido.
    <div className="admin-shell flex h-dvh w-full flex-col overflow-hidden bg-canvas lg:flex-row">
      <header className="flex shrink-0 items-center gap-3 bg-green-700 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white lg:hidden">
        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          aria-controls="admin-menu"
          className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10"
        >
          <IconMenu className="h-6 w-6" />
        </button>
        <span className="font-display text-base font-extrabold tracking-tight">
          A.R.C.A.
        </span>
        <span className="text-xs text-white/75">Panel municipal</span>
        <div className="ml-auto">
          <MenuAccesibilidad />
        </div>
      </header>
      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-ink/50 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}
      <aside
        id="admin-menu"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-r border-white/20 bg-green-700 transition-[transform,visibility] duration-200 lg:visible lg:static lg:w-60 lg:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-white/20 px-5 py-4">
          <img src="/isotipo.svg" alt="" className="h-9 w-9 shrink-0" />
          <div className="flex flex-col">
            <span className="font-display text-base font-extrabold leading-none tracking-tight text-white">
              A.R.C.A.
            </span>
            <span className="mt-1 text-[10px] font-medium leading-none text-white/75">
              Panel municipal
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            className="-mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-md text-white hover:bg-white/10 lg:hidden"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors lg:py-2 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-xs'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0 text-white/90" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-white/20 px-5 py-3 lg:block">
          <BarraAccesibilidad />
        </div>
        <div className="border-t border-white/20 px-3 py-3">
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
      <main className="page-text-contrast min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 lg:px-6 lg:py-6">{children}</main>
    </div>
  );
}
