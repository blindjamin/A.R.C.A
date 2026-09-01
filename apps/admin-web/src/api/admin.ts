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
function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: { ...init?.headers, 'ngrok-skip-browser-warning': 'true' },
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

export function fetchSolicitudesAdmin(
  estado?: EstadoSolicitud,
): Promise<SolicitudRetiro[]> {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  const qs = params.toString();
  return apiFetch(`${API_URL}/solicitudes-retiro${qs ? `?${qs}` : ''}`).then(
    (r) => handle<SolicitudRetiro[]>(r),
  );
}

export function fetchSolicitud(id: number): Promise<SolicitudRetiro> {
  return apiFetch(`${API_URL}/solicitudes-retiro/${id}`).then((r) =>
    handle<SolicitudRetiro>(r),
  );
}

export function actualizarSolicitud(
  id: number,
  data: ActualizarSolicitudInput,
): Promise<SolicitudRetiro> {
  return apiFetch(`${API_URL}/solicitudes-retiro/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => handle<SolicitudRetiro>(r));
}

// --- Logs de Auditoría (Sprint 5 mock API) ----------------------------------

export interface AuditoriaLog {
  id: number;
  usuario: string;
  rol: string;
  accion: string;
  objetoAfectado: string;
  ip: string;
  createdAt: string;
}

const MOCK_AUDITORIA: AuditoriaLog[] = [
  {
    id: 1,
    usuario: 'Benjamín Paicil',
    rol: 'Administrador',
    accion: 'Inicio de sesión',
    objetoAfectado: 'Sistema (Auth)',
    ip: '192.168.1.100',
    createdAt: '2026-08-29T10:15:30Z',
  },
  {
    id: 2,
    usuario: 'Carmen González',
    rol: 'Vecino',
    accion: 'Crear solicitud',
    objetoAfectado: 'Solicitud #1024',
    ip: '190.162.45.12',
    createdAt: '2026-08-29T11:02:15Z',
  },
  {
    id: 3,
    usuario: 'Carlos Álvarez',
    rol: 'Administrador',
    accion: 'Asignar operador',
    objetoAfectado: 'Solicitud #1024 (Operador #3)',
    ip: '192.168.1.115',
    createdAt: '2026-08-29T11:20:00Z',
  },
  {
    id: 4,
    usuario: 'Maximiliano López',
    rol: 'Operador',
    accion: 'Cambio estado a: en_proceso',
    objetoAfectado: 'Solicitud #1024',
    ip: '200.12.87.54',
    createdAt: '2026-08-29T12:05:40Z',
  },
  {
    id: 5,
    usuario: 'Carmen González',
    rol: 'Vecino',
    accion: 'Inicio de sesión',
    objetoAfectado: 'Sistema (Auth)',
    ip: '190.162.45.12',
    createdAt: '2026-08-29T13:45:10Z',
  },
  {
    id: 6,
    usuario: 'Ana Araya',
    rol: 'Administrador',
    accion: 'Inicio de sesión',
    objetoAfectado: 'Sistema (Auth)',
    ip: '192.168.1.102',
    createdAt: '2026-08-29T14:10:00Z',
  },
  {
    id: 7,
    usuario: 'Ana Araya',
    rol: 'Administrador',
    accion: 'Actualizar catálogo',
    objetoAfectado: 'Residuo ID #5 (Refrigerador)',
    ip: '192.168.1.102',
    createdAt: '2026-08-29T14:15:33Z',
  },
  {
    id: 8,
    usuario: 'Miguel Segovia',
    rol: 'Vecino',
    accion: 'Cancelar solicitud',
    objetoAfectado: 'Solicitud #1022',
    ip: '186.105.74.22',
    createdAt: '2026-08-29T15:30:12Z',
  },
  {
    id: 9,
    usuario: 'Javier Figueroa',
    rol: 'Administrador',
    accion: 'Inicio de sesión',
    objetoAfectado: 'Sistema (Auth)',
    ip: '192.168.1.108',
    createdAt: '2026-08-29T15:58:00Z',
  },
  {
    id: 10,
    usuario: 'Javier Figueroa',
    rol: 'Administrador',
    accion: 'Exportar logs de auditoría',
    objetoAfectado: 'Logs Excel/PDF (Rango: 7 días)',
    ip: '192.168.1.108',
    createdAt: '2026-08-29T16:05:44Z',
  },
];

export function fetchAuditoriaLogs(): Promise<AuditoriaLog[]> {
  // Simulamos un retraso de red de 300ms para realismo.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...MOCK_AUDITORIA].sort((a, b) => b.id - a.id));
    }, 300);
  });
}
