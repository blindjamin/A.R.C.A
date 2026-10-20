// Capa de API de A.R.C.A. — fetch simple sobre los endpoints del backend (EP-01).
// Cuando el estado crezca, migrar a Redux Toolkit + RTK Query (ver roadmap B.3).

import { apiFetch } from './apiFetch';
export { apiFetch };

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

// Ciclo de la solicitud: packages/arca-core/src/entities/estado-solicitud-retiro.enum.ts
// (docs/specs/SPEC-ciclo-solicitud.md).
export type EstadoSolicitud =
  | 'en_revision'
  | 'requiere_modificacion'
  | 'aprobada'
  | 'rechazada'
  | 'derivada'
  | 'retirada'
  | 'no_realizada'
  | 'cancelada';

export type EstadoPago = 'no_aplica' | 'pendiente' | 'pagado';

export interface RevisionVisible {
  decision: string;
  motivo?: string | null;
  comentario?: string | null;
  fecha: string;
}

export interface SolicitudRetiro {
  id: number;
  usuarioCiudadanoId: string;
  residuoCatalogoId: number;
  estado: EstadoSolicitud;
  estadoPago: EstadoPago;
  monto: number | null;
  descripcion: string | null;
  direccionRetiro?: string | null;
  direccionAnonimizada?: string | null;
  latitudCapturada?: string | null;
  longitudCapturada?: string | null;
  fechaSolicitud: string;
  fechaRevision?: string | null;
  fechaCierre?: string | null;
  razonRechazo?: string | null;
  createdAt: string;
  updatedAt: string;
  // El GET incluye la relación anidada; en el POST puede no venir.
  residuoCatalogo?: ResiduoCatalogo;
  // Ruta protegida de la foto (`/api/solicitudes-retiro/:id/foto`), o null.
  fotoUrl?: string | null;
  // Detalle de la última revisión del funcionario municipal (para corregir)
  ultimaRevision?: RevisionVisible | null;
}

export interface CrearSolicitudInput {
  usuarioCiudadanoId: string;
  residuoCatalogoId: number;
  direccionRetiro: string;
  foto: File;
  descripcion?: string;
  emailContacto?: string;
}

export interface ReenviarSolicitudInput {
  descripcion?: string;
  residuoCatalogoId?: number;
  direccionRetiro?: string;
  foto?: File;
}

// El backend recibe la solicitud como multipart/form-data: la foto va como
// archivo en el campo `foto` y el resto como texto. Sin `Content-Type` a
// mano: el navegador lo arma con el separador del multipart.
function aFormData(campos: Record<string, string | number | File | undefined>): FormData {
  const form = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    if (valor === undefined) continue;
    form.append(clave, valor instanceof File ? valor : String(valor));
  }
  return form;
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

export async function handle<T>(res: Response): Promise<T> {
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
    body: aFormData({ ...data }),
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

export function fetchSolicitud(id: number): Promise<SolicitudRetiro> {
  return apiFetch(`${API_URL}/solicitudes-retiro/${id}`).then((r) =>
    handle<SolicitudRetiro>(r),
  );
}

export function reenviarSolicitud(
  id: number,
  cambios: ReenviarSolicitudInput,
): Promise<SolicitudRetiro> {
  return apiFetch(`${API_URL}/solicitudes-retiro/${id}/reenviar`, {
    method: 'PATCH',
    body: aFormData({ ...cambios }),
  }).then((r) => handle<SolicitudRetiro>(r));
}


// Los fetchers de admin (solicitudes globales, auditoría) viven en
// admin/api/admin.ts — se movieron con la migración del panel.

export interface EnviarCodigoRespuesta {
  ok: boolean;
  mensaje: string;
  codigoDev?: string;
}

export interface VerificarCodigoRespuesta {
  ok: boolean;
  verificado: boolean;
  mensaje: string;
}

export async function solicitarCodigoCorreo(
  email: string,
  usuarioCiudadanoId?: string,
): Promise<EnviarCodigoRespuesta> {
  const res = await apiFetch(`${API_URL}/mail/enviar-codigo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, usuarioCiudadanoId }),
  });
  return handle<EnviarCodigoRespuesta>(res);
}

export async function verificarCodigoCorreo(
  email: string,
  codigo: string,
  usuarioCiudadanoId?: string,
): Promise<VerificarCodigoRespuesta> {
  const res = await apiFetch(`${API_URL}/mail/verificar-codigo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, codigo, usuarioCiudadanoId }),
  });
  return handle<VerificarCodigoRespuesta>(res);
}

