/**
 * Tipo de acción registrada en auditoría.
 *
 * `ACCESO` no es lo mismo que `LOGIN`: `LOGIN` es entrar al sistema, `ACCESO`
 * es alcanzar datos sensibles ya estando dentro — descargar el reporte de
 * auditoría, por ejemplo. Esa distinción importa porque una descarga masiva de
 * datos personales tiene que quedar registrada aunque la persona ya estuviera
 * autenticada hace rato.
 */
export enum AccionAuditoria {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ACCESO = 'ACCESO',
  LOGIN = 'LOGIN',
}
