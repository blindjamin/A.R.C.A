/**
 * Objetos de una solicitud de retiro (HU-01): lectura de lo que manda el
 * vecino, precio sugerido al funcionario y resumen para el panel y el Excel.
 */

/** Tope técnico contra listas abusivas; la revisión del funcionario filtra el resto. */
export const MAXIMO_OBJETOS_POR_SOLICITUD = 50;
export const CANTIDAD_MAXIMA_POR_OBJETO = 10;
export const LARGO_MAXIMO_NOMBRE_OTRO = 150;

/** Un objeto tal como queda listo para guardar. */
export interface ObjetoPedido {
  residuoCatalogoId: number | null;
  nombreOtro: string | null;
  cantidad: number;
}

/** Lo mínimo de un objeto guardado para sugerir el precio o resumirlo. */
export interface ObjetoConResiduo {
  nombreOtro: string | null;
  cantidad: number;
  residuoCatalogo?: {
    nombre: string;
    categoria?: string | null;
    precio?: number | null;
  } | null;
}

export class ObjetosInvalidosError extends Error {}

/**
 * Lee el campo `objetos` (JSON en el multipart). Sin él, arma un solo objeto
 * con los campos de antes (`residuoCatalogoId` o `nombreResiduoOtro`), para
 * que un cliente que todavía no manda la lista siga funcionando.
 */
export function leerObjetosPedidos(
  objetosJson: string | undefined,
  anterior: {
    residuoCatalogoId?: number | null;
    nombreResiduoOtro?: string | null;
  },
): ObjetoPedido[] {
  if (objetosJson === undefined || objetosJson.trim() === '') {
    return [validarObjeto({ ...anterior, cantidad: 1 }, 0)];
  }

  let crudo: unknown;
  try {
    crudo = JSON.parse(objetosJson);
  } catch {
    throw new ObjetosInvalidosError('La lista de objetos no es válida.');
  }

  if (!Array.isArray(crudo) || crudo.length === 0) {
    throw new ObjetosInvalidosError(
      'Agrega al menos un objeto a la solicitud.',
    );
  }
  if (crudo.length > MAXIMO_OBJETOS_POR_SOLICITUD) {
    throw new ObjetosInvalidosError(
      `Una solicitud admite hasta ${MAXIMO_OBJETOS_POR_SOLICITUD} objetos.`,
    );
  }

  return crudo.map((item, i) => validarObjeto(item, i));
}

function validarObjeto(item: unknown, posicion: number): ObjetoPedido {
  const numero = posicion + 1;
  if (typeof item !== 'object' || item === null) {
    throw new ObjetosInvalidosError(`El objeto ${numero} no es válido.`);
  }
  const { residuoCatalogoId, nombreResiduoOtro, nombreOtro, cantidad } =
    item as Record<string, unknown>;

  const cantidadFinal = cantidad === undefined ? 1 : cantidad;
  if (
    !Number.isInteger(cantidadFinal) ||
    (cantidadFinal as number) < 1 ||
    (cantidadFinal as number) > CANTIDAD_MAXIMA_POR_OBJETO
  ) {
    throw new ObjetosInvalidosError(
      `La cantidad del objeto ${numero} debe ser de 1 a ${CANTIDAD_MAXIMA_POR_OBJETO}.`,
    );
  }

  if (residuoCatalogoId !== undefined && residuoCatalogoId !== null) {
    if (
      !Number.isInteger(residuoCatalogoId) ||
      (residuoCatalogoId as number) < 1
    ) {
      throw new ObjetosInvalidosError(`El objeto ${numero} no es válido.`);
    }
    return {
      residuoCatalogoId: residuoCatalogoId as number,
      nombreOtro: null,
      cantidad: cantidadFinal as number,
    };
  }

  const nombre = nombreOtro ?? nombreResiduoOtro;
  const limpio = typeof nombre === 'string' ? nombre.trim() : '';
  if (!limpio) {
    throw new ObjetosInvalidosError(
      `Elige el objeto ${numero} del catálogo o escribe qué es.`,
    );
  }
  if (limpio.length > LARGO_MAXIMO_NOMBRE_OTRO) {
    throw new ObjetosInvalidosError(
      `El nombre del objeto ${numero} admite hasta ${LARGO_MAXIMO_NOMBRE_OTRO} caracteres.`,
    );
  }
  return {
    residuoCatalogoId: null,
    nombreOtro: limpio,
    cantidad: cantidadFinal as number,
  };
}

/**
 * Suma de precio × cantidad si todos los objetos son del catálogo. Con alguno
 * fuera del catálogo devuelve null: el monto lo presupuesta el funcionario.
 */
export function precioSugerido(
  objetos: readonly ObjetoConResiduo[],
): number | null {
  if (objetos.length === 0) return null;
  let total = 0;
  for (const objeto of objetos) {
    const precio = objeto.residuoCatalogo?.precio;
    if (precio === undefined || precio === null) return null;
    total += precio * objeto.cantidad;
  }
  return total;
}

/** «Sillón 2 cuerpos ×2, Refrigerador». */
export function resumenObjetos(objetos: readonly ObjetoConResiduo[]): string {
  return objetos
    .map((o) => {
      const nombre = o.residuoCatalogo?.nombre ?? o.nombreOtro ?? 'Objeto';
      return o.cantidad > 1 ? `${nombre} ×${o.cantidad}` : nombre;
    })
    .join(', ');
}

/** Categorías distintas, en el orden en que aparecen. */
export function categoriasObjetos(
  objetos: readonly ObjetoConResiduo[],
): string {
  const categorias = objetos
    .map((o) => o.residuoCatalogo?.categoria)
    .filter((c): c is string => !!c);
  return [...new Set(categorias)].join(', ');
}
