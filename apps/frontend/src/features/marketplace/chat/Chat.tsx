import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  enviarMensaje,
  marcarLeidos,
  obtenerMensajes,
  type EventoLeidos,
  type EventoMensaje,
  type HistorialChat,
  type MensajeChat,
} from '../../../api/chat';
import { conectarSocket } from '../../../api/socket';
import { activarPush, pedirPermisoEnGesto } from '../../../pwa/push';
import {
  BackButton,
  EmptyState,
  IconChevronRight,
  IconMarketplace,
  IconSearch,
} from '../../../components/ui';
import BotonReservar from '../BotonReservar';
import { ESTADO_ARTICULO_META } from '../formato';
import { useNoLeidos } from './NoLeidosContext';
import type { EstadoArticulo } from '../../../api/marketplace';

type MensajeLocal = MensajeChat & { estado?: 'enviando' | 'error' };

type Cabecera = Omit<HistorialChat, 'mensajes'>;

const MAX_LINEAS_INPUT = 4;

const AVISO_SOLO_LECTURA: Record<EstadoArticulo, string> = {
  pendiente_aprobacion: 'Esta publicación está en revisión municipal.',
  en_negociacion: 'Este artículo fue reservado por otro vecino.',
  retirado: 'Quien publicó retiró este artículo.',
  completado: 'Este intercambio ya se completó.',
  disponible: 'Esta publicación venció.',
  rechazado: 'Esta publicación fue rechazada por moderación municipal.',
};

const hora = (iso: string): string =>
  new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

function etiquetaDia(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  hoy.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-CL');
}

// Los pendientes (id negativo) sobreviven a una recarga del historial.
const conPendientes = (previos: MensajeLocal[], servidor: MensajeChat[]): MensajeLocal[] => [
  ...servidor,
  ...previos.filter((m) => m.id < 0),
];

function Burbuja({ m, onReintentar }: { m: MensajeLocal; onReintentar: () => void }) {
  return (
    <div className={`flex ${m.esMio ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          m.esMio ? 'bg-green-700 text-white' : 'card'
        } ${m.estado === 'enviando' ? 'opacity-70' : ''}`}
      >
        <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
        <p className={`mt-1 text-right text-[11px] ${m.esMio ? 'text-green-100' : 'text-slate-2'}`}>
          {hora(m.fecha)}
          {m.esMio && !m.estado && (m.leido ? ' ✓✓' : ' ✓')}
          {m.estado === 'enviando' && ' …'}
        </p>
        {m.estado === 'error' && (
          <p className="mt-1 text-right text-xs">
            No se envió.{' '}
            <button onClick={onReintentar} className="font-semibold underline">
              Reintentar
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function ChatConversacion({ id, conversacionRuta }: { id: number; conversacionRuta?: number }) {
  const navigate = useNavigate();
  const { refrescar } = useNoLeidos();
  const [cabecera, setCabecera] = useState<Cabecera | null>(null);
  const [mensajes, setMensajes] = useState<MensajeLocal[]>([]);
  const [noDisponible, setNoDisponible] = useState(false);
  const [texto, setTexto] = useState('');
  const [hayNuevos, setHayNuevos] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const pegarAbajo = useRef(false);
  const siguienteTemp = useRef(-1);

  const volver = () =>
    window.history.length > 1 ? navigate(-1) : navigate('/marketplace/mensajes');

  const irAbajo = useCallback(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Tras pintar: baja si se pidió (carga, envío, mensaje con el usuario abajo).
  useLayoutEffect(() => {
    if (pegarAbajo.current) {
      pegarAbajo.current = false;
      irAbajo();
    }
  }, [mensajes, irAbajo]);

  const marcar = useCallback(() => {
    marcarLeidos(id, conversacionRuta).then(refrescar, () => {});
  }, [id, conversacionRuta, refrescar]);

  // Última página: carga inicial y reconexión del socket.
  const cargar = useCallback(
    (inicial: boolean) => {
      obtenerMensajes(id, { conversacionId: conversacionRuta })
        .then(({ mensajes: servidor, ...resto }) => {
          if (inicial) pegarAbajo.current = true;
          setCabecera(resto);
          setMensajes((previos) => conPendientes(previos, servidor));
          if (servidor.some((m) => !m.esMio && !m.leido)) marcar();
        })
        .catch((e: Error) => {
          if (inicial && e.message.startsWith('Error 404')) setNoDisponible(true);
        });
    },
    [id, conversacionRuta, marcar],
  );

  useEffect(() => {
    cargar(true);
  }, [cargar]);

  const soyPublicador = cabecera?.soyPublicador;
  useEffect(() => {
    if (soyPublicador === undefined) return;
    const socket = conectarSocket();
    const alMensaje = (e: EventoMensaje) => {
      if (e.articuloId !== id) return;
      if (soyPublicador && e.conversacionId !== conversacionRuta) return;
      if (!soyPublicador) {
        // El interesado conoce su conversacionId recién con el primer mensaje.
        setCabecera((c) =>
          c && c.conversacionId === null ? { ...c, conversacionId: e.conversacionId } : c,
        );
      }
      const el = lista.current;
      const abajo = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (abajo) pegarAbajo.current = true;
      else if (!e.mensaje.esMio) setHayNuevos(true);
      setMensajes((previos) =>
        previos.some((m) => m.id === e.mensaje.id) ? previos : [...previos, e.mensaje],
      );
      if (!e.mensaje.esMio && document.visibilityState === 'visible') marcar();
    };
    const alLeer = (e: EventoLeidos) => {
      if (e.articuloId !== id) return;
      if (soyPublicador && e.conversacionId !== conversacionRuta) return;
      setMensajes((previos) => previos.map((m) => (m.esMio ? { ...m, leido: true } : m)));
    };
    const alReconectar = () => cargar(false);
    socket.on('mensaje', alMensaje);
    socket.on('leidos', alLeer);
    socket.on('connect', alReconectar);
    return () => {
      socket.off('mensaje', alMensaje);
      socket.off('leidos', alLeer);
      socket.off('connect', alReconectar);
    };
  }, [id, conversacionRuta, soyPublicador, marcar, cargar]);

  const verAnteriores = () => {
    const primero = mensajes.find((m) => m.id > 0);
    if (!primero || cargandoMas) return;
    setCargandoMas(true);
    obtenerMensajes(id, { conversacionId: conversacionRuta, antesDe: primero.id })
      .then((h) => {
        setCabecera((c) => (c ? { ...c, hayMas: h.hayMas } : c));
        setMensajes((previos) => [...h.mensajes, ...previos]);
      })
      .catch(() => {})
      .finally(() => setCargandoMas(false));
  };

  const transmitir = (
    temp: MensajeLocal,
    permiso: Promise<NotificationPermission> | null = null,
  ) => {
    setMensajes((previos) =>
      previos.map((m) => (m.id === temp.id ? { ...m, estado: 'enviando' } : m)),
    );
    enviarMensaje(id, temp.contenido, conversacionRuta)
      .then((r) => {
        void activarPush(permiso);
        setCabecera((c) =>
          c && c.conversacionId === null ? { ...c, conversacionId: r.conversacionId } : c,
        );
        // El socket puede haber entregado ya el mensaje real: se evita duplicarlo.
        setMensajes((previos) => {
          const sinTemp = previos.filter((m) => m.id !== temp.id);
          return sinTemp.some((m) => m.id === r.mensaje.id) ? sinTemp : [...sinTemp, r.mensaje];
        });
      })
      .catch((e: Error) => {
        if (e.message.startsWith('Error 409')) {
          // Pasó a solo lectura mientras escribía.
          setMensajes((previos) => previos.filter((m) => m.id !== temp.id));
          cargar(false);
        } else {
          setMensajes((previos) =>
            previos.map((m) => (m.id === temp.id ? { ...m, estado: 'error' } : m)),
          );
        }
      });
  };

  const enviar = () => {
    const contenido = texto.trim();
    if (!contenido) return;
    const permiso = pedirPermisoEnGesto();
    const temp: MensajeLocal = {
      id: siguienteTemp.current--,
      contenido,
      fecha: new Date().toISOString(),
      esMio: true,
      leido: false,
      estado: 'enviando',
    };
    pegarAbajo.current = true;
    setMensajes((previos) => [...previos, temp]);
    setTexto('');
    transmitir(temp, permiso);
  };

  const ajustarAltura = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    const linea = parseFloat(getComputedStyle(el).lineHeight) || 20;
    // Tope: 4 líneas más el relleno vertical y el borde.
    const tope = linea * MAX_LINEAS_INPUT + (el.offsetHeight - el.clientHeight) + 24;
    el.style.height = `${Math.min(el.scrollHeight, tope)}px`;
  };

  if (noDisponible) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <BackButton onClick={volver} />
        <EmptyState
          icon={<IconSearch className="h-8 w-8 text-slate" />}
          message="Esta conversación no está disponible."
          action={
            <button onClick={() => navigate('/marketplace/mensajes')} className="btn-primary">
              Ver mis mensajes
            </button>
          }
        />
      </div>
    );
  }
  if (!cabecera) {
    return <p className="p-4 text-slate">Cargando conversación…</p>;
  }

  const { articulo, soyPublicador: esPublicador, otroNombre, puedoEscribir, hayMas } = cabecera;

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col bg-canvas">
      <header className="flex items-center gap-3 border-b border-line bg-card px-4 py-3">
        <BackButton onClick={volver} />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-green-50">
          {articulo.fotoUrl ? (
            <img src={articulo.fotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <IconMarketplace className="h-5 w-5 text-green-700" />
          )}
        </div>
        <Link
          to={`/marketplace/${articulo.id}`}
          aria-label={`Ver el artículo ${articulo.titulo}`}
          className="min-w-0 flex-1 rounded-md hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-bold">{articulo.titulo}</h1>
            {articulo.estado !== 'disponible' && (
              <span className={`pill shrink-0 ${ESTADO_ARTICULO_META[articulo.estado].clase}`}>
                {ESTADO_ARTICULO_META[articulo.estado].etiqueta}
              </span>
            )}
            <IconChevronRight className="h-4 w-4 shrink-0 text-slate-2" />
          </div>
          <p className="truncate text-xs text-slate-2">{otroNombre}</p>
        </Link>
        {esPublicador && articulo.estado === 'disponible' && conversacionRuta && (
          <BotonReservar
            articuloId={id}
            conversacionId={conversacionRuta}
            nombre={otroNombre}
            onReservado={() => cargar(false)}
            className="btn-primary shrink-0 px-4 py-2"
          />
        )}
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={lista}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) setHayNuevos(false);
          }}
          className="h-full space-y-2 overflow-y-auto px-4 py-3"
        >
          {hayMas && (
            <button
              onClick={verAnteriores}
              disabled={cargandoMas}
              className="btn-ghost mx-auto py-1.5"
            >
              {cargandoMas ? 'Cargando…' : 'Ver mensajes anteriores'}
            </button>
          )}
          {mensajes.length === 0 && (
            <p className="py-8 text-center text-sm text-slate">
              Pregunta lo que necesites: estado, horario de retiro, medidas…
            </p>
          )}
          {mensajes.map((m, i) => {
            const dia = etiquetaDia(m.fecha);
            const separador = i === 0 || dia !== etiquetaDia(mensajes[i - 1].fecha);
            return (
              <div key={m.id} className="space-y-2">
                {separador && <p className="py-1 text-center text-xs text-slate-2">{dia}</p>}
                <Burbuja m={m} onReintentar={() => transmitir(m)} />
              </div>
            );
          })}
        </div>
        {hayNuevos && (
          <button
            onClick={irAbajo}
            className="btn-primary absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2"
          >
            ↓ Nuevos
          </button>
        )}
      </div>

      {puedoEscribir ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
          className="flex items-end gap-2 border-t border-line bg-card p-3"
        >
          <textarea
            rows={1}
            maxLength={1000}
            value={texto}
            placeholder="Escribe un mensaje"
            aria-label="Mensaje"
            className="field resize-none"
            onChange={(e) => setTexto(e.target.value)}
            onInput={(e) => ajustarAltura(e.currentTarget)}
            onKeyDown={(e) => {
              // En el celular Enter es salto de línea; solo con puntero preciso envía.
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                window.matchMedia('(pointer: fine)').matches
              ) {
                e.preventDefault();
                enviar();
              }
            }}
          />
          <button
            type="submit"
            aria-label="Enviar mensaje"
            disabled={!texto.trim()}
            className="btn-primary h-11 w-11 shrink-0 !p-0"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
            </svg>
          </button>
        </form>
      ) : (
        <p className="border-t border-line bg-card p-4 text-center text-sm text-slate">
          {AVISO_SOLO_LECTURA[articulo.estado]}
        </p>
      )}
    </div>
  );
}

export default function Chat() {
  const { id: idParam, conversacionId: convParam } = useParams();
  const navigate = useNavigate();
  const id = Number(idParam);
  const conv = convParam === undefined ? undefined : Number(convParam);
  const valido =
    Number.isInteger(id) && id > 0 && (conv === undefined || (Number.isInteger(conv) && conv > 0));

  if (!valido) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
        <BackButton onClick={() => navigate('/marketplace/mensajes')} />
        <EmptyState
          icon={<IconSearch className="h-8 w-8 text-slate" />}
          message="Esta conversación no está disponible."
        />
      </div>
    );
  }
  // key: al cambiar de conversación se reinicia todo el estado.
  return <ChatConversacion key={`${id}-${conv ?? ''}`} id={id} conversacionRuta={conv} />;
}
