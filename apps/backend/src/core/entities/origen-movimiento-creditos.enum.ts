/** De dónde sale un movimiento de Circular Credits (spec `marketplace` §7). */
export enum OrigenMovimientoCreditos {
  /** Entrega confirmada entre vecinos. */
  ENTREGA = 'entrega',
  /** Bono por una calificación de 4 o 5 estrellas. */
  ESTRELLAS = 'estrellas',
  /** Retiro municipal: se otorga al pagarse la solicitud. */
  RETIRADA = 'retirada',
  AJUSTE = 'ajuste',
}
