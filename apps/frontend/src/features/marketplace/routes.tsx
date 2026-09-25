import { Route } from 'react-router-dom';
import { Protected } from '../../components/AppShell';
import Listado from './Listado';
import DetalleArticulo from './DetalleArticulo';
import PublicarArticulo from './PublicarArticulo';
import MisPublicaciones from './MisPublicaciones';

// Rutas del Marketplace P2P. Mismo patrón que features/solicitud-retiro/routes.tsx:
// se exporta un Fragment de <Route> (no un componente) y App.tsx lo monta como
// {marketplaceRoutes} dentro de <Routes>.
//
// "/marketplace/subir" se mantiene porque SolicitudCreada ya enlaza ahí. React
// Router prioriza los segmentos estáticos ("subir", "mis-publicaciones"), así
// que no chocan con "/marketplace/:id".
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
      path="/marketplace/:id"
      element={<Protected><DetalleArticulo /></Protected>}
    />
  </>
);

export default marketplaceRoutes;
