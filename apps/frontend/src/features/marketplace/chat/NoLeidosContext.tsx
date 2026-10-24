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
import { conectarSocket, desconectarSocket } from '../../../api/socket';
import { useSession } from '../../../auth/SessionContext';

interface NoLeidosValue {
  conversaciones: ConversacionResumen[];
  totalNoLeidos: number;
  refrescar: () => void;
}

const NoLeidosContext = createContext<NoLeidosValue | undefined>(undefined);

export function NoLeidosProvider({ children }: { children: ReactNode }) {
  const { sesion } = useSession();
  const haySesion = sesion !== null;
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);

  const refrescar = useCallback(() => {
    // Errores de red: la lista queda como estaba.
    listarConversaciones().then(setConversaciones, () => {});
  }, []);

  // El `.then()` difiere el setState a un microtask (react-hooks/set-state-in-effect),
  // igual que SessionContext.
  useEffect(() => {
    if (!haySesion) {
      desconectarSocket();
      Promise.resolve().then(() => setConversaciones([]));
      return;
    }
    const socket = conectarSocket();
    Promise.resolve().then(refrescar);
    socket.on('mensaje', refrescar);
    socket.on('leidos', refrescar);
    socket.on('connect', refrescar);
    return () => {
      socket.off('mensaje', refrescar);
      socket.off('leidos', refrescar);
      socket.off('connect', refrescar);
    };
  }, [haySesion, refrescar]);

  const value = useMemo<NoLeidosValue>(
    () => ({
      conversaciones,
      totalNoLeidos: conversaciones.reduce((n, c) => n + c.noLeidos, 0),
      refrescar,
    }),
    [conversaciones, refrescar],
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
