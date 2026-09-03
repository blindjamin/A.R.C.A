import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminShell from './components/AdminShell';
import Solicitudes from './pages/Solicitudes';
import Auditoria from './pages/Auditoria';

import MapaCalor from './pages/MapaCalor';

// TODO(deuda declarada en la migración admin): esta app todavía no tiene su
// propio login de ClaveÚnica ni un guard de sesión — cualquiera con la URL
// entra directo. Es la tarea siguiente, reportada al equipo por regla A.4.
export default function App() {
  return (
    <BrowserRouter>
      <AdminShell>
        <Routes>
          <Route path="/" element={<Solicitudes />} />
          <Route path="/mapa-calor" element={<MapaCalor />} />
          <Route path="/auditoria" element={<Auditoria />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminShell>
    </BrowserRouter>
  );
}
