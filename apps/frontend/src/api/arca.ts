// Capa de API de A.R.C.A. — fetch simple sobre los endpoints del backend (EP-01).
// Cuando el estado crezca, migrar a Redux Toolkit + RTK Query (ver roadmap B.3).

const API_URL = import.meta.env.VITE_API_URL as string;

// Clave de localStorage donde SessionContext guarda la identidad de la sesión.
// Vive acá y no en SessionContext porque `apiFetch` la necesita para armar el
// header Authorization, y SessionContext ya importa de este módulo: al revés
// quedaría un import circular.
export const STORAGE_KEY_SESION = 'arca.usuarioCiudadanoId';

export interface ResiduoCatalogo {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  subcategoria: string | null;
  puedeReutilizarse: boolean;
  precio: number;
  instruccionesRecogida: string | null;
  fotoReferenciaPath: string | null;
  codigoRae: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EstadoSolicitud =
  | 'pendiente'
  | 'asignada'
  | 'en_proceso'
  | 'completada'
  | 'cancelada';

export interface SolicitudRetiro {
  id: number;
  usuarioCiudadanoId: string;
  residuoCatalogoId: number;
  estado: EstadoSolicitud;
  descripcion: string | null;
  direccionAnonimizada?: string | null;
  latitudCapturada?: string | null;
  longitudCapturada?: string | null;
  fechaSolicitud: string;
  fechaProgramada?: string | null;
  fechaCompletada?: string | null;
  operadorAsignadoId?: string | null;
  razonRechazo?: string | null;
  createdAt: string;
  updatedAt: string;
  // El GET incluye la relación anidada; en el POST puede no venir.
  residuoCatalogo?: ResiduoCatalogo;
}

export interface CrearSolicitudInput {
  usuarioCiudadanoId: string;
  residuoCatalogoId: number;
  descripcion?: string;
}

// --- Overlay visual ---------------------------------------------------------
// El precio ahora viene real desde el backend (columna `precio`, ver migración
// ReplaceCatalogoPreciosReales). El ícono por categoría sigue siendo puramente
// visual y no tiene equivalente en la base de datos.

const ICONO_POR_CATEGORIA: Record<string, string> = {
  Muebles: '🛋️',
  Electrónica: '📺',
  'Línea Blanca': '🧺',
  Construcción: '🧱',
  Otros: '📦',
};
const ICONO_DEFAULT = '♻️';

export const iconoPorCategoria = (categoria: string): string =>
  ICONO_POR_CATEGORIA[categoria] ?? ICONO_DEFAULT;

export const formatearPrecio = (clp: number): string =>
  clp.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });

// Header requerido cuando se accede vía tunel ngrok (free tier): sin el, ngrok
// intercepta el request y devuelve una pagina HTML de advertencia en vez de
// dejarlo pasar al backend. Inofensivo cuando no se usa ngrok.
function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const usuarioCiudadanoId = localStorage.getItem(STORAGE_KEY_SESION);

  return fetch(path, {
    ...init,
    headers: {
      ...init?.headers,
      'ngrok-skip-browser-warning': 'true',
      // Identidad de la sesión. Hoy es el UUID del ciudadano que guarda
      // SessionContext al entrar; cuando HU-12 emita el JWT, acá viaja el token
      // firmado sin que cambie nada más de esta capa.
      ...(usuarioCiudadanoId
        ? { Authorization: `Bearer ${usuarioCiudadanoId}` }
        : {}),
    },
  });
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error ${res.status}: ${body || res.statusText}`);
  }

  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const textBody = await res.text();
    throw new Error(
      `Error de Integración: El servidor no devolvió una respuesta JSON válida (Content-Type: ${contentType || 'ninguno'}). ` +
      `Esto suele ocurrir si el backend no está corriendo en el puerto 3000 o si las variables de entorno están desconfiguradas. ` +
      `Cuerpo de respuesta: ${textBody.substring(0, 100)}...`
    );
  }

  return res.json() as Promise<T>;
}

export function fetchCatalogo(): Promise<ResiduoCatalogo[]> {
  return apiFetch(`${API_URL}/residuos/catalogo`).then((r) =>
    handle<ResiduoCatalogo[]>(r),
  );
}

export function crearSolicitudRetiro(
  data: CrearSolicitudInput,
): Promise<SolicitudRetiro> {
  return apiFetch(`${API_URL}/solicitudes-retiro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => handle<SolicitudRetiro>(r));
}

export function fetchMisSolicitudes(
  usuarioCiudadanoId: string,
): Promise<SolicitudRetiro[]> {
  const params = new URLSearchParams({ usuarioCiudadanoId });
  return apiFetch(`${API_URL}/solicitudes-retiro?${params}`).then((r) =>
    handle<SolicitudRetiro[]>(r),
  );
}

// --- Identidad / login diferido ---------------------------------------------

export interface PerfilAcceso {
  usuarioCiudadanoId: string;
  esAdministrador: boolean;
  administrador: {
    id: string;
    nombre: string;
    apellido: string;
    rol: string;
  } | null;
}

export function fetchPerfilAcceso(
  usuarioCiudadanoId: string,
): Promise<PerfilAcceso> {
  return apiFetch(
    `${API_URL}/usuarios/${usuarioCiudadanoId}/perfil-acceso`,
  ).then((r) => handle<PerfilAcceso>(r));
}

export function cancelarSolicitud(
  id: number,
  usuarioCiudadanoId: string,
  motivo?: string,
): Promise<SolicitudRetiro> {
  return apiFetch(`${API_URL}/solicitudes-retiro/${id}/cancelar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarioCiudadanoId, motivo }),
  }).then((r) => handle<SolicitudRetiro>(r));
}

// Los fetchers de admin (solicitudes globales, auditoría) viven ahora en
// apps/admin-web/src/api/admin.ts — se movieron con la migración del panel.

