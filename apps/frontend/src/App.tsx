import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
} from 'react-router-dom';
import type { ReactElement } from 'react';
import { SessionProvider, useSession } from './auth/SessionContext';
import { SolicitudFlowProvider } from './flow/SolicitudFlow';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Catalogo from './pages/Catalogo';
import NuevaSolicitud from './pages/NuevaSolicitud';
import MisSolicitudes from './pages/MisSolicitudes';
import CapturaResiduo from './pages/CapturaResiduo';
import AnalizandoIA from './pages/AnalizandoIA';
import SugerenciasIA from './pages/SugerenciasIA';
import SolicitudCreada from './pages/SolicitudCreada';
import Proximamente from './pages/Proximamente';

function RequireSession({ children }: { children: ReactElement }) {
  const { usuarioCiudadanoId } = useSession();
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
    <nav className="sticky bottom-0 z-10 border-t border-line bg-white/90 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-green-700' : 'text-slate-2'
                }`
              }
            >
              <span className="text-xl leading-none">{tab.icon}</span>
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
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-canvas shadow-lg">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-display text-lg font-extrabold tracking-tight text-green-700">
            A.R.C.A.
          </span>
          <button onClick={logout} className="text-xs text-slate-2 hover:text-ink">
            Salir
          </button>
        </div>
      </header>
      <main className="flex-1 px-5 py-5">{children}</main>
      <TabBar />
    </div>
  );
}

function Protected({ children }: { children: ReactElement }) {
  return (
    <RequireSession>
      <Shell>{children}</Shell>
    </RequireSession>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <SolicitudFlowProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/inicio" element={<Protected><Inicio /></Protected>} />

            {/* Flujo Solicitar retiro: captura → IA → sugerencia → detalle → éxito */}
            <Route path="/solicitar" element={<Protected><CapturaResiduo /></Protected>} />
            <Route
              path="/solicitar/analizando"
              element={<Protected><AnalizandoIA /></Protected>}
            />
            <Route
              path="/solicitar/sugerencias"
              element={<Protected><SugerenciasIA /></Protected>}
            />
            <Route path="/catalogo" element={<Protected><Catalogo /></Protected>} />
            <Route
              path="/nueva-solicitud"
              element={<Protected><NuevaSolicitud /></Protected>}
            />
            <Route
              path="/solicitud/creada"
              element={<Protected><SolicitudCreada /></Protected>}
            />
            <Route
              path="/mis-solicitudes"
              element={<Protected><MisSolicitudes /></Protected>}
            />

            {/* Placeholders sin backend todavía */}
            <Route
              path="/retiro-municipal"
              element={
                <Protected>
                  <Proximamente
                    titulo="Retiro municipal"
                    icono="🚛"
                    epica="EP-03"
                    descripcion="Agenda un retiro con la cuadrilla municipal. Estará disponible cuando integremos la gestión de operaciones."
                  />
                </Protected>
              }
            />
            <Route
              path="/marketplace/subir"
              element={
                <Protected>
                  <Proximamente
                    titulo="Subir al Marketplace"
                    icono="♻️"
                    epica="EP-02"
                    descripcion="Publica tu residuo para que otro vecino lo reutilice. El Marketplace P2P llega en una fase posterior."
                  />
                </Protected>
              }
            />

            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </BrowserRouter>
      </SolicitudFlowProvider>
    </SessionProvider>
  );
}
