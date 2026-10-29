import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCatalogo } from '../../api/arca';
import {
  listarArticulos,
  type ArticuloMarketplace,
  type FiltrosMarketplace,
  type TipoArticulo,
} from '../../api/marketplace';
import {
  ArticuloCard,
  EmptyState,
  IconMapPin,
  IconRecycle,
  IconSearch,
} from '../../components/ui';
import { useOrigenAproximado } from './distancia';
import { MarketplaceHeader } from './MarketplaceNav';

const TIPOS: { valor: TipoArticulo | null; etiqueta: string }[] = [
  { valor: null, etiqueta: 'Todos' },
  { valor: 'regalo', etiqueta: 'Regalos' },
  { valor: 'intercambio', etiqueta: 'Intercambios' },
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

  // Las categorías salen del catálogo municipal
  useEffect(() => {
    fetchCatalogo()
      .then((items) => setCategorias([...new Set(items.map((i) => i.categoria))]))
      .catch(() => setCategorias([]));
  }, []);

  // Debounce en búsqueda
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

  const cargando = resultado === null;
  const actualizando = resultado !== null && resultado.clave !== clave;
  const hayFiltros = tipo !== null || categoria !== null || textoBuscado !== '';

  // En Explorar se muestran ÚNICAMENTE los artículos de otros vecinos.
  // Las publicaciones propias viven exclusivamente en "Mis publicaciones" para evitar confusiones.
  const articulosFiltrados = useMemo(() => {
    if (!resultado) return [];
    return resultado.articulos.filter((a) => !a.esPropio);
  }, [resultado]);

  return (
    <div className="space-y-4 pb-8">
      {/* Cabecera y Barra de Navegación Segmentada Mobile-First */}
      <MarketplaceHeader
        titulo="Marketplace"
        subtitulo="Regala o intercambia con tus vecinos de Santo Domingo."
        tabActiva="explorar"
      />

      {/* Buscador táctil con ícono sobrio */}
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Buscar muebles, estufas, línea blanca…"
          className="field pl-10 text-sm shadow-xs"
          aria-label="Buscar artículos"
        />
      </div>

      {/* Filtros secundarios: Tipo y Categoría */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div role="group" aria-label="Tipo de publicación" className="grid grid-cols-3 gap-1.5 flex-1">
          {TIPOS.map((t) => (
            <button
              key={t.etiqueta}
              onClick={() => setTipo(t.valor)}
              aria-pressed={tipo === t.valor}
              className={`chip justify-center text-xs py-1.5 active:scale-95 transition-all ${
                tipo === t.valor ? 'chip-active font-semibold' : ''
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>

        {categorias.length > 0 && (
          <select
            value={categoria ?? ''}
            onChange={(e) => setCategoria(e.target.value || null)}
            className="field text-xs py-1.5 sm:w-48 shrink-0"
            aria-label="Categoría"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {estadoUbicacion === 'denegado' && (
        <p className="rounded-xl bg-sky-50 border border-sky-200/70 px-3.5 py-2 text-xs text-sky-800 flex items-center gap-2">
          <IconMapPin className="h-4 w-4 shrink-0 text-sky-600" />
          <span>Activa la ubicación para ver a qué distancia está cada artículo.</span>
        </p>
      )}

      {/* Listado de artículos en cuadrícula responsiva */}
      {cargando ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate animate-pulse">Cargando catálogo comunitario…</p>
        </div>
      ) : resultado.error ? (
        <p className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
          {resultado.error}
        </p>
      ) : articulosFiltrados.length === 0 ? (
        <EmptyState
          icon={<IconRecycle className="h-8 w-8 text-emerald-700" />}
          message={
            hayFiltros
              ? 'No se encontraron artículos de otros vecinos con los filtros aplicados.'
              : 'Todavía no hay artículos publicados por otros vecinos en el Marketplace.'
          }
          action={
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <Link to="/marketplace/subir" className="btn-primary text-xs sm:text-sm">
                Publicar un artículo
              </Link>
              <Link
                to="/mis-publicaciones"
                className="btn-outline text-xs sm:text-sm"
              >
                Ver mis publicaciones
              </Link>
            </div>
          }
        />
      ) : (
        <div
          className={`grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3 lg:grid-cols-4 ${
            actualizando ? 'opacity-60' : ''
          }`}
        >
          {articulosFiltrados.map((a) => (
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

