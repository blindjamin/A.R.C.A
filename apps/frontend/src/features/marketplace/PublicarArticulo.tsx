import { useNavigate } from 'react-router-dom';
import { BackButton, ScreenHeader } from '../../components/ui';

// Pendiente (fase 2 de esta rama): formulario con tipo, título, descripción,
// categoría del catálogo y foto con vista previa local, vía publicarArticulo().
export default function PublicarArticulo() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <BackButton onClick={() => navigate('/marketplace')} />
      <ScreenHeader title="Publicar artículo" subtitle="Formulario en construcción." />
    </div>
  );
}
