import { Route } from 'react-router-dom';
import { Protected, RequireSession } from '../../components/AppShell';
import Listado from './Listado';
import DetalleArticulo from './DetalleArticulo';
import PublicarArticulo from './PublicarArticulo';
import MisPublicaciones from './MisPublicaciones';
import Bandeja from './chat/Bandeja';
import Chat from './chat/Chat';

// Rutas del Marketplace P2P. Mismo patrón que features/solicitud-retiro/routes.tsx:
// se exporta un Fragment de <Route> (no un componente) y App.tsx lo monta como
// {marketplaceRoutes} dentro de <Routes>.
//
// "/marketplace/subir" se mantiene porque SolicitudCreada ya enlaza ahí. React
// Router prioriza los segmentos estáticos ("subir", "mis-publicaciones",
// "mensajes"), así que no chocan con "/marketplace/:id".
//
// El chat va a pantalla completa: RequireSession sin el Shell (header + TabBar).
const marketplaceRoutes = (
  <>
    <Route path="/marketplace" element={<Protected><Listado /></Protected>} />
    <Route
      path="/marketplace/subir"
      element={<Protected><PublicarArticulo /></Protected>}
    />
    <Route
      path="/marketplace/mis-publicaciones"
      element={<Protected><MisPublicaciones /></Protected>}
    />
    <Route
      path="/marketplace/mensajes"
      element={<Protected><Bandeja /></Protected>}
    />
    <Route
      path="/marketplace/:id/chat"
      element={<RequireSession><Chat /></RequireSession>}
    />
    <Route
      path="/marketplace/:id/chat/:conversacionId"
      element={<RequireSession><Chat /></RequireSession>}
    />
    <Route
      path="/marketplace/:id"
      element={<Protected><DetalleArticulo /></Protected>}
    />
  </>
);

export default marketplaceRoutes;
