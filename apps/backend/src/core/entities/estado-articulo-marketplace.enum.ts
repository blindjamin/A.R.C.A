/**
 * Estado de un artículo del Marketplace (spec `marketplace` §4).
 *
 * Vencer no es un estado: un artículo `disponible` con `fecha_expiracion`
 * pasada simplemente deja de listarse.
 */
export enum EstadoArticuloMarketplace {
  DISPONIBLE = 'disponible',
  /** Un vecino presionó "Lo quiero"; queda en `usuario_comprador_id`. */
  EN_NEGOCIACION = 'en_negociacion',
  /** Quien publicó lo sacó del Marketplace sin entregarlo. */
  RETIRADO = 'retirado',
  /** Entregado a quien lo reservó. */
  COMPLETADO = 'completado',
}
