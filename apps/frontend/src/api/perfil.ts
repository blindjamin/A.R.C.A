// Perfil de contacto del vecino (HU-37). Ver apps/backend/src/perfil/perfil.service.ts.
//
// El contacto vive en el servidor (`contacto_ciudadano`, decisión 016), nunca
// en el navegador. El correo no se cambia aquí: pasa por la verificación con
// código de `/api/mail`.

import { apiFetch, handle } from './arca';

const API_URL = import.meta.env.VITE_API_URL as string;

export interface PerfilVecino {
  /** Viene de ClaveÚnica y no se edita. */
  nombre: string | null;
  /** Correo verificado con código. */
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}

/** Un texto vacío borra el dato; un campo ausente no se toca. */
export interface CambiosPerfil {
  telefono?: string;
  direccion?: string;
}

export function fetchPerfil(): Promise<PerfilVecino> {
  return apiFetch(`${API_URL}/perfil`).then((r) => handle<PerfilVecino>(r));
}

export function actualizarPerfil(cambios: CambiosPerfil): Promise<PerfilVecino> {
  return apiFetch(`${API_URL}/perfil`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  }).then((r) => handle<PerfilVecino>(r));
}

// Clave en que la versión anterior guardaba el perfil en el navegador.
const PREFIJO_PERFIL_LOCAL = 'arca_perfil_vecino_';

/** Borra lo que la versión anterior dejó en `localStorage` (datos personales). */
export function borrarPerfilLocal(): void {
  try {
    for (const clave of Object.keys(localStorage)) {
      if (clave.startsWith(PREFIJO_PERFIL_LOCAL)) localStorage.removeItem(clave);
    }
  } catch {
    // Almacenamiento bloqueado: no hay nada que borrar.
  }
}
