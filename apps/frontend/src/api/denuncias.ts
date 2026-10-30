// Capa de API de denuncias (HU-16 vecino, HU-18 panel municipal).
//
// MAQUETA: todavía no hay backend. Las funciones devuelven datos simulados
// para poder ver la interfaz. Plan del backend: tasks/instrucciones-denuncia.md
// (rebanadas D2 y D4). Al conectarlo, reemplazar el cuerpo de cada función por
// apiFetch/handle como en api/chat.ts, sin cambiar las firmas.

export type MotivoDenuncia =
  | 'no_se_presento'
  | 'articulo_distinto'
  | 'trato_ofensivo'
  | 'pidio_datos_o_dinero'
  | 'posible_estafa'
  | 'otro';

export const MOTIVOS_DENUNCIA: { valor: MotivoDenuncia; etiqueta: string }[] = [
  { valor: 'no_se_presento', etiqueta: 'No se presentó a la entrega' },
  { valor: 'articulo_distinto', etiqueta: 'El artículo no era lo publicado' },
  { valor: 'trato_ofensivo', etiqueta: 'Trato ofensivo o acoso' },
  { valor: 'pidio_datos_o_dinero', etiqueta: 'Pidió datos personales o dinero' },
  { valor: 'posible_estafa', etiqueta: 'Posible estafa' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export function etiquetaMotivo(motivo: MotivoDenuncia): string {
  return MOTIVOS_DENUNCIA.find((m) => m.valor === motivo)?.etiqueta ?? motivo;
}

export const DESCRIPCION_MAX = 500;

export type EstadoDenuncia = 'abierta' | 'investigacion' | 'resuelta' | 'rechazada';

/** Desde dónde denuncia el vecino. El servidor resolverá al denunciado por este id, nunca por un id de usuario del cliente. */
export type OrigenDenuncia =
  | { tipo: 'articulo'; articuloId: number }
  | { tipo: 'perfil'; perfilId: string }
  | { tipo: 'chat'; conversacionId: number };

export interface NuevaDenuncia {
  motivo: MotivoDenuncia;
  descripcion?: string;
}

/** Vecino: envía una denuncia. MAQUETA: espera un momento y resuelve. */
export async function denunciar(origen: OrigenDenuncia, datos: NuevaDenuncia): Promise<void> {
  void origen;
  void datos;
  await new Promise((r) => setTimeout(r, 600));
}

// ---- Panel municipal (HU-18) ----

export interface DenunciaResumen {
  id: number;
  fecha: string;
  motivo: MotivoDenuncia;
  estado: EstadoDenuncia;
  origen: OrigenDenuncia['tipo'];
  denuncianteNombre: string;
  denunciadoNombre: string;
  articuloTitulo: string | null;
  /** Cuántas denuncias acumula el denunciado. */
  denunciasDelDenunciado: number;
}

export interface MensajeDenuncia {
  autor: 'denunciante' | 'denunciado';
  contenido: string;
  fecha: string;
}

export interface DenunciaDetalle extends DenunciaResumen {
  descripcion: string | null;
  /** Copia de la conversación; vacía si no se denunció desde el chat. */
  mensajes: MensajeDenuncia[];
  resolucion: string | null;
  fechaResolucion: string | null;
}

export interface CambioEstadoDenuncia {
  estado: Exclude<EstadoDenuncia, 'abierta'>;
  resolucion: string;
}

const DENUNCIAS_MAQUETA: DenunciaDetalle[] = [
  {
    id: 3, fecha: '2026-10-28T19:12:00Z', motivo: 'no_se_presento', estado: 'abierta', origen: 'chat',
    denuncianteNombre: 'Carolina', denunciadoNombre: 'Pedro', articuloTitulo: 'Sillón de dos cuerpos',
    denunciasDelDenunciado: 2, descripcion: 'Quedamos el sábado a las 11 y no llegó ni avisó.',
    mensajes: [
      { autor: 'denunciante', contenido: 'Hola, ¿te sirve el sábado a las 11?', fecha: '2026-10-24T14:02:00Z' },
      { autor: 'denunciado', contenido: 'Sí, perfecto, ahí estoy.', fecha: '2026-10-24T14:10:00Z' },
      { autor: 'denunciante', contenido: 'Estoy esperando, ¿vienes?', fecha: '2026-10-26T11:25:00Z' },
    ],
    resolucion: null, fechaResolucion: null,
  },
  {
    id: 2, fecha: '2026-10-27T10:40:00Z', motivo: 'pidio_datos_o_dinero', estado: 'investigacion', origen: 'perfil',
    denuncianteNombre: 'Luis', denunciadoNombre: 'Andrea', articuloTitulo: null,
    denunciasDelDenunciado: 1, descripcion: 'Me pidió transferirle para "reservar" un artículo regalado.',
    mensajes: [], resolucion: null, fechaResolucion: null,
  },
  {
    id: 1, fecha: '2026-10-20T16:05:00Z', motivo: 'articulo_distinto', estado: 'rechazada', origen: 'articulo',
    denuncianteNombre: 'Marta', denunciadoNombre: 'Jorge', articuloTitulo: 'Bicicleta aro 26',
    denunciasDelDenunciado: 1, descripcion: null, mensajes: [],
    resolucion: 'Las fotos coinciden con el artículo entregado.', fechaResolucion: '2026-10-22T09:00:00Z',
  },
];

/** Panel: lista denuncias por estado. MAQUETA: filtra datos locales. */
export async function listarDenuncias(estados: EstadoDenuncia[]): Promise<DenunciaResumen[]> {
  return DENUNCIAS_MAQUETA.filter((d) => estados.includes(d.estado));
}

/** Panel: detalle con mensajes copiados. MAQUETA. */
export async function obtenerDenuncia(id: number): Promise<DenunciaDetalle | null> {
  return DENUNCIAS_MAQUETA.find((d) => d.id === id) ?? null;
}

/** Panel: cambia el estado. MAQUETA: modifica la copia local hasta recargar. */
export async function cambiarEstadoDenuncia(id: number, cambio: CambioEstadoDenuncia): Promise<void> {
  const d = DENUNCIAS_MAQUETA.find((x) => x.id === id);
  if (d) Object.assign(d, cambio, { fechaResolucion: new Date().toISOString() });
}
