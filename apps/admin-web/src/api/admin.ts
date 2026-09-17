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

// Ciclo de revisión y derivación (docs/specs/SPEC-ciclo-solicitud.md). Qué
// transiciones son válidas lo decide el backend: el panel solo muestra las que
// vienen en `transicionesDisponibles`.
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

export interface FuncionarioResumen {
  id: string;
  nombre: string;
  apellido: string;
}

export interface SolicitudRetiro {
  id: number;
  usuarioCiudadanoId: string;
  residuoCatalogoId: number;
  estado: EstadoSolicitud;
  estadoPago: EstadoPago;
  monto: number | null;
  descripcion: string | null;
  direccionAnonimizada?: string | null;
  latitudCapturada?: string | null;
  longitudCapturada?: string | null;
  fechaSolicitud: string;
  fechaRevision?: string | null;
  revisadoPorId?: string | null;
  fechaCierre?: string | null;
  razonRechazo?: string | null;
  createdAt: string;
  updatedAt: string;
  // El GET incluye la relación anidada; en el POST puede no venir.
  residuoCatalogo?: ResiduoCatalogo;
}

/** Lo que devuelve `GET /admin/solicitudes/:id`. */
export interface SolicitudDetalle extends SolicitudRetiro {
  revisadoPor?: FuncionarioResumen | null;
  /** Funcionario con la toma vigente; `null` si nadie la está revisando. */
  tomadaPor?: FuncionarioResumen | null;
  /** Estados a los que la sesión actual puede mover la solicitud. */
  transicionesDisponibles: EstadoSolicitud[];
}

export interface ActualizarSolicitudInput {
  estado: EstadoSolicitud;
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
  funcionario: {
    id: '00000000-0000-4000-8000-000000000002',
    nombre: 'Camila Operadora',
    rol: 'Funcionario',
  },
} as const;

export type PerfilDev = keyof typeof IDENTIDADES_DEV;

const STORAGE_KEY_PERFIL = 'arca.panel.perfilDev';

export function perfilDevActual(): PerfilDev {
  return localStorage.getItem(STORAGE_KEY_PERFIL) === 'funcionario'
    ? 'funcionario'
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

export function fetchSolicitud(id: number): Promise<SolicitudDetalle> {
  return apiFetch(`${API_URL}/admin/solicitudes/${id}`).then((r) =>
    handle<SolicitudDetalle>(r),
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

// --- Revisión (docs/specs/SPEC-revision-solicitudes.md) --------------------

export type DecisionRevision = 'aprobada' | 'requiere_modificacion' | 'rechazada';

export type MotivoRevision =
  | 'foto_insuficiente'
  | 'categoria_incorrecta'
  | 'descripcion_incompleta'
  | 'direccion_incompleta'
  | 'fuera_de_comuna'
  | 'residuo_no_admitido'
  | 'duplicada'
  | 'contenido_inapropiado'
  | 'otro';

// Copia de MOTIVOS_POR_DECISION e ITEMS_CHECKLIST_APROBACION de @arca/core
// (admin-web no puede importar el paquete). El backend valida igual: si estas
// listas se desincronizan, la decisión responde 400, no queda mal guardada.
export const MOTIVOS_POR_DECISION: Record<
  Exclude<DecisionRevision, 'aprobada'>,
  MotivoRevision[]
> = {
  requiere_modificacion: [
    'foto_insuficiente',
    'categoria_incorrecta',
    'descripcion_incompleta',
    'direccion_incompleta',
    'otro',
  ],
  rechazada: [
    'fuera_de_comuna',
    'residuo_no_admitido',
    'duplicada',
    'contenido_inapropiado',
    'otro',
  ],
};

export const ETIQUETA_MOTIVO: Record<MotivoRevision, string> = {
  foto_insuficiente: 'La foto no permite ver el residuo',
  categoria_incorrecta: 'Categoría incorrecta',
  descripcion_incompleta: 'Descripción incompleta',
  direccion_incompleta: 'Dirección incompleta',
  fuera_de_comuna: 'Dirección fuera de la comuna',
  residuo_no_admitido: 'Residuo no admitido',
  duplicada: 'Solicitud duplicada',
  contenido_inapropiado: 'Contenido inapropiado',
  otro: 'Otro',
};

export const ITEMS_CHECKLIST_APROBACION = [
  { id: 'foto_clara', label: 'La foto muestra el residuo con claridad' },
  { id: 'residuo_coincide', label: 'El residuo coincide con la categoría' },
  { id: 'volumen_razonable', label: 'El volumen es razonable para un retiro' },
  { id: 'direccion_en_comuna', label: 'La dirección está dentro de la comuna' },
  { id: 'no_duplicada', label: 'No está duplicada' },
] as const;

export interface RevisarSolicitudInput {
  decision: DecisionRevision;
  motivo?: MotivoRevision;
  comentario?: string;
  checklist?: Record<string, boolean>;
}

export interface RevisionHistorial {
  id: number;
  decision: DecisionRevision;
  motivo: MotivoRevision | null;
  comentario: string | null;
  checklist: Record<string, boolean> | null;
  revisor: string;
  createdAt: string;
}

export interface NotaSolicitud {
  id: number;
  texto: string;
  autor: string;
  createdAt: string;
}

export type ResiduoResumen = Pick<
  ResiduoCatalogo,
  'id' | 'nombre' | 'categoria' | 'precio'
>;

const jsonInit = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: data === undefined ? undefined : JSON.stringify(data),
});

/** `handle` arma "Error 400: {json}"; se muestra solo el mensaje del backend. */
export function mensajeDeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  const json = texto.indexOf('{');
  if (json === -1) return texto;
  try {
    const { message } = JSON.parse(texto.slice(json)) as {
      message?: string | string[];
    };
    if (Array.isArray(message)) return message.join('. ');
    return message ?? texto;
  } catch {
    return texto;
  }
}

/** Respuestas 204 sin cuerpo. */
async function handleVacio(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error ${res.status}: ${body || res.statusText}`);
  }
}

/** Toma la solicitud por 15 minutos. Responde 409 si la tiene otro funcionario. */
export function tomarSolicitud(id: number): Promise<{ tomadaHasta: string }> {
  return apiFetch(`${API_URL}/admin/solicitudes/${id}/toma`, {
    method: 'POST',
  }).then((r) => handle<{ tomadaHasta: string }>(r));
}

export function liberarSolicitud(id: number): Promise<void> {
  return apiFetch(`${API_URL}/admin/solicitudes/${id}/toma`, {
    method: 'DELETE',
  }).then(handleVacio);
}

export function revisarSolicitud(
  id: number,
  data: RevisarSolicitudInput,
): Promise<SolicitudRetiro> {
  return apiFetch(
    `${API_URL}/admin/solicitudes/${id}/revision`,
    jsonInit('POST', data),
  ).then((r) => handle<SolicitudRetiro>(r));
}

export function fetchRevisiones(id: number): Promise<RevisionHistorial[]> {
  return apiFetch(`${API_URL}/admin/solicitudes/${id}/revisiones`).then((r) =>
    handle<RevisionHistorial[]>(r),
  );
}

export function corregirCategoria(
  id: number,
  residuoCatalogoId: number,
): Promise<void> {
  return apiFetch(
    `${API_URL}/admin/solicitudes/${id}/categoria`,
    jsonInit('PATCH', { residuoCatalogoId }),
  ).then(handleVacio);
}

export function fetchNotas(id: number): Promise<NotaSolicitud[]> {
  return apiFetch(`${API_URL}/admin/solicitudes/${id}/notas`).then((r) =>
    handle<NotaSolicitud[]>(r),
  );
}

export function crearNota(id: number, texto: string): Promise<NotaSolicitud> {
  return apiFetch(
    `${API_URL}/admin/solicitudes/${id}/notas`,
    jsonInit('POST', { texto }),
  ).then((r) => handle<NotaSolicitud>(r));
}

export function fetchResiduos(): Promise<ResiduoResumen[]> {
  return apiFetch(`${API_URL}/admin/residuos`).then((r) =>
    handle<ResiduoResumen[]>(r),
  );
}

// --- Derivación a la empresa (docs/specs/SPEC-derivacion-excel.md) ---------

export interface ResumenDerivacion {
  /** Aprobadas con el pago resuelto: entran en el próximo lote. */
  listas: number;
  /** Aprobadas que esperan el pago del vecino. */
  bloqueadasPorPago: number;
}

export interface LoteDerivacion {
  id: number;
  cantidad: number;
  generadoPor: string;
  createdAt: string;
}

export function fetchResumenDerivacion(): Promise<ResumenDerivacion> {
  return apiFetch(`${API_URL}/admin/derivaciones/resumen`).then((r) =>
    handle<ResumenDerivacion>(r),
  );
}

export function fetchLotesDerivacion(): Promise<LoteDerivacion[]> {
  return apiFetch(`${API_URL}/admin/derivaciones`).then((r) =>
    handle<LoteDerivacion[]>(r),
  );
}

export function crearLoteDerivacion(): Promise<{ id: number; cantidad: number }> {
  return apiFetch(`${API_URL}/admin/derivaciones`, { method: 'POST' }).then(
    (r) => handle<{ id: number; cantidad: number }>(r),
  );
}

/**
 * Descarga el Excel del lote. Va por `fetch` y no por un enlace porque la
 * petición necesita el header Authorization; cada descarga queda auditada.
 */
export async function descargarExcelLote(id: number): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/derivaciones/${id}/excel`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error ${res.status}: ${body || res.statusText}`);
  }

  const disposicion = res.headers.get('content-disposition') ?? '';
  const nombre =
    /filename="([^"]+)"/.exec(disposicion)?.[1] ?? `arca-lote-${id}.xlsx`;

  const url = URL.createObjectURL(await res.blob());
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

// --- Mapa de calor ----------------------------------------------------------

export interface SectorMapaCalor {
  sector: string;
  lat: number;
  lng: number;
  total: number;
  pendientes: number;
  intensidad: 'alta' | 'media' | 'baja';
}

export function fetchMapaCalor(
  metrica: 'volumen' | 'pendientes' = 'volumen',
): Promise<SectorMapaCalor[]> {
  const params = new URLSearchParams({ metrica });
  return apiFetch(`${API_URL}/admin/mapa-calor?${params.toString()}`).then((r) =>
    handle<SectorMapaCalor[]>(r),
  );
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
 * Requiere rol `admin`: a diferencia del resto del panel, un funcionario recibe
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
