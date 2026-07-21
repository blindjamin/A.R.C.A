import { Route } from 'react-router-dom';
import { Protected } from '../../components/AppShell';
import CapturaResiduo from './CapturaResiduo';
import AnalizandoIA from './AnalizandoIA';
import SugerenciasIA from './SugerenciasIA';
import Catalogo from './Catalogo';
import NuevaSolicitud from './NuevaSolicitud';
import SolicitudCreada from './SolicitudCreada';

// Rutas del flujo "Solicitar retiro": captura → IA → sugerencia → catálogo →
// nueva solicitud → confirmación. App.tsx las monta como un bloque, sin
// conocer el detalle interno del flujo — así se puede seguir creciendo este
// módulo (nuevos pasos, variantes) sin tocar el resto de las rutas de la app.
//
// Se exporta un elemento (Fragment de <Route>), no un componente: <Routes>
// de react-router recorre sus hijos buscando <Route>/<Fragment> directamente,
// así que envolver esto en un componente propio (<SolicitudRetiroRoutes />)
// rompería esa detección. Se usa como {solicitudRetiroRoutes} dentro de <Routes>.
const solicitudRetiroRoutes = (
  <>
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
  </>
);

export default solicitudRetiroRoutes;
