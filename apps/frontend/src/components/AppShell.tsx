import { useState } from 'react';
import { Navigate, NavLink, Link, useLocation } from 'react-router-dom';
import type { ComponentType, ReactElement } from 'react';
import { useSession, type Rol } from '../auth/SessionContext';
import {
  IconHome,
  IconCamera,
  IconMarketplace,
  IconCircularCredits,
  IconUser,
  IconLeaf,
  IconLogout,
  IconPlus,
  IconX,
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

const TABS_IZQUIERDA: Tab[] = [
  { to: '/inicio', label: 'Inicio', Icon: IconHome },
  { to: '/marketplace', label: 'Mercado', Icon: IconMarketplace },
];

const TABS_DERECHA: Tab[] = [
  { to: '/circular-credits', label: 'Créditos', Icon: IconCircularCredits },
  { to: '/perfil', label: 'Perfil', Icon: IconUser },
];

function TabBar() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <>
      <nav className="sticky bottom-0 z-20 border-t border-line bg-white w-full">
        <ul className="mx-auto flex w-full max-w-lg items-center justify-around px-2 py-1 md:max-w-6xl md:justify-center md:gap-4">
          {/* Pestañas izquierda: Inicio y Marketplace */}
          {TABS_IZQUIERDA.map((tab) => {
            const TabIcon = tab.Icon;
            return (
              <li key={tab.to} className="flex-1 md:flex-initial">
                <NavLink
                  to={tab.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 rounded-md py-1 text-[10px] font-medium transition-colors md:px-6 md:py-2 md:text-sm ${
                      isActive
                        ? 'text-green-600 font-semibold'
                        : 'text-ink-2 hover:text-ink'
                    }`
                  }
                >
                  <TabIcon className="h-5 w-5 md:h-5 md:w-5" />
                  <span>{tab.label}</span>
                </NavLink>
              </li>
            );
          })}

          {/* Botón central (+) con menú de acciones rápidas */}
          <li className="relative flex-1 px-1 md:flex-initial">
            <div className="flex flex-col items-center gap-0.5 rounded-md py-1 text-[10px] font-medium text-ink-2 md:px-6 md:py-2 md:text-sm">
              <span className="h-5 w-5" aria-hidden="true" />
              <span>Tomar foto</span>
            </div>
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Acciones rápidas: tomar foto del residuo o publicar un artículo"
              className="brand-gradient absolute -top-[5px] left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-green transition-transform hover:scale-105 active:scale-95 hover:brightness-110"
            >
              <IconPlus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </li>

          {/* Pestañas derecha: Créditos y Perfil */}
          {TABS_DERECHA.map((tab) => {
            const TabIcon = tab.Icon;
            return (
              <li key={tab.to} className="flex-1 md:flex-initial">
                <NavLink
                  to={tab.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 rounded-md py-1 text-[10px] font-medium transition-colors md:px-6 md:py-2 md:text-sm ${
                      isActive
                        ? 'text-green-600 font-semibold'
                        : 'text-ink-2 hover:text-ink'
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

      {/* Modal / Menú de acción del botón (+) */}
      {menuAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setMenuAbierto(false)}
        >
          <div
            className="card w-full max-w-sm bg-white p-5 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-bold text-ink">
                  ¿Qué deseas realizar?
                </h3>
                <p className="text-xs text-slate">
                  Acciones ciudadanas en Santo Domingo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                className="rounded-md p-1.5 text-slate hover:bg-canvas hover:text-ink"
                aria-label="Cerrar menú"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <Link
                to="/solicitar"
                onClick={() => setMenuAbierto(false)}
                className="flex items-start gap-3 rounded-lg border border-line p-3 transition-colors hover:border-green-300 hover:bg-green-50/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-800">
                  <IconCamera className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">
                    Solicitar un retiro
                  </p>
                  <p className="text-xs text-slate">
                    Foto con IA para recolección de voluminosos
                  </p>
                </div>
              </Link>

              <Link
                to="/marketplace/subir"
                onClick={() => setMenuAbierto(false)}
                className="flex items-start gap-3 rounded-lg border border-line p-3 transition-colors hover:border-green-300 hover:bg-green-50/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gold-100 text-gold-700">
                  <IconMarketplace className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">
                    Publicar en Marketplace
                  </p>
                  <p className="text-xs text-slate">
                    Regala o intercambia con tus vecinos
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


function Shell({ children }: { children: ReactElement }) {
  const { sesion, salir } = useSession();
  const pathname = useLocation().pathname;
  const usaTextoOscuro =
    pathname === '/inicio' ||
    pathname.startsWith('/marketplace') ||
    pathname === '/circular-credits';
  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <header className="brand-gradient sticky top-0 z-10 w-full border-b border-green-700/50 px-4 py-2.5 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center justify-between gap-3">
            <Link to="/inicio" className="flex min-w-0 items-center gap-2 group">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-green-700 transition-colors group-hover:bg-green-50">
                <IconLeaf className="h-5 w-5" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="font-display text-base font-extrabold tracking-tight leading-none text-white">
                  A.R.C.A.
                </span>
                <span className="text-[10px] font-medium leading-tight text-white/75">
                  Comuna de Santo Domingo
                </span>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
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
                className="flex items-center gap-1 rounded-pill p-1.5 text-xs text-white transition-colors hover:bg-white/15 hover:text-white sm:px-2.5 sm:py-1"
              >
                <IconLogout className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 ${usaTextoOscuro ? 'page-text-contrast' : ''}`}>
        {children}
      </main>
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
