import { EstadoSolicitudRetiro } from '../entities/estado-solicitud-retiro.enum';
import { MotivoRevision } from '../entities/motivo-revision.enum';

/**
 * Reglas de una decisión de revisión (docs/specs/SPEC-revision-solicitudes.md).
 *
 * Complementan a `ciclo-solicitud`: aquel decide si el cambio de estado está
 * permitido; esta valida que la decisión venga con lo que necesita —motivo,
 * comentario o lista de verificación— para que el vecino sepa qué pasó y quede
 * registro de por qué.
 */

export type DecisionRevision =
  | EstadoSolicitudRetiro.APROBADA
  | EstadoSolicitudRetiro.REQUIERE_MODIFICACION
  | EstadoSolicitudRetiro.RECHAZADA;

export const DECISIONES_REVISION: readonly DecisionRevision[] = [
  EstadoSolicitudRetiro.APROBADA,
  EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
  EstadoSolicitudRetiro.RECHAZADA,
];

export const MOTIVOS_POR_DECISION: Readonly<
  Record<DecisionRevision, readonly MotivoRevision[]>
> = {
  [EstadoSolicitudRetiro.APROBADA]: [],
  [EstadoSolicitudRetiro.REQUIERE_MODIFICACION]: [
    MotivoRevision.FOTO_INSUFICIENTE,
    MotivoRevision.CATEGORIA_INCORRECTA,
    MotivoRevision.DESCRIPCION_INCOMPLETA,
    MotivoRevision.DIRECCION_INCOMPLETA,
    MotivoRevision.OTRO,
  ],
  [EstadoSolicitudRetiro.RECHAZADA]: [
    MotivoRevision.FUERA_DE_COMUNA,
    MotivoRevision.RESIDUO_NO_ADMITIDO,
    MotivoRevision.DUPLICADA,
    MotivoRevision.CONTENIDO_INAPROPIADO,
    MotivoRevision.OTRO,
  ],
};

export const ITEMS_CHECKLIST_APROBACION = [
  'foto_clara',
  'residuo_coincide',
  'volumen_razonable',
  'direccion_en_comuna',
  'no_duplicada',
] as const;

export type ItemChecklistAprobacion =
  (typeof ITEMS_CHECKLIST_APROBACION)[number];

export interface EntradaRevision {
  decision: DecisionRevision;
  motivo?: MotivoRevision | null;
  comentario?: string | null;
  checklist?: Record<string, boolean> | null;
}

export class RevisionInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'RevisionInvalidaError';
  }
}

/** Lanza `RevisionInvalidaError` si a la decisión le falta algo. */
export function validarRevision(entrada: EntradaRevision): void {
  const { decision, motivo, checklist } = entrada;
  const comentario = entrada.comentario?.trim() ?? '';

  if (!DECISIONES_REVISION.includes(decision)) {
    throw new RevisionInvalidaError(
      `"${String(decision)}" no es una decisión de revisión`,
    );
  }

  if (decision === EstadoSolicitudRetiro.APROBADA) {
    if (motivo) {
      throw new RevisionInvalidaError('Aprobar no lleva motivo');
    }

    const faltantes = ITEMS_CHECKLIST_APROBACION.filter(
      (item) => checklist?.[item] !== true,
    );
    if (faltantes.length > 0) {
      throw new RevisionInvalidaError(
        `Para aprobar falta verificar: ${faltantes.join(', ')}`,
      );
    }
    return;
  }

  if (!motivo) {
    throw new RevisionInvalidaError('La decisión requiere un motivo');
  }

  if (!MOTIVOS_POR_DECISION[decision].includes(motivo)) {
    throw new RevisionInvalidaError(
      `El motivo "${motivo}" no corresponde a la decisión "${decision}"`,
    );
  }

  const exigeComentario =
    decision === EstadoSolicitudRetiro.REQUIERE_MODIFICACION ||
    motivo === MotivoRevision.OTRO;

  if (exigeComentario && !comentario) {
    throw new RevisionInvalidaError(
      'La decisión requiere un comentario para el vecino',
    );
  }
}
