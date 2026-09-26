import { AccionAuditoria } from '../entities/accion-auditoria.enum';
import { TipoActorAuditoria } from '../entities/tipo-actor-auditoria.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

/**
 * Datos de la petición que acompañan a una acción auditada.
 *
 * Se pasan explícitamente en vez de leer el `Request` dentro del servicio: así
 * el servicio no depende de Express y las acciones que no vienen de una
 * petición HTTP (procesos automáticos) simplemente no los envían.
 */
export interface OrigenPeticion {
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Una acción a registrar en auditoría.
 *
 * `datosAnteriores` y `datosNuevos` llevan **solo el campo modificado**, nunca
 * la fila completa — ver la explicación en `auditoria.entity.ts`.
 */
export interface AccionAuditable {
  /** Con qué perfil actuó la persona. Lo fija el backend donde ocurre la acción. */
  tipoActor: TipoActorAuditoria;

  /** Identidad autenticada. Ausente en acciones del sistema. */
  actor?: AuthUser | null;

  /** Tabla afectada, en snake_case: `solicitudes_retiro`, `auditoria`, … */
  entidad: string;

  entidadId?: number | null;

  accion: AccionAuditoria;

  datosAnteriores?: Record<string, unknown> | null;

  datosNuevos?: Record<string, unknown> | null;

  origen?: OrigenPeticion;
}
