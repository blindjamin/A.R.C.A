// Capa de API del panel administrador — copiada de apps/frontend/src/api/arca.ts
// (tipos y helpers compartidos) más los fetchers que solo usa el admin, que se
// borraron del frontend ciudadano al migrar. Los endpoints todavía apuntan a
// las rutas de apps/backend; pasan a /api/admin/... recién en la Fase 3 de la
// migración, cuando exista apps/backend-admin.

const API_URL = import.meta.env.VITE_API_URL as string;

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

export interface ActualizarSolicitudInput {
  estado?: EstadoSolicitud;
  operadorAsignadoId?: string;
  fechaProgramada?: string;
  razonRechazo?: string;
}

// --- Overlay visual ---------------------------------------------------------

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
// DEUDA DECLARADA — identidades de desarrollo del panel municipal.
// apps/admin-web todavía no tiene login propio: la pantalla de acceso con
// ClaveÚnica vive en apps/frontend. Como el AuthGuard de @arca/core es global
// (HU-13), sin este header toda llamada del panel responde 401.
//
// Todo este bloque —las identidades, el selector y su almacenamiento— se borra
// cuando HU-12 cierre el callback y el panel tenga su propia sesión.
//
// Van los UUID de `usuarios_ciudadanos`, no los de `usuarios_administradores`:
// AuthService resuelve el perfil a partir de la identidad ciudadana y de ahí
// deduce el rol municipal.
//
// Hay dos porque el panel expone áreas con permisos distintos: las solicitudes
// las opera cualquier funcionario, pero el registro de auditoría es solo para
// rol `admin` (HU-14). Poder alternar deja ver esa diferencia desde la
// interfaz, que es justamente lo que HU-13 tiene que demostrar.
export const IDENTIDADES_DEV = {
  admin: {
    id: '00000000-0000-4000-8000-000000000003',
    nombre: 'Carlos Álvarez',
    rol: 'Administrador',
  },
  operador: {
    id: '00000000-0000-4000-8000-000000000002',
    nombre: 'Camila Operadora',
    rol: 'Operador',
  },
} as const;

export type PerfilDev = keyof typeof IDENTIDADES_DEV;

const STORAGE_KEY_PERFIL = 'arca.panel.perfilDev';

export function perfilDevActual(): PerfilDev {
  return localStorage.getItem(STORAGE_KEY_PERFIL) === 'operador'
    ? 'operador'
    : 'admin';
}

export function cambiarPerfilDev(perfil: PerfilDev): void {
  localStorage.setItem(STORAGE_KEY_PERFIL, perfil);
}

function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      ...init?.headers,
      'ngrok-skip-browser-warning': 'true',
      Authorization: `Bearer ${IDENTIDADES_DEV[perfilDevActual()].id}`,
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
      `Esto suele ocurrir si el backend no está corriendo en el puerto 3001 o si las variables de entorno están desconfiguradas. ` +
      `Cuerpo de respuesta: ${textBody.substring(0, 100)}...`
    );
  }

  return res.json() as Promise<T>;
}

// --- Admin municipal --------------------------------------------------------

// Rutas propias de backend-admin (Fase 3 de la migración admin) — no
// /solicitudes-retiro, que es del backend ciudadano. Requieren un
// Authorization: Bearer válido; admin-web todavía no tiene login propio
// (deuda declarada, ver App.tsx), así que hasta que exista, estas llamadas
// devuelven 401.
export function fetchSolicitudesAdmin(
  estado?: EstadoSolicitud,
): Promise<SolicitudRetiro[]> {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  const qs = params.toString();
  return apiFetch(`${API_URL}/admin/solicitudes${qs ? `?${qs}` : ''}`).then(
    (r) => handle<SolicitudRetiro[]>(r),
  );
}

export function fetchSolicitud(id: number): Promise<SolicitudRetiro> {
  return apiFetch(`${API_URL}/admin/solicitudes/${id}`).then((r) =>
    handle<SolicitudRetiro>(r),
  );
}

export function actualizarSolicitud(
  id: number,
  data: ActualizarSolicitudInput,
): Promise<SolicitudRetiro> {
  return apiFetch(`${API_URL}/admin/solicitudes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => handle<SolicitudRetiro>(r));
}

// --- Registro de auditoría (HU-14) ------------------------------------------

// El shape lo definió esta pantalla antes de que existiera el backend; el
// endpoint se adaptó a ella, así que la interfaz no cambió al dejar el mock.
export interface AuditoriaLog {
  id: number;
  usuario: string;
  rol: string;
  accion: string;
  objetoAfectado: string;
  ip: string;
  createdAt: string;
}

/**
 * Registro auditable de acciones críticas.
 *
 * Requiere rol `admin`: a diferencia del resto del panel, un operador recibe
 * 403 acá. Es información de control interno sobre lo que hace cada
 * funcionario, no información operativa.
 *
 * Consultar este registro queda a su vez auditado, con acción ACCESO.
 */
export function fetchAuditoriaLogs(limite?: number): Promise<AuditoriaLog[]> {
  const qs = limite ? `?limite=${limite}` : '';

  return apiFetch(`${API_URL}/admin/auditoria${qs}`).then((r) =>
    handle<AuditoriaLog[]>(r),
  );
}
