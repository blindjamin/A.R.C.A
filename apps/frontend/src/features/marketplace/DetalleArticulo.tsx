import { useNavigate, useParams } from 'react-router-dom';
import { BackButton, ScreenHeader } from '../../components/ui';

// Pendiente (fase 2 de esta rama): foto, descripción, banda, créditos y
// reputación de quien publica, vía obtenerArticulo().
export default function DetalleArticulo() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <BackButton onClick={() => navigate('/marketplace')} />
      <ScreenHeader title={`Artículo #${id}`} subtitle="Detalle en construcción." />
    </div>
  );
}
