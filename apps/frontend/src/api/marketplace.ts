// Capa de API del Marketplace P2P (EP-02).
//
// Este archivo es el CONTRATO entre las pantallas y el backend. Mientras no
// existan los endpoints, cada función responde con datos de ejemplo; cuando
// lleguen, se cambia solo el interruptor de abajo y las pantallas no se tocan.
//
// Endpoints esperados (para Javier):
//   GET  /marketplace/articulos?tipo=&categoria=&texto=&lat=&lon=
//        → ArticuloMarketplace[]  (solo estado 'disponible')
//   GET  /marketplace/articulos/:id?lat=&lon=
//        → ArticuloMarketplace
//   POST /marketplace/articulos  (multipart/form-data: tipo, titulo,
//        descripcion, residuoCatalogoId, foto?)
//        → ArticuloMarketplace
//
// Privacidad: `lat`/`lon` son el punto de QUIEN MIRA, ya redondeado a 20 m en
// el navegador. El backend calcula `banda` con `bandaPorMetros` (ver
// features/marketplace/distancia.ts) y NUNCA devuelve la coordenada del
// artículo. Sin `lat`/`lon`, `banda` viene en null.

import { apiFetch, handle } from './arca';
import {
  bandaPorMetros,
  type BandaDistancia,
  type Coordenadas,
} from '../features/marketplace/distancia';

// INTERRUPTOR: cambiar a false cuando estén los endpoints de Javier.
const USAR_DATOS_DE_EJEMPLO = true;

const API_URL = import.meta.env.VITE_API_URL as string;

export type TipoArticulo = 'regalo' | 'intercambio';

// Alineado con `articulos_marketplace.estado` en ARCA_database_schema.dbml.
export type EstadoArticulo =
  | 'disponible'
  | 'en_negociacion'
  | 'retirado'
  | 'completado';

export interface PublicadorMarketplace {
  id: string;
  /** Nombre real entregado por ClaveÚnica (decisión de producto). */
  nombre: string;
  /** Promedio de estrellas (1–5); null si nunca lo han calificado. */
  calificacionPromedio: number | null;
  cantidadCalificaciones: number;
}

export interface ArticuloMarketplace {
  id: number;
  tipo: TipoArticulo;
  titulo: string;
  descripcion: string | null;
  estado: EstadoArticulo;
  residuoCatalogoId: number;
  /** Categoría del catálogo municipal del residuo asociado. */
  categoria: string;
  fotoUrl: string | null;
  /** Circular Credits que otorga el intercambio. La regla vive en el backend. */
  creditos: number;
  /** Banda de distancia a quien mira; null si no compartió su ubicación. */
  banda: BandaDistancia | null;
  publicador: PublicadorMarketplace;
  fechaPublicacion: string;
}

export interface FiltrosMarketplace {
  tipo?: TipoArticulo;
  categoria?: string;
  texto?: string;
  /** Punto de quien mira, ya aproximado a 20 m. Solo sirve para calcular la banda. */
  origen?: Coordenadas | null;
}

export interface PublicarArticuloInput {
  tipo: TipoArticulo;
  titulo: string;
  descripcion?: string;
  residuoCatalogoId: number;
  foto?: File;
}

// --- Llamadas reales --------------------------------------------------------

const paramsOrigen = (params: URLSearchParams, origen?: Coordenadas | null) => {
  if (!origen) return;
  params.set('lat', String(origen.latitud));
  params.set('lon', String(origen.longitud));
};

export function listarArticulos(
  filtros: FiltrosMarketplace = {},
): Promise<ArticuloMarketplace[]> {
  if (USAR_DATOS_DE_EJEMPLO) return ejemploListar(filtros);

  const params = new URLSearchParams();
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.categoria) params.set('categoria', filtros.categoria);
  if (filtros.texto) params.set('texto', filtros.texto);
  paramsOrigen(params, filtros.origen);

  return apiFetch(`${API_URL}/marketplace/articulos?${params}`).then((r) =>
    handle<ArticuloMarketplace[]>(r),
  );
}

export function obtenerArticulo(
  id: number,
  origen?: Coordenadas | null,
): Promise<ArticuloMarketplace> {
  if (USAR_DATOS_DE_EJEMPLO) return ejemploObtener(id, origen);

  const params = new URLSearchParams();
  paramsOrigen(params, origen);

  return apiFetch(`${API_URL}/marketplace/articulos/${id}?${params}`).then(
    (r) => handle<ArticuloMarketplace>(r),
  );
}

export function publicarArticulo(
  input: PublicarArticuloInput,
): Promise<ArticuloMarketplace> {
  if (USAR_DATOS_DE_EJEMPLO) return ejemploPublicar(input);

  const form = new FormData();
  form.set('tipo', input.tipo);
  form.set('titulo', input.titulo);
  if (input.descripcion) form.set('descripcion', input.descripcion);
  form.set('residuoCatalogoId', String(input.residuoCatalogoId));
  if (input.foto) form.set('foto', input.foto);

  // Sin Content-Type explícito: el navegador pone el boundary del multipart.
  return apiFetch(`${API_URL}/marketplace/articulos`, {
    method: 'POST',
    body: form,
  }).then((r) => handle<ArticuloMarketplace>(r));
}

// --- Datos de ejemplo -------------------------------------------------------
// Solo se usan con USAR_DATOS_DE_EJEMPLO = true. Imitan la semántica que
// tendrá el backend (filtros, banda solo con origen) para que las pantallas se
// comporten igual cuando se cambie el interruptor.

// Mismo valor para todos los objetos, solo para probar (decisión de producto).
const CREDITOS_POR_ARTICULO_EJEMPLO = 10;

const RETARDO_EJEMPLO_MS = 400;

// `metros` simula la distancia que calcularía el backend; nunca sale de acá.
type ArticuloEjemplo = Omit<ArticuloMarketplace, 'banda'> & { metros: number };

const publicador = (
  id: string,
  nombre: string,
  calificacionPromedio: number | null,
  cantidadCalificaciones: number,
): PublicadorMarketplace => ({
  id,
  nombre,
  calificacionPromedio,
  cantidadCalificaciones,
});

const CAMILA = publicador('ej-1', 'Camila Rojas Muñoz', 4.8, 12);
const JORGE = publicador('ej-2', 'Jorge Soto Pérez', 4.2, 5);
const VALENTINA = publicador('ej-3', 'Valentina Díaz Contreras', null, 0);
const PEDRO = publicador('ej-4', 'Pedro Fuentes Araya', 3.6, 3);

const articulo = (
  id: number,
  tipo: TipoArticulo,
  titulo: string,
  descripcion: string,
  categoria: string,
  residuoCatalogoId: number,
  pub: PublicadorMarketplace,
  metros: number,
  diasAtras: number,
): ArticuloEjemplo => ({
  id,
  tipo,
  titulo,
  descripcion,
  estado: 'disponible',
  residuoCatalogoId,
  categoria,
  fotoUrl: null,
  creditos: CREDITOS_POR_ARTICULO_EJEMPLO,
  publicador: pub,
  fechaPublicacion: new Date(Date.now() - diasAtras * 86_400_000).toISOString(),
  metros,
});

const articulosEjemplo: ArticuloEjemplo[] = [
  articulo(1, 'regalo', 'Sofá de 3 cuerpos', 'Tela gris, un cojín algo gastado. Hay que retirarlo.', 'Muebles', 1, CAMILA, 650, 1),
  articulo(2, 'intercambio', 'Refrigerador No Frost', 'Funciona bien, lo cambio por una lavadora.', 'Línea Blanca', 2, JORGE, 3_200, 2),
  articulo(3, 'regalo', 'Televisor 32"', 'Enciende, pero sin control remoto.', 'Electrónica', 3, VALENTINA, 7_800, 3),
  articulo(4, 'intercambio', 'Mesa de comedor de madera', 'Para 6 personas, sin sillas.', 'Muebles', 4, PEDRO, 1_900, 4),
  articulo(5, 'regalo', 'Sacos de cerámica sobrante', 'Unos 8 m² de cerámica de piso, sin usar.', 'Construcción', 5, CAMILA, 12_500, 5),
  articulo(6, 'regalo', 'Microondas', 'Calienta bien, el plato giratorio no gira.', 'Electrónica', 6, JORGE, 400, 6),
  articulo(7, 'intercambio', 'Lavadora automática 7 kg', 'Le falla el centrifugado; ideal para repuestos.', 'Línea Blanca', 7, VALENTINA, 4_700, 8),
  articulo(8, 'regalo', 'Colchón de 2 plazas', 'Limpio, sin manchas. Retirar en el día.', 'Otros', 8, PEDRO, 9_100, 10),
];

let siguienteIdEjemplo = articulosEjemplo.length + 1;

const esperar = () =>
  new Promise<void>((resolve) => setTimeout(resolve, RETARDO_EJEMPLO_MS));

const aPublico = (
  { metros, ...resto }: ArticuloEjemplo,
  origen?: Coordenadas | null,
): ArticuloMarketplace => ({
  ...resto,
  banda: origen ? bandaPorMetros(metros) : null,
});

// "sofa" debe encontrar "Sofá", como hace MySQL con su collation por defecto.
const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

async function ejemploListar(
  filtros: FiltrosMarketplace,
): Promise<ArticuloMarketplace[]> {
  await esperar();
  const texto = filtros.texto ? normalizar(filtros.texto.trim()) : '';
  return articulosEjemplo
    .filter((a) => a.estado === 'disponible')
    .filter((a) => !filtros.tipo || a.tipo === filtros.tipo)
    .filter((a) => !filtros.categoria || a.categoria === filtros.categoria)
    .filter(
      (a) =>
        !texto ||
        normalizar(a.titulo).includes(texto) ||
        normalizar(a.descripcion ?? '').includes(texto),
    )
    .map((a) => aPublico(a, filtros.origen));
}

async function ejemploObtener(
  id: number,
  origen?: Coordenadas | null,
): Promise<ArticuloMarketplace> {
  await esperar();
  const encontrado = articulosEjemplo.find((a) => a.id === id);
  if (!encontrado) throw new Error('Error 404: Artículo no encontrado');
  return aPublico(encontrado, origen);
}

async function ejemploPublicar(
  input: PublicarArticuloInput,
): Promise<ArticuloMarketplace> {
  await esperar();
  const nuevo: ArticuloEjemplo = {
    id: siguienteIdEjemplo++,
    tipo: input.tipo,
    titulo: input.titulo,
    descripcion: input.descripcion ?? null,
    estado: 'disponible',
    residuoCatalogoId: input.residuoCatalogoId,
    categoria: 'Otros',
    // Vista previa local mientras no exista la subida real.
    fotoUrl: input.foto ? URL.createObjectURL(input.foto) : null,
    creditos: CREDITOS_POR_ARTICULO_EJEMPLO,
    publicador: publicador('ej-yo', 'Tú (ejemplo)', null, 0),
    fechaPublicacion: new Date().toISOString(),
    metros: 0,
  };
  articulosEjemplo.unshift(nuevo);
  return aPublico(nuevo);
}
