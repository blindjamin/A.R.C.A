import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
} from 'react-router-dom';
import type { ReactElement } from 'react';
import { SessionProvider, useSession } from './auth/SessionContext';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import NuevaSolicitud from './pages/NuevaSolicitud';
import MisSolicitudes from './pages/MisSolicitudes';

function RequireSession({ children }: { children: ReactElement }) {
  const { usuarioCiudadanoId } = useSession();
  return usuarioCiudadanoId ? children : <Navigate to="/login" replace />;
}

function Layout({ children }: { children: ReactElement }) {
  const { logout } = useSession();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm ${
      isActive ? 'bg-arca-light text-arca-dark font-medium' : 'text-gray-600'
    }`;

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/catalogo" className="font-bold text-arca-dark">
            🌿 A.R.C.A.
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/catalogo" className={linkClass}>
              Catálogo
            </NavLink>
            <NavLink to="/mis-solicitudes" className={linkClass}>
              Mis solicitudes
            </NavLink>
            <button
              onClick={logout}
              className="ml-2 text-sm text-gray-400 hover:text-gray-600"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/catalogo"
            element={
              <RequireSession>
                <Layout>
                  <Catalogo />
                </Layout>
              </RequireSession>
            }
          />
          <Route
            path="/nueva-solicitud"
            element={
              <RequireSession>
                <Layout>
                  <NuevaSolicitud />
                </Layout>
              </RequireSession>
            }
          />
          <Route
            path="/mis-solicitudes"
            element={
              <RequireSession>
                <Layout>
                  <MisSolicitudes />
                </Layout>
              </RequireSession>
            }
          />
          <Route path="*" element={<Navigate to="/catalogo" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
