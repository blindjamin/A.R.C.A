// Capa de API de A.R.C.A. — fetch simple sobre los endpoints del backend (EP-01).
// Cuando el estado crezca, migrar a Redux Toolkit + RTK Query (ver roadmap B.3).

const API_URL = import.meta.env.VITE_API_URL as string;

export interface ResiduoCatalogo {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  subcategoria: string | null;
  puedeReutilizarse: boolean;
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
  fechaSolicitud: string;
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
// El backend (entidad ResiduoCatalogo) no expone precio ni ícono. Hasta que se
// agreguen esas columnas, los derivamos en el front por categoría (referencial).
// Migrar a campos reales cuando el backend los provea.

const PRECIO_POR_CATEGORIA: Record<string, number> = {
  Muebles: 8000,
  Electrónica: 12000,
  'Línea Blanca': 10000,
  Construcción: 15000,
  Otros: 5000,
};
const PRECIO_DEFAULT = 6000;

const ICONO_POR_CATEGORIA: Record<string, string> = {
  Muebles: '🛋️',
  Electrónica: '📺',
  'Línea Blanca': '🧺',
  Construcción: '🧱',
  Otros: '📦',
};
const ICONO_DEFAULT = '♻️';

export const precioReferencial = (categoria: string): number =>
  PRECIO_POR_CATEGORIA[categoria] ?? PRECIO_DEFAULT;

export const iconoPorCategoria = (categoria: string): string =>
  ICONO_POR_CATEGORIA[categoria] ?? ICONO_DEFAULT;

export const formatearPrecio = (clp: number): string =>
  clp.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  });

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function fetchCatalogo(): Promise<ResiduoCatalogo[]> {
  return fetch(`${API_URL}/residuos/catalogo`).then((r) =>
    handle<ResiduoCatalogo[]>(r),
  );
}

export function crearSolicitudRetiro(
  data: CrearSolicitudInput,
): Promise<SolicitudRetiro> {
  return fetch(`${API_URL}/solicitudes-retiro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then((r) => handle<SolicitudRetiro>(r));
}

export function fetchMisSolicitudes(
  usuarioCiudadanoId: string,
): Promise<SolicitudRetiro[]> {
  const url = new URL(`${API_URL}/solicitudes-retiro`);
  url.searchParams.set('usuarioCiudadanoId', usuarioCiudadanoId);
  return fetch(url).then((r) => handle<SolicitudRetiro[]>(r));
}
