export interface PerfilCiudadano {
  nombre: string;
  email?: string;
  emailVerificado?: boolean;
  telefono?: string;
  direccion?: string;
  sector?: string;
  canalPreferido?: string;
}

export function getStorageKey(ciudadanoId: string | null): string {
  return `arca_perfil_vecino_${ciudadanoId || 'default'}`;
}

/**
 * Obtiene el perfil del vecino desde localStorage. Si no existe, retorna una plantilla base.
 */
export function obtenerPerfilVecino(ciudadanoId: string | null): PerfilCiudadano {
  const key = getStorageKey(ciudadanoId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw) as PerfilCiudadano;
    }
  } catch {
    // Fallback silencioso ante error de parseo
  }

  return {
    nombre: 'Vecino de Santo Domingo',
  };
}

/**
 * Guarda o actualiza campos del perfil en localStorage y retorna el perfil actualizado.
 */
export function guardarPerfilVecino(
  ciudadanoId: string | null,
  cambios: Partial<PerfilCiudadano>,
): PerfilCiudadano {
  const actual = obtenerPerfilVecino(ciudadanoId);
  const actualizado: PerfilCiudadano = {
    ...actual,
    ...cambios,
  };

  const key = getStorageKey(ciudadanoId);
  try {
    localStorage.setItem(key, JSON.stringify(actualizado));
  } catch {
    // Ignorar si el almacenamiento está bloqueado
  }

  return actualizado;
}

/**
 * Determina si el vecino tiene un correo válido y registrado en su perfil.
 */
export function tieneCorreoValido(ciudadanoId: string | null): boolean {
  const perfil = obtenerPerfilVecino(ciudadanoId);
  if (!perfil.email) return false;
  const limpio = perfil.email.trim();
  // Validación básica de formato de correo
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio);
}
