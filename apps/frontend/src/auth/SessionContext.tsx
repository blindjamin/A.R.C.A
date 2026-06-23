import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// UUID del usuario dev sembrado por migración en el backend.
// TEMPORAL: cuando Benjamín integre JWT/ClaveÚnica, este id saldrá del token
// y solo cambiará el interior de `login()` (ver roadmap B.2). Las pantallas no cambian.
const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
const STORAGE_KEY = 'arca.usuarioCiudadanoId';

interface SessionContextValue {
  usuarioCiudadanoId: string | null;
  login: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuarioCiudadanoId, setUsuarioCiudadanoId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );

  useEffect(() => {
    if (usuarioCiudadanoId) {
      localStorage.setItem(STORAGE_KEY, usuarioCiudadanoId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [usuarioCiudadanoId]);

  const value = useMemo<SessionContextValue>(
    () => ({
      usuarioCiudadanoId,
      login: () => setUsuarioCiudadanoId(DEV_USER_ID),
      logout: () => setUsuarioCiudadanoId(null),
    }),
    [usuarioCiudadanoId],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  }
  return ctx;
}
