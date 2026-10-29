import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { iconoPorCategoria } from '../../api/arca';
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
  EmptyState,
  Estrellas,
  IconBadge,
  IconSearch,
  IconCheck,
  IconMapPin,
} from '../../components/ui';
import BotonReservar from './BotonReservar';
import CalificarIntercambio from './CalificarIntercambio';
import CodigoEntrega from './entrega/CodigoEntrega';
import PanelEntrega from './entrega/PanelEntrega';
import { useNoLeidos } from './chat/NoLeidosContext';
import { ETIQUETA_BANDA, useOrigenAproximado } from './distancia';
import {
  ESTADO_ARTICULO_META,
  TIPO_ARTICULO_META,
  haceCuanto,
  mensajeDeError,
} from './formato';

// Retirar pide confirmación en línea (segundo clic), sin window.confirm.
function RetirarPublicacion({ id, onRetirado }: { id: number; onRetirado: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [retirando, setRetirando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retirar = async () => {
    setRetirando(true);
    setError(null);
    try {
      await retirarArticulo(id);
      onRetirado();
    } catch (e) {
      setError((e as Error).message);
      setRetirando(false);
    }
  };

  if (!confirmando) {
    return (
      <button onClick={() => setConfirmando(true)} className="btn-outline w-full">
        Retirar publicación
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <p className="text-sm text-ink-2">
        ¿Retirar esta publicación? Tus vecinos dejarán de verla.
      </p>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setConfirmando(false)}
          disabled={retirando}
          className="btn-ghost flex-1"
        >
          Cancelar
        </button>
        <button
          onClick={retirar}
          disabled={retirando}
          className="btn flex-1 border border-rose-300 bg-rose-50 text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white"
        >
          {retirando ? 'Retirando…' : 'Sí, retirar'}
        </button>
      </div>
    </div>
  );
}

// Cierre del intercambio: lo que ve cada participante después de la entrega.
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
    <section className="card space-y-2 p-4 text-left">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate">Interesados</h2>
      {interesados.length === 0 ? (
        <p className="text-sm text-slate">Todavía nadie ha dicho que le interesa.</p>
      ) : (
        interesados.map((i) => (
          <div key={i.conversacionId} className="space-y-2 rounded-md border border-line p-3">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold">{i.nombre}</p>
              <BadgeNoLeidos cantidad={i.noLeidos} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Estrellas valor={i.calificacionPromedio} cantidad={i.cantidadCalificaciones} />
              {i.identidadVerificada && (
                <span className="pill bg-green-100 text-green-700">Identidad verificada</span>
              )}
            </div>
            {i.ultimoMensaje && (
              <p className="truncate text-sm text-slate">
                {i.ultimoMensaje.esMio && 'Tú: '}
                {i.ultimoMensaje.contenido}
              </p>
            )}
            <div className="flex flex-wrap items-start gap-2">
              <button
                onClick={() => navigate(`/marketplace/${articuloId}/chat/${i.conversacionId}`)}
                className="btn-outline px-4 py-2"
              >
                Chatear
              </button>
              <BotonReservar
                articuloId={articuloId}
                conversacionId={i.conversacionId}
                nombre={i.nombre}
                onReservado={onReservado}
              />
            </div>
          </div>
        ))
      )}
    </section>
  );
}

interface Resultado {
  clave: string;
  articulo: ArticuloMarketplace | null;
  error: string | null;
}

const articuloVigente = (r: Resultado | null, id: number): ArticuloMarketplace | null =>
  r?.clave.startsWith(`${id}|`) ? r.articulo : null;

export default function DetalleArticulo() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const recienPublicado =
    (location.state as { recienPublicado?: boolean } | null)?.recienPublicado ?? false;
  const { origen } = useOrigenAproximado();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const { conversaciones } = useNoLeidos();
  const [version, setVersion] = useState(0);
  const [interesados, setInteresados] = useState<Interesado[]>([]);
  const [interesando, setInteresando] = useState(false);
  const [errorInteres, setErrorInteres] = useState<string | null>(null);

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
  }, [id, idValido, origen, clave, version]);

  // Quien publica ve a los interesados; se recarga con cada aviso del chat
  // (`conversaciones` cambia) y tras reservar o liberar.
  const actual = articuloVigente(resultado, id);
  const verInteresados = !!actual?.esPropio && actual.estado === 'disponible';
  useEffect(() => {
    if (!verInteresados) return;
    let vigente = true;
    listarInteresados(id)
      .then((lista) => vigente && setInteresados(lista))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [id, verInteresados, conversaciones, version]);

  const recargar = () => setVersion((v) => v + 1);

  const volver = () => navigate('/marketplace');

  // Descarta la respuesta de otro artículo (la ruta reutiliza el componente
  // al pasar de /marketplace/1 a /marketplace/2).
  const vigente = resultado?.clave.startsWith(`${id}|`) ? resultado : null;

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
  const conversacionPropia = delArticulo.find((c) => c.soyPublicador);

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
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700 flex items-center gap-2">
          <IconCheck className="h-5 w-5 shrink-0 text-green-700" />
          <div>
            ¡Tu artículo ya está publicado! Tus vecinos ya pueden verlo.{' '}
            <button
              onClick={() => navigate('/marketplace/mis-publicaciones')}
              className="font-semibold underline"
            >
              Ver mis publicaciones
            </button>
          </div>
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
            <h1 className="text-2xl font-extrabold text-ink">{titulo}</h1>
            {estado !== 'disponible' && (
              <span className={`pill shrink-0 ${ESTADO_ARTICULO_META[estado].clase}`}>
                {ESTADO_ARTICULO_META[estado].etiqueta}
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
        <div className="space-y-3 text-center">
          <span className="pill bg-green-100 text-green-700">Es tu publicación</span>
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
              conversacionId={conversacionPropia?.conversacionId}
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
        </div>
      )}
    </div>
  );
}
