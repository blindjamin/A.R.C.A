import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { iconoPorCategoria } from '../../api/arca';
import { obtenerArticulo, type ArticuloMarketplace } from '../../api/marketplace';
import {
  BackButton,
  EmptyState,
  Estrellas,
  IconBadge,
} from '../../components/ui';
import { ETIQUETA_BANDA, useOrigenAproximado } from './distancia';
import { ESTADO_ARTICULO_META, TIPO_ARTICULO_META, haceCuanto } from './formato';

interface Resultado {
  clave: string;
  articulo: ArticuloMarketplace | null;
  error: string | null;
}

export default function DetalleArticulo() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const recienPublicado =
    (location.state as { recienPublicado?: boolean } | null)?.recienPublicado ?? false;
  const { origen } = useOrigenAproximado();
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const id = Number(idParam);
  const idValido = Number.isInteger(id) && id > 0;
  const clave = `${id}|${JSON.stringify(origen)}`;

  useEffect(() => {
    if (!idValido) return;
    let vigente = true;
    obtenerArticulo(id, origen)
      .then((articulo) => vigente && setResultado({ clave, articulo, error: null }))
      .catch(
        (e: Error) => vigente && setResultado({ clave, articulo: null, error: e.message }),
      );
    return () => {
      vigente = false;
    };
  }, [id, idValido, origen, clave]);

  const volver = () => navigate('/marketplace');

  // Descarta la respuesta de otro artículo (la ruta reutiliza el componente
  // al pasar de /marketplace/1 a /marketplace/2).
  const vigente = resultado?.clave.startsWith(`${id}|`) ? resultado : null;

  if (!idValido || vigente?.error) {
    return (
      <div className="space-y-4">
        <BackButton onClick={volver} />
        <EmptyState
          icon="🔍"
          message="Este artículo ya no está disponible."
          action={
            <button onClick={volver} className="btn-primary">
              Ver otros artículos
            </button>
          }
        />
      </div>
    );
  }

  // Solo la primera carga muestra "cargando"; si cambia el origen se mantiene
  // el artículo en pantalla mientras llega la banda.
  const articulo = vigente?.articulo;
  if (!articulo) return <p className="text-slate">Cargando artículo…</p>;

  const {
    tipo,
    titulo,
    descripcion,
    estado,
    categoria,
    fotoUrl,
    creditos,
    banda,
    publicador,
    esPropio,
    fechaPublicacion,
  } = articulo;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <BackButton onClick={volver} />

      {recienPublicado && (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          ✅ ¡Tu artículo ya está publicado! Tus vecinos ya pueden verlo.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-green-50 sm:aspect-[16/9]">
          {fotoUrl ? (
            <img src={fotoUrl} alt={titulo} className="h-full w-full object-cover" />
          ) : (
            <span className="text-7xl" aria-hidden="true">
              {iconoPorCategoria(categoria)}
            </span>
          )}
          <span
            className={`pill absolute left-3 top-3 font-semibold ${TIPO_ARTICULO_META[tipo].clase}`}
          >
            {TIPO_ARTICULO_META[tipo].etiqueta}
          </span>
        </div>

        <div className="space-y-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-extrabold">{titulo}</h1>
            {estado !== 'disponible' && (
              <span className={`pill shrink-0 ${ESTADO_ARTICULO_META[estado].clase}`}>
                {ESTADO_ARTICULO_META[estado].etiqueta}
              </span>
            )}
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate">
            <span>{categoria}</span>
            {banda && <span>📍 {ETIQUETA_BANDA[banda]}</span>}
            <span>Publicado {haceCuanto(fechaPublicacion)}</span>
          </p>
          <span className="pill bg-gold-100 font-semibold text-gold-600">
            +{creditos} Circular Credits · al completar el intercambio
          </span>
        </div>
      </div>

      {descripcion && (
        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate">
            Descripción
          </h2>
          <p className="whitespace-pre-line text-sm text-ink-2">{descripcion}</p>
        </section>
      )}

      <section className="card flex items-center gap-3 p-4">
        <IconBadge
          icon={publicador.nombre.charAt(0).toUpperCase()}
          className="h-12 w-12 font-display text-lg font-extrabold text-green-700"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-2">{esPropio ? 'Publicado por ti' : 'Publicado por'}</p>
          <p className="truncate font-bold">{publicador.nombre}</p>
          <Estrellas
            valor={publicador.calificacionPromedio}
            cantidad={publicador.cantidadCalificaciones}
          />
        </div>
      </section>

      {esPropio ? (
        <p className="text-center">
          <span className="pill bg-green-100 text-green-700">Es tu publicación</span>
        </p>
      ) : (
        <div className="space-y-2">
          <button className="btn-primary w-full py-3.5" disabled>
            {tipo === 'regalo' ? 'Me interesa' : 'Quiero intercambiar'}
          </button>
          <p className="text-center text-xs text-slate-2">
            El contacto entre vecinos llega en la próxima entrega.
          </p>
        </div>
      )}
    </div>
  );
}
