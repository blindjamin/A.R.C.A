/** De dónde sale un movimiento de Circular Credits (spec `marketplace` §7). */
export enum OrigenMovimientoCreditos {
  /** Entrega confirmada entre vecinos. */
  ENTREGA = 'entrega',
  /** Bono por una calificación de 4 o 5 estrellas. */
  ESTRELLAS = 'estrellas',
  /** Solicitud de retiro que llegó a `retirada`. */
  RETIRADA = 'retirada',
  AJUSTE = 'ajuste',
}
