import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireRol } from '../components/AppShell';
import AdminShell from './components/AdminShell';
import Solicitudes from './pages/Solicitudes';
import Auditoria from './pages/Auditoria';
import MapaCalor from './pages/MapaCalor';
import Derivacion from './pages/Derivacion';
import Metricas from './pages/Metricas';
import './admin.css';

// El panel vive en /admin/* (rutas relativas: el BrowserRouter lo pone
// App.tsx). App.tsx ya exige rol funcionario/admin para entrar acá
// (SPEC-frontend-unificado §2.2); adentro solo falta acotar auditoría a admin.
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
            <RequireRol roles={['admin']}>
              <Auditoria />
            </RequireRol>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminShell>
  );
}
