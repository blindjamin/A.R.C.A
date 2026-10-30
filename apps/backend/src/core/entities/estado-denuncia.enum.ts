/**
 * Estado de una denuncia entre vecinos (HU-16, HU-18). Los valores son los del
 * esquema (`docs/ARCA_database_schema.dbml`, tabla `denuncias`).
 */
export enum EstadoDenuncia {
  ABIERTA = 'abierta',
  INVESTIGACION = 'investigacion',
  RESUELTA = 'resuelta',
  RECHAZADA = 'rechazada',
}
