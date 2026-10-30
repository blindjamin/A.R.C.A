import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  listarInteresados,
  obtenerArticulo,
  registrarInteres,
  retirarArticulo,
  type ArticuloMarketplace,
  type Interesado,
} from '../../api/marketplace';
import {
  BackButton,
  BadgeNoLeidos,
  CategoriaPlaceholder,
  EmptyState,
  Estrellas,
  IconBadge,
  IconCheck,
  IconMapPin,
  IconSearch,
  IconUser,
} from '../../components/ui';
import BotonDenunciar from '../denuncias/BotonDenunciar';
import BotonReservar from './BotonReservar';
import CalificarIntercambio from './CalificarIntercambio';
import CodigoEntrega from './entrega/CodigoEntrega';
import PanelEntrega from './entrega/PanelEntrega';
import { useNoLeidos } from './chat/NoLeidosContext';
import { ETIQUETA_BANDA, useOrigenAproximado } from './distancia';
import {
  metaDeEstadoArticulo,
  metaDeTipoArticulo,
  haceCuanto,
  mensajeDeError,
} from './formato';

function RetirarPublicacion({
  id,
  onRetirado,
}: {
  id: number;
  onRetirado: () => void;
}) {
  const [retirando, setRetirando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    if (
      !window.confirm(
        '¿Seguro que quieres retirar este artículo? Ya no estará disponible para otros vecinos.',
      )
    ) {
      return;
    }
    setRetirando(true);
    setError(null);
    try {
      await retirarArticulo(id);
      onRetirado();
    } catch (e) {
      setError(mensajeDeError(e));
      setRetirando(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={confirmar}
        disabled={retirando}
        className="w-full rounded-md border border-line py-3 text-sm font-semibold text-slate transition hover:border-rose-400 hover:text-rose-700"
      >
        {retirando ? 'Retirando…' : 'Retirar del Marketplace'}
      </button>
      {error && <p className="text-center text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function ListaInteresados({
  articuloId,
  interesados,
  onReservado,
}: {
  articuloId: number;
  interesados: Interesado[];
  onReservado: () => void;
}) {
  const navigate = useNavigate();

  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">
        Vecinos interesados ({interesados.length})
      </h2>
      {interesados.length === 0 ? (
        <p className="text-sm text-slate">
          Todavía nadie te ha escrito por este artículo. Te avisaremos cuando
          alguien se interese.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {interesados.map((i) => (
            <li
              key={i.conversacionId}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-[10rem] flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold">{i.nombre}</span>
                  {i.identidadVerificada && (
                    <span
                      title="Identidad verificada con ClaveÚnica"
                      className="text-xs text-green-700"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <Estrellas
                  valor={i.calificacionPromedio}
                  cantidad={i.cantidadCalificaciones}
                />
                {i.ultimoMensaje && (
                  <p className="truncate text-xs text-slate">
                    {i.ultimoMensaje.esMio ? 'Tú: ' : ''}
                    {i.ultimoMensaje.contenido}
                  </p>
                )}
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    navigate(
                      `/marketplace/${articuloId}/chat/${i.conversacionId}`,
                    )
                  }
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold hover:bg-canvas"
                >
                  Abrir chat
                  {i.noLeidos > 0 && ` (${i.noLeidos})`}
                </button>
                <BotonReservar
                  articuloId={articuloId}
                  conversacionId={i.conversacionId}
                  nombre={i.nombre}
                  onReservado={onReservado}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CierreEntrega({
  articulo,
  onCalificado,
}: {
  articulo: ArticuloMarketplace;
  onCalificado: () => void;
}) {
  const { esPropio, soyReceptor, puedoCalificar, publicador, titulo } = articulo;

  return (
    <section className="card space-y-3 p-5 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <IconCheck className="h-6 w-6 text-green-700" />
      </span>
      <h2 className="text-lg font-bold text-ink">
        {esPropio ? 'Entrega confirmada' : 'Recibiste este artículo'}
      </h2>
      <p className="text-sm text-ink-2">
        {esPropio
          ? 'El intercambio quedó cerrado y los créditos de la entrega ya están registrados en tu billetera.'
          : `«${titulo}» quedó a tu nombre. Gracias por darle una segunda vida.`}
      </p>
      {soyReceptor && puedoCalificar && (
        <CalificarIntercambio
          articuloId={articulo.id}
          nombrePublicador={publicador.nombre}
          onCalificado={onCalificado}
        />
      )}
      {soyReceptor && !puedoCalificar && (
        <p className="text-xs text-slate">Ya calificaste este intercambio.</p>
      )}
    </section>
  );
}

export default function DetalleArticulo() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversaciones } = useNoLeidos();
  const { origen } = useOrigenAproximado();

  const idValido = idParam !== undefined && /^\d+$/.test(idParam);
  const id = idValido ? Number(idParam) : -1;

  // Cache en memoria para mantener el artículo visible si cambia el origen.
  const [resultado, setResultado] = useState<{
    clave: string;
    articulo?: ArticuloMarketplace;
    error?: string;
  } | null>(null);

  const [version, setVersion] = useState(0);
  const [interesados, setInteresados] = useState<Interesado[]>([]);
  const [interesando, setInteresando] = useState(false);
  const [errorInteres, setErrorInteres] = useState<string | null>(null);

  const recienPublicado = Boolean(
    (location.state as { recienPublicado?: boolean } | null)?.recienPublicado,
  );

  const volver = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/marketplace');
    }
  };

  const cargar = (ignorarCache = false) => {
    if (!idValido) return;
    const clave = `${id}|${JSON.stringify(origen)}`;
    if (!ignorarCache && resultado?.clave === clave) return;

    obtenerArticulo(id, origen)
      .then((art) => setResultado({ clave, articulo: art }))
      .catch((e: Error) => setResultado({ clave, error: e.message }));
  };

  useEffect(() => {
    cargar(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, origen]);

  const recargar = () => {
    cargar(true);
    setVersion((v) => v + 1);
  };

  // Descarta la respuesta de otro artículo (la ruta reutiliza el componente
  // al pasar de /marketplace/1 a /marketplace/2).
  const vigente = resultado?.clave.startsWith(`${id}|`) ? resultado : null;

  // Quien publica ve a los interesados; se recarga con cada aviso del chat
  // (`conversaciones` cambia) y tras reservar o liberar. En la entrega también
  // hace falta: ahí se marca con `reservado` la conversación de quien recibe.
  const verInteresados =
    !!vigente?.articulo?.esPropio &&
    (vigente.articulo.estado === 'disponible' ||
      vigente.articulo.estado === 'en_negociacion');
  useEffect(() => {
    if (!verInteresados) return;
    let actual = true;
    listarInteresados(id)
      .then((lista) => actual && setInteresados(lista))
      .catch(() => {});
    return () => {
      actual = false;
    };
  }, [id, verInteresados, conversaciones, version]);

  if (!idValido || vigente?.error) {
    return (
      <div className="space-y-4">
        <BackButton onClick={volver} />
        <EmptyState
          icon={<IconSearch className="h-8 w-8 text-slate" />}
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
    soyReceptor,
    codigoEntrega,
    sector,
  } = articulo;

  const delArticulo = conversaciones.filter((c) => c.articulo.id === articulo.id);
  const propia = delArticulo.find((c) => !c.soyPublicador);
  // El código se pide a quien tiene la reserva, no a cualquier interesado.
  const conversacionReserva = interesados.find((i) => i.reservado);

  const mostrarInteres = async () => {
    setInteresando(true);
    setErrorInteres(null);
    try {
      await registrarInteres(articulo.id);
      navigate(`/marketplace/${articulo.id}/chat`);
    } catch (e) {
      setErrorInteres(mensajeDeError(e));
      setInteresando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <BackButton onClick={volver} />

      {recienPublicado && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-950 flex items-start gap-2.5 shadow-xs">
          <span className="text-xl shrink-0">⏳</span>
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">
              ¡Tu artículo fue enviado para validación municipal!
            </p>
            <p className="text-xs text-amber-800">
              Estará visible para tus vecinos una vez que el equipo municipal lo apruebe.{' '}
              <button
                type="button"
                onClick={() => navigate('/marketplace/mis-publicaciones')}
                className="font-bold underline text-amber-950 hover:text-amber-900"
              >
                Ver mis publicaciones
              </button>
            </p>
          </div>
        </div>
      )}

      {articulo.estado === 'pendiente_aprobacion' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
          <span className="text-xl shrink-0 mt-0.5">⏳</span>
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">
              Publicación en revisión técnica municipal
            </p>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Para garantizar la seguridad de la comunidad, un funcionario municipal validará la publicación antes de que aparezca en el Marketplace.
            </p>
          </div>
        </div>
      )}

      {articulo.estado === 'rechazado' && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950 flex items-start gap-3 shadow-xs">
          <span className="text-xl shrink-0 mt-0.5">❌</span>
          <div className="space-y-0.5">
            <p className="font-bold text-rose-950">
              Publicación no autorizada por moderación municipal
            </p>
            <p className="text-[11px] text-rose-900 leading-relaxed">
              Motivo: {articulo.motivoRechazo || 'El artículo no cumple con los criterios de reutilización.'}
            </p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-stone-100 sm:aspect-[16/9] overflow-hidden">
          {fotoUrl ? (
            <img src={fotoUrl} alt={titulo} className="h-full w-full object-cover" />
          ) : (
            <CategoriaPlaceholder categoria={categoria} />
          )}
          <span
            className={`pill absolute left-3 top-3 font-semibold shadow-xs ${metaDeTipoArticulo(tipo).clase}`}
          >
            {metaDeTipoArticulo(tipo).etiqueta}
          </span>
          {esPropio ? (
            <span className="pill absolute right-3 top-3 bg-emerald-800 text-white font-semibold text-xs shadow-xs flex items-center gap-1">
              <IconUser className="h-3.5 w-3.5" />
              <span>Tu publicación</span>
            </span>
          ) : (
            <span className="pill absolute right-3 top-3 bg-white/95 text-stone-700 backdrop-blur-xs font-medium text-xs shadow-xs">
              De un vecino
            </span>
          )}
        </div>

        <div className="space-y-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-extrabold text-ink">{titulo}</h1>
            {estado !== 'disponible' && (
              <span className={`pill shrink-0 ${metaDeEstadoArticulo(estado).clase}`}>
                {metaDeEstadoArticulo(estado).etiqueta}
              </span>
            )}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
            <span>{categoria}</span>
            {banda && (
              <span className="inline-flex items-center gap-1">
                <IconMapPin className="h-3.5 w-3.5 text-slate-2" />
                {ETIQUETA_BANDA[banda]}
              </span>
            )}
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
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3 text-center shadow-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-800">
              <IconUser className="h-4 w-4 shrink-0" />
              Esta es tu publicación en el Marketplace
            </span>
          </div>
          {estado === 'disponible' && (
            <RetirarPublicacion
              id={articulo.id}
              onRetirado={() => navigate('/marketplace/mis-publicaciones')}
            />
          )}
          {estado === 'disponible' && (
            <ListaInteresados
              articuloId={articulo.id}
              interesados={interesados}
              onReservado={recargar}
            />
          )}
          {estado === 'en_negociacion' && (
            <PanelEntrega
              articulo={articulo}
              conversacionId={conversacionReserva?.conversacionId}
              onCambio={recargar}
            />
          )}
          {estado === 'completado' && (
            <CierreEntrega articulo={articulo} onCalificado={recargar} />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {soyReceptor && estado === 'completado' && (
            <CierreEntrega articulo={articulo} onCalificado={recargar} />
          )}
          {soyReceptor && estado === 'en_negociacion' && codigoEntrega && (
            <CodigoEntrega codigo={codigoEntrega} sector={sector} />
          )}
          {propia ? (
            <button
              onClick={() => navigate(`/marketplace/${articulo.id}/chat`)}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3.5"
            >
              Ver conversación
              <BadgeNoLeidos cantidad={propia.noLeidos} />
            </button>
          ) : (
            estado === 'disponible' && (
              <button
                onClick={mostrarInteres}
                disabled={interesando}
                className="btn-primary w-full py-3.5"
              >
                {tipo === 'regalo' ? 'Me interesa' : 'Quiero intercambiar'}
              </button>
            )
          )}
          {errorInteres && <p className="text-center text-xs text-rose-600">{errorInteres}</p>}
          <p className="pt-2 text-center">
            <BotonDenunciar
              articuloId={articulo.id}
              origen="articulo"
              nombre={publicador.nombre}
              texto="Denunciar esta publicación"
            />
          </p>
        </div>
      )}
    </div>
  );
}
