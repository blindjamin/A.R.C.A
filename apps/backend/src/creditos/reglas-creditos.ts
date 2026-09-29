/**
 * Reglas de Circular Credits (spec `marketplace` §7).
 *
 * VALORES DE PRUEBA, pendientes de la regla definitiva de Miguel: por ahora
 * todos los objetos valen lo mismo. La regla final será proporcional al precio
 * del catálogo (`residuos_catalogo.precio`) y reemplaza solo `creditosPorEntrega`.
 */

/** Créditos por objeto entregado entre vecinos. */
export const VALOR_BASE = 100;

/** Créditos que otorga la entrega de un objeto. */
export function creditosPorEntrega(): number {
  return VALOR_BASE;
}
