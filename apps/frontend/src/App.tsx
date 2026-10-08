import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './auth/SessionContext';
import { Cargando, Protected, RequireRol } from './components/AppShell';
import { SolicitudFlowProvider } from './features/solicitud-retiro/SolicitudFlowContext';
import solicitudRetiroRoutes from './features/solicitud-retiro/routes';
import marketplaceRoutes from './features/marketplace/routes';
import Login from './pages/Login';
import AcercaDe from './pages/AcercaDe';
import SeleccionInicio from './pages/SeleccionInicio';
import Inicio from './pages/Inicio';
import MisSolicitudes from './pages/MisSolicitudes';
import Proximamente from './pages/Proximamente';
import Perfil from './pages/Perfil';
import CircularCredits from './pages/CircularCredits';
import { IconTruck } from './components/ui/Icons';

// Chunk aparte: el panel (páginas, api/admin.ts, leaflet) no debe pesar en la
// PWA del vecino (SPEC-frontend-unificado §2.2, criterio 3).
const AdminApp = lazy(() => import('./admin/AdminApp'));

// Tras autenticar, decide a dónde va la persona según el rol de la sesión:
//  - sin sesión                  → /login
//  - rol funcionario o admin     → pantalla de selección de contexto
//  - rol vecino                  → directo a la PWA (/inicio)
function Entrada() {
  const { sesion, cargando } = useSession();
  if (cargando) return <Cargando />;
  if (!sesion) return <Navigate to="/login" replace />;
  return sesion.rol === 'vecino' ? <Navigate to="/inicio" replace /> : <SeleccionInicio />;
}

export default function App() {
  return (
    <SessionProvider>
      <SolicitudFlowProvider>
        <BrowserRouter>
          <Routes>
            {/* Login diferido: ClaveÚnica primero, luego el gate decide */}
            <Route path="/login" element={<Login />} />
            <Route path="/acerca-de" element={<AcercaDe />} />
            <Route path="/" element={<Entrada />} />
            <Route path="/inicio" element={<Protected><Inicio /></Protected>} />
            <Route path="/perfil" element={<Protected><Perfil /></Protected>} />
            <Route path="/circular-credits" element={<Protected><CircularCredits /></Protected>} />
            <Route path="/creditos" element={<Navigate to="/circular-credits" replace />} />

            {/* Flujo Solicitar retiro: captura → IA → sugerencia → detalle → éxito
                (definido en features/solicitud-retiro/routes.tsx) */}
            {solicitudRetiroRoutes}

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
                    icono={<IconTruck className="h-10 w-10 text-green-700" />}
                    epica="EP-03"
                    descripcion="Agenda un retiro con la cuadrilla municipal. Estará disponible cuando integremos la gestión de operaciones."
                  />
                </Protected>
              }
            />

            {/* Marketplace P2P: listado, detalle y publicar
                (definido en features/marketplace/routes.tsx) */}
            {marketplaceRoutes}

            {/* Panel municipal, cargado aparte (SPEC-frontend-unificado §2.2) */}
            <Route
              path="/admin/*"
              element={
                <RequireRol roles={['funcionario', 'admin']}>
                  <Suspense fallback={<Cargando />}>
                    <AdminApp />
                  </Suspense>
                </RequireRol>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SolicitudFlowProvider>
    </SessionProvider>
  );
}
