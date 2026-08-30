import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './auth/SessionContext';
import { Cargando, Protected, RequireAdmin } from './components/AppShell';
import { SolicitudFlowProvider } from './features/solicitud-retiro/SolicitudFlowContext';
import solicitudRetiroRoutes from './features/solicitud-retiro/routes';
import Login from './pages/Login';
import SeleccionInicio from './pages/SeleccionInicio';
import AdminSolicitudes from './pages/AdminSolicitudes';
import Inicio from './pages/Inicio';
import MisSolicitudes from './pages/MisSolicitudes';
import Proximamente from './pages/Proximamente';

// Login diferido: tras autenticar, decide a dónde va la persona.
//  - sin sesión        → /login
//  - funcionario       → pantalla de selección de contexto
//  - solo ciudadano    → directo a la PWA (/inicio)
function Entrada() {
  const { usuarioCiudadanoId, esAdministrador, cargando } = useSession();
  if (cargando) return <Cargando />;
  if (!usuarioCiudadanoId) return <Navigate to="/login" replace />;
  return esAdministrador ? <SeleccionInicio /> : <Navigate to="/inicio" replace />;
}

export default function App() {
  return (
    <SessionProvider>
      <SolicitudFlowProvider>
        <BrowserRouter>
          <Routes>
            {/* Login diferido: ClaveÚnica primero, luego el gate decide */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Entrada />} />
            <Route
              path="/admin"
              element={<RequireAdmin><AdminSolicitudes /></RequireAdmin>}
            />
            <Route path="/inicio" element={<Protected><Inicio /></Protected>} />

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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SolicitudFlowProvider>
    </SessionProvider>
  );
}
