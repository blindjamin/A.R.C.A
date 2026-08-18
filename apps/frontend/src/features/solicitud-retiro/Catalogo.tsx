import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCatalogo,
  iconoPorCategoria,
  type ResiduoCatalogo,
} from '../../api/arca';
import { IconBadge, PriceTag, ScreenHeader } from '../../components/ui';

export default function Catalogo() {
  const [items, setItems] = useState<ResiduoCatalogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<string>('Todos');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCatalogo()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const categorias = useMemo(
    () => ['Todos', ...new Set(items.map((i) => i.categoria))],
    [items],
  );

  const filtrados = items.filter((i) => {
    const matchCat = categoria === 'Todos' || i.categoria === categoria;
    const matchText = i.nombre.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchText;
  });

  if (loading) return <p className="text-slate">Cargando catálogo…</p>;
  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div className="space-y-4">
      <ScreenHeader
        title="Catálogo"
        subtitle="Residuos voluminosos y su valor de retiro."
      />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar sofá, refrigerador…"
        className="field"
      />

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoria(cat)}
            className={`chip whitespace-nowrap ${
              categoria === cat ? 'chip-active' : ''
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtrados.map((item) => (
          <div key={item.id} className="card flex items-center gap-3 p-3">
            <IconBadge
              icon={iconoPorCategoria(item.categoria)}
              className="h-14 w-14 text-2xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-bold">{item.nombre}</h3>
                {item.puedeReutilizarse && (
                  <span className="pill bg-gold-100 text-gold-600">Reutilizable</span>
                )}
              </div>
              <p className="text-xs text-slate">{item.categoria}</p>
              <p className="mt-0.5">
                <PriceTag amount={item.precio} className="text-sm" />
              </p>
            </div>
            <button
              onClick={() => navigate(`/nueva-solicitud?residuo=${item.id}`)}
              className="btn-primary shrink-0 px-4 py-2 text-xs"
            >
              Solicitar
            </button>
          </div>
        ))}
        {filtrados.length === 0 && (
          <p className="py-8 text-center text-sm text-slate">
            Sin resultados para tu búsqueda.
          </p>
        )}
      </div>
    </div>
  );
}
