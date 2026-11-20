/**
 * Motivo de una decisión de revisión (spec `revision-solicitudes` §2.1).
 *
 * Se guarda el código, no un texto: la auditoría puede registrarlo sin copiar
 * nada escrito por una persona, y cada frontend pone su propia etiqueta.
 * Qué motivos admite cada decisión está en `MOTIVOS_POR_DECISION`.
 */
export enum MotivoRevision {
  // Pedir modificación
  FOTO_INSUFICIENTE = 'foto_insuficiente',
  CATEGORIA_INCORRECTA = 'categoria_incorrecta',
  DESCRIPCION_INCOMPLETA = 'descripcion_incompleta',
  DIRECCION_INCOMPLETA = 'direccion_incompleta',
  // Rechazar
  FUERA_DE_COMUNA = 'fuera_de_comuna',
  RESIDUO_NO_ADMITIDO = 'residuo_no_admitido',
  DUPLICADA = 'duplicada',
  CONTENIDO_INAPROPIADO = 'contenido_inapropiado',
  // Ambas
  OTRO = 'otro',
}
