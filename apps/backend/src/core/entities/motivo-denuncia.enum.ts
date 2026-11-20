/**
 * Motivo de una denuncia (HU-16). Lista cerrada: el texto libre va en la
 * descripción, que es opcional.
 */
export enum MotivoDenuncia {
  NO_SE_PRESENTO = 'no_se_presento',
  ARTICULO_DISTINTO = 'articulo_distinto',
  BASURA_ENCUBIERTA = 'basura_encubierta',
  PIDIO_DATOS_O_DINERO = 'pidio_datos_o_dinero',
  TRATO_OFENSIVO = 'trato_ofensivo',
  OTRO = 'otro',
}
