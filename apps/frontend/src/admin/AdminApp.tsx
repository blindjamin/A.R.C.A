import { Navigate, Route, Routes } from 'react-router-dom';
import AdminShell from './components/AdminShell';
import Solicitudes from './pages/Solicitudes';
import Auditoria from './pages/Auditoria';
import MapaCalor from './pages/MapaCalor';
import Derivacion from './pages/Derivacion';
import Metricas from './pages/Metricas';
import { perfilDevActual } from './api/admin';
import './admin.css';

// El panel vive en /admin/* (rutas relativas: el BrowserRouter lo pone
// App.tsx). Sigue usando sus identidades de desarrollo internas para separar
// admin de funcionario (deuda declarada en api/admin.ts): la sesión real llega
// en FU2.
export default function AdminApp() {
  return (
    <AdminShell>
      <Routes>
        <Route index element={<Solicitudes />} />
        <Route path="metricas" element={<Metricas />} />
        <Route path="derivacion" element={<Derivacion />} />
        <Route path="mapa-calor" element={<MapaCalor />} />
        <Route
          path="auditoria"
          element={
            perfilDevActual() === 'admin' ? (
              <Auditoria />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminShell>
  );
}
