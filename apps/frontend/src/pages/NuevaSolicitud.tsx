import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  crearSolicitudRetiro,
  fetchCatalogo,
  type ResiduoCatalogo,
} from '../api/arca';
import { useSession } from '../auth/SessionContext';

export default function NuevaSolicitud() {
  const { usuarioCiudadanoId } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [catalogo, setCatalogo] = useState<ResiduoCatalogo[]>([]);
  const [residuoCatalogoId, setResiduoCatalogoId] = useState<number | ''>(
    searchParams.get('residuo') ? Number(searchParams.get('residuo')) : '',
  );
  const [descripcion, setDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalogo()
      .then(setCatalogo)
      .catch((e: Error) => setError(e.message));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (residuoCatalogoId === '' || !usuarioCiudadanoId) return;
    setSubmitting(true);
    setError(null);
    try {
      await crearSolicitudRetiro({
        usuarioCiudadanoId,
        residuoCatalogoId: Number(residuoCatalogoId),
        descripcion: descripcion.trim() || undefined,
      });
      navigate('/mis-solicitudes');
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-arca-dark mb-4">
        Nueva solicitud de retiro
      </h2>

      {error && <p className="text-red-600 mb-3 text-sm">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Tipo de residuo</label>
          <select
            value={residuoCatalogoId}
            onChange={(e) =>
              setResiduoCatalogoId(e.target.value ? Number(e.target.value) : '')
            }
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Selecciona…</option>
            {catalogo.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre} — {item.categoria}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Descripción (opcional)
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            placeholder="Ej: Sofá usado en buen estado"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || residuoCatalogoId === ''}
          className="w-full bg-arca-green hover:bg-arca-dark disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {submitting ? 'Enviando…' : 'Crear solicitud'}
        </button>
      </form>
    </div>
  );
}
