import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  type ActorCiclo,
  type AuthUser,
  RevisionInvalidaError,
  RolAdministrador,
  type SolicitudRetiro,
  TransicionInvalidaError,
} from '@arca/core';

/**
 * Campos de la solicitud que se auditan cuando cambian.
 *
 * La lista es explícita a propósito: si mañana se agrega una columna con datos
 * personales del vecino, no entra sola al registro de auditoría. Cualquier
 * campo nuevo se suma acá de forma deliberada.
 */
const CAMPOS_AUDITADOS = [
  'estado',
  'estadoPago',
  'monto',
  'revisadoPorId',
  'fechaCierre',
  'residuoCatalogoId',
] as const;

type CampoAuditado = (typeof CAMPOS_AUDITADOS)[number];

/** Fotografía de los campos auditados, para comparar antes y después. */
export type Fotografia = Record<CampoAuditado, unknown>;

// mysql2 puede devolver la fecha como Date o como texto según la conexión.
const fechaIso = (fecha: Date | string | null): string | null =>
  fecha ? new Date(fecha).toISOString() : null;

export function fotografiar(solicitud: SolicitudRetiro): Fotografia {
  return {
    estado: solicitud.estado,
    estadoPago: solicitud.estadoPago,
    monto: solicitud.monto,
    revisadoPorId: solicitud.revisadoPorId,
    fechaCierre: fechaIso(solicitud.fechaCierre),
    residuoCatalogoId: solicitud.residuoCatalogoId,
  };
}

/**
 * Devuelve solo los campos que efectivamente cambiaron.
 *
 * Es la regla de minimización aplicada: la auditoría guarda el campo
 * modificado, nunca la fila completa. Así los datos personales del vecino
 * —descripción, coordenadas— nunca se copian a un registro que después no se
 * puede borrar.
 */
export function diferencias(
  antes: Fotografia,
  despues: Fotografia,
): { anteriores: Record<string, unknown>; nuevos: Record<string, unknown> } {
  const anteriores: Record<string, unknown> = {};
  const nuevos: Record<string, unknown> = {};

  for (const campo of CAMPOS_AUDITADOS) {
    if (antes[campo] !== despues[campo]) {
      anteriores[campo] = antes[campo];
      nuevos[campo] = despues[campo];
    }
  }

  return { anteriores, nuevos };
}

/** `RolesGuard` ya garantiza que la sesión es admin o funcionario. */
export function actorDe(user: AuthUser): ActorCiclo {
  return user.rol === RolAdministrador.ADMIN ? 'admin' : 'funcionario';
}

/** Traduce los errores de reglas del núcleo a respuestas HTTP. */
export function comoHttp(error: unknown): unknown {
  if (error instanceof TransicionInvalidaError) {
    return error.motivo === 'actor'
      ? new ForbiddenException(error.message)
      : new BadRequestException(error.message);
  }
  if (error instanceof RevisionInvalidaError) {
    return new BadRequestException(error.message);
  }
  return error;
}
