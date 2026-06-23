import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchMisSolicitudes,
  type EstadoSolicitud,
  type SolicitudRetiro,
} from '../api/arca';
import { useSession } from '../auth/SessionContext';

const ESTADO_STYLES: Record<EstadoSolicitud, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  asignada: 'bg-blue-100 text-blue-800',
  en_proceso: 'bg-indigo-100 text-indigo-800',
  completada: 'bg-green-100 text-green-800',
  cancelada: 'bg-gray-200 text-gray-600',
};

export default function MisSolicitudes() {
  const { usuarioCiudadanoId } = useSession();
  const [items, setItems] = useState<SolicitudRetiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuarioCiudadanoId) return;
    fetchMisSolicitudes(usuarioCiudadanoId)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [usuarioCiudadanoId]);

  if (loading) return <p className="text-gray-500">Cargando solicitudes…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h2 className="text-xl font-bold text-arca-dark mb-4">Mis solicitudes</h2>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-500">
          Aún no tienes solicitudes.{' '}
          <Link to="/catalogo" className="text-arca-green underline">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li
              key={s.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">Solicitud #{s.id}</p>
                <p className="text-sm text-gray-500">
                  {s.residuoCatalogo?.nombre ?? `Residuo #${s.residuoCatalogoId}`}
                  {s.descripcion ? ` · ${s.descripcion}` : ''}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full ${ESTADO_STYLES[s.estado]}`}
              >
                {s.estado}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
