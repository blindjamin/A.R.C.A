import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, onUnauthorized } from '../api/apiFetch';

export type Rol = 'vecino' | 'funcionario' | 'admin';

export interface Sesion {
  ciudadanoId: string;
  nombre: string | null;
  rol: Rol;
  devLogin: boolean;
}

interface SessionContextValue {
  sesion: Sesion | null;
  cargando: boolean;
  entrarDev: (ciudadanoId: string, nombre?: string) => Promise<void>;
  salir: () => Promise<void>;
  recargar: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

async function obtenerSesion(): Promise<Sesion | null> {
  const res = await apiFetch('/api/sesion');
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Error ${res.status} al obtener la sesión`);
  return res.json() as Promise<Sesion>;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      setSesion(await obtenerSesion());
    } catch {
      // Backend caído o error de red: se trata igual que sin sesión.
      setSesion(null);
    } finally {
      setCargando(false);
    }
  }, []);

  // GET /api/sesion al montar (criterio 5: la identidad sale solo de acá). El
  // `.then()` difiere la llamada a un microtask en vez de invocar `recargar`
  // (que hace setState) de forma directa en el cuerpo del efecto
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    Promise.resolve().then(() => recargar());
  }, [recargar]);

  // apiFetch avisa acá ante cualquier 401 de cualquier llamada (arca.ts o
  // admin/api/admin.ts): cerramos la sesión en el front y los guards mandan a
  // /login.
  useEffect(() => {
    onUnauthorized(() => setSesion(null));
    return () => onUnauthorized(null);
  }, []);

  const entrarDev = useCallback(
    async (ciudadanoId: string, nombre?: string) => {
      const res = await apiFetch('/api/auth/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciudadanoId, nombre }),
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status} en el login de desarrollo`);
      }
      await recargar();
    },
    [recargar],
  );

  const salir = useCallback(async () => {
    // Criterio 7: devLogin cierra con el endpoint mock; ClaveÚnica, con un POST
    // que revoca y devuelve la URL de cierre, y luego una navegación completa
    // (cierra también la sesión en ClaveÚnica).
    if (sesion?.devLogin) {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      setSesion(null);
    } else {
      // POST (no GET): un enlace desde otro sitio no puede cerrar la sesión.
      // La navegación a ClaveÚnica sigue siendo de nivel superior.
      const res = await apiFetch('/api/auth/clave-unica/logout', {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status} al cerrar sesión`);
      }
      const { url } = (await res.json()) as { url: string };
      window.location.assign(url);
    }
  }, [sesion]);

  const value = useMemo<SessionContextValue>(
    () => ({ sesion, cargando, entrarDev, salir, recargar }),
    [sesion, cargando, entrarDev, salir, recargar],
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
