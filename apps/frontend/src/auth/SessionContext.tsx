import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchPerfilAcceso, type PerfilAcceso } from '../api/arca';

// UUIDs sembrados por migración en el backend (auth mock).
// TEMPORAL: cuando Benjamín integre JWT/ClaveÚnica, la identidad saldrá del token
// y solo cambiará el interior de `login()`. Las pantallas no cambian.
export const DEV_USERS = {
  vecino: '00000000-0000-4000-8000-000000000001', // solo ciudadano
  funcionario: '00000000-0000-4000-8000-000000000002', // doble rol (ciudadano + operador)
} as const;

const STORAGE_KEY = 'arca.usuarioCiudadanoId';

interface SessionContextValue {
  usuarioCiudadanoId: string | null;
  esAdministrador: boolean;
  perfil: PerfilAcceso | null;
  cargando: boolean;
  login: (usuarioCiudadanoId: string) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuarioCiudadanoId, setUsuarioCiudadanoId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [perfil, setPerfil] = useState<PerfilAcceso | null>(null);
  // Arranca cargando si hay sesión persistida (hay que resolver el perfil).
  const [cargando, setCargando] = useState<boolean>(
    () => !!localStorage.getItem(STORAGE_KEY),
  );

  // Resuelve el perfil de acceso (login diferido) cada vez que cambia la identidad.
  useEffect(() => {
    if (!usuarioCiudadanoId) {
      setPerfil(null);
      setCargando(false);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, usuarioCiudadanoId);
    let cancelado = false;
    setCargando(true);

    fetchPerfilAcceso(usuarioCiudadanoId)
      .then((p) => {
        if (!cancelado) setPerfil(p);
      })
      .catch(() => {
        // Si el backend no responde o el id no existe, tratamos como solo-ciudadano.
        if (!cancelado)
          setPerfil({
            usuarioCiudadanoId,
            esAdministrador: false,
            administrador: null,
          });
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usuarioCiudadanoId]);

  const login = useCallback((id: string) => setUsuarioCiudadanoId(id), []);
  const logout = useCallback(() => setUsuarioCiudadanoId(null), []);

  const value = useMemo<SessionContextValue>(
    () => ({
      usuarioCiudadanoId,
      esAdministrador: perfil?.esAdministrador ?? false,
      perfil,
      cargando,
      login,
      logout,
    }),
    [usuarioCiudadanoId, perfil, cargando, login, logout],
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
