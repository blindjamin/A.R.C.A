import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCatalogo, type ResiduoCatalogo } from '../api/arca';

export default function Catalogo() {
  const [items, setItems] = useState<ResiduoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCatalogo()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Cargando catálogo…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h2 className="text-xl font-bold text-arca-dark mb-4">
        Catálogo de residuos
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{item.nombre}</h3>
              {item.puedeReutilizarse && (
                <span className="text-xs bg-arca-light text-arca-dark px-2 py-0.5 rounded-full">
                  Reutilizable
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{item.categoria}</p>
            {item.descripcion && (
              <p className="text-sm text-gray-600 mt-1">{item.descripcion}</p>
            )}
            <button
              onClick={() => navigate(`/nueva-solicitud?residuo=${item.id}`)}
              className="mt-3 self-start text-sm bg-arca-green hover:bg-arca-dark text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Solicitar retiro
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
