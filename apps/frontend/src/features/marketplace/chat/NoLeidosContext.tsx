import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { listarConversaciones, type ConversacionResumen } from '../../../api/chat';
import { listarAvisos } from '../../../api/notificaciones';
import { conectarSocket, desconectarSocket } from '../../../api/socket';
import { useSession } from '../../../auth/SessionContext';

interface NoLeidosValue {
  conversaciones: ConversacionResumen[];
  totalNoLeidos: number;
  refrescar: () => void;
  /** Avisos de la campanita (HU-23) sin leer. */
  avisosNoLeidos: number;
  /** Mensajes de chat más avisos: lo que muestra la campanita. */
  totalCampanita: number;
  refrescarAvisos: () => void;
}

const NoLeidosContext = createContext<NoLeidosValue | undefined>(undefined);

export function NoLeidosProvider({ children }: { children: ReactNode }) {
  const { sesion } = useSession();
  const haySesion = sesion !== null;
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [avisosNoLeidos, setAvisosNoLeidos] = useState(0);

  const refrescar = useCallback(() => {
    // Errores de red: la lista queda como estaba.
    listarConversaciones().then(setConversaciones, () => {});
  }, []);

  const refrescarAvisos = useCallback(() => {
    // Sin endpoint o sin red: el contador queda como estaba y el encabezado no se rompe.
    listarAvisos().then((r) => setAvisosNoLeidos(r.noLeidos), () => {});
  }, []);

  // El `.then()` difiere el setState a un microtask (react-hooks/set-state-in-effect),
  // igual que SessionContext.
  useEffect(() => {
    if (!haySesion) {
      desconectarSocket();
      Promise.resolve().then(() => {
        setConversaciones([]);
        setAvisosNoLeidos(0);
      });
      return;
    }
    const socket = conectarSocket();
    Promise.resolve().then(refrescar);
    Promise.resolve().then(refrescarAvisos);
    socket.on('mensaje', refrescar);
    socket.on('leidos', refrescar);
    socket.on('connect', refrescar);
    socket.on('notificacion', refrescarAvisos);
    socket.on('connect', refrescarAvisos);
    return () => {
      socket.off('mensaje', refrescar);
      socket.off('leidos', refrescar);
      socket.off('connect', refrescar);
      socket.off('notificacion', refrescarAvisos);
      socket.off('connect', refrescarAvisos);
    };
  }, [haySesion, refrescar, refrescarAvisos]);

  const totalNoLeidos = conversaciones.reduce((n, c) => n + c.noLeidos, 0);

  const value = useMemo<NoLeidosValue>(
    () => ({
      conversaciones,
      totalNoLeidos,
      refrescar,
      avisosNoLeidos,
      totalCampanita: totalNoLeidos + avisosNoLeidos,
      refrescarAvisos,
    }),
    [conversaciones, totalNoLeidos, refrescar, avisosNoLeidos, refrescarAvisos],
  );

  return <NoLeidosContext.Provider value={value}>{children}</NoLeidosContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNoLeidos(): NoLeidosValue {
  const ctx = useContext(NoLeidosContext);
  if (!ctx) {
    throw new Error('useNoLeidos debe usarse dentro de <NoLeidosProvider>');
  }
  return ctx;
}
