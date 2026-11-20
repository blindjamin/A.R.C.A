import { Navigate, Route } from 'react-router-dom';
import { Protected } from '../../components/AppShell';
import Catalogo from './Catalogo';
import NuevaSolicitud from './NuevaSolicitud';
import SolicitudCreada from './SolicitudCreada';

// Rutas del flujo "Solicitar retiro": catálogo → nueva solicitud → confirmación.
// /solicitar y subrutas redirigen a /nueva-solicitud (ingreso manual con foto obligatoria).
const solicitudRetiroRoutes = (
  <>
    <Route
      path="/solicitar"
      element={<Navigate to="/nueva-solicitud" replace />}
    />
    <Route
      path="/solicitar/analizando"
      element={<Navigate to="/nueva-solicitud" replace />}
    />
    <Route
      path="/solicitar/sugerencias"
      element={<Navigate to="/nueva-solicitud" replace />}
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
  </>
);

export default solicitudRetiroRoutes;
