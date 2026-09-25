import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCatalogo } from '../../api/arca';
import {
  listarArticulos,
  type ArticuloMarketplace,
  type FiltrosMarketplace,
  type TipoArticulo,
} from '../../api/marketplace';
import { ArticuloCard, EmptyState, ScreenHeader } from '../../components/ui';
import { useOrigenAproximado } from './distancia';

const TIPOS: { valor: TipoArticulo | null; etiqueta: string }[] = [
  { valor: null, etiqueta: 'Todos' },
  { valor: 'regalo', etiqueta: '🎁 Regalo' },
  { valor: 'intercambio', etiqueta: '🔄 Intercambio' },
];

const ESPERA_BUSQUEDA_MS = 300;

interface Resultado {
  clave: string;
  articulos: ArticuloMarketplace[];
  error: string | null;
}

export default function Listado() {
  const navigate = useNavigate();
  const { origen, estado: estadoUbicacion } = useOrigenAproximado();

  const [tipo, setTipo] = useState<TipoArticulo | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [textoBuscado, setTextoBuscado] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // Las categorías salen del catálogo municipal: es la misma taxonomía que usa
  // cada artículo (residuoCatalogoId). Si falla, simplemente no hay chips.
  useEffect(() => {
    fetchCatalogo()
      .then((items) => setCategorias([...new Set(items.map((i) => i.categoria))]))
      .catch(() => setCategorias([]));
  }, []);

  // No se consulta en cada tecla, sino cuando la persona deja de escribir.
  useEffect(() => {
    const t = setTimeout(() => setTextoBuscado(texto.trim()), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(t);
  }, [texto]);

  const filtros = useMemo<FiltrosMarketplace>(
    () => ({
      tipo: tipo ?? undefined,
      categoria: categoria ?? undefined,
      texto: textoBuscado || undefined,
      origen,
    }),
    [tipo, categoria, textoBuscado, origen],
  );
  const clave = JSON.stringify(filtros);

  useEffect(() => {
    let vigente = true;
    listarArticulos(filtros)
      .then((articulos) => vigente && setResultado({ clave, articulos, error: null }))
      .catch(
        (e: Error) =>
          vigente && setResultado({ clave, articulos: [], error: e.message }),
      );
    return () => {
      vigente = false;
    };
  }, [filtros, clave]);

  // Mientras llega la respuesta de los filtros actuales se muestra "cargando",
  // pero solo la primera vez; después se mantiene la lista anterior visible.
  const cargando = resultado === null;
  const actualizando = resultado !== null && resultado.clave !== clave;
  const hayFiltros = tipo !== null || categoria !== null || textoBuscado !== '';

  const irAPublicar = () => navigate('/marketplace/subir');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <ScreenHeader
            title="Marketplace"
            subtitle="Regala o intercambia con tus vecinos."
          />
          <button
            onClick={() => navigate('/marketplace/mis-publicaciones')}
            className="mt-1 text-sm font-semibold text-green-700 hover:underline"
          >
            Mis publicaciones →
          </button>
        </div>
        <button onClick={irAPublicar} className="btn-gold shrink-0">
          ♻️ Publicar
        </button>
      </div>

      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar sofá, refrigerador…"
        className="field"
        aria-label="Buscar artículos"
      />

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {TIPOS.map((t) => (
          <button
            key={t.etiqueta}
            onClick={() => setTipo(t.valor)}
            className={`chip whitespace-nowrap ${tipo === t.valor ? 'chip-active' : ''}`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {categorias.length > 0 && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {[null, ...categorias].map((cat) => (
            <button
              key={cat ?? 'todas'}
              onClick={() => setCategoria(cat)}
              className={`chip whitespace-nowrap ${
                categoria === cat ? 'chip-active' : ''
              }`}
            >
              {cat ?? 'Todas las categorías'}
            </button>
          ))}
        </div>
      )}

      {estadoUbicacion === 'denegado' && (
        <p className="rounded-md bg-sky-100 px-4 py-2.5 text-xs text-sky-600">
          📍 Activa la ubicación para ver a qué distancia está cada artículo.
        </p>
      )}

      {cargando ? (
        <p className="text-slate">Cargando artículos…</p>
      ) : resultado.error ? (
        <p className="text-rose-600">{resultado.error}</p>
      ) : resultado.articulos.length === 0 ? (
        <EmptyState
          icon="♻️"
          message={
            hayFiltros
              ? 'No hay artículos que coincidan con tu búsqueda.'
              : 'Todavía no hay artículos publicados. ¡Sé el primero!'
          }
          action={
            <button onClick={irAPublicar} className="btn-primary">
              Publicar un artículo
            </button>
          }
        />
      ) : (
        <div
          className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 lg:grid-cols-4 ${
            actualizando ? 'opacity-60' : ''
          }`}
        >
          {resultado.articulos.map((a) => (
            <ArticuloCard
              key={a.id}
              articulo={a}
              onClick={() => navigate(`/marketplace/${a.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
