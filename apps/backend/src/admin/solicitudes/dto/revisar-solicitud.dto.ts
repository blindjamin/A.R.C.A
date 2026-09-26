import {
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  DECISIONES_REVISION,
  type DecisionRevision,
  MotivoRevision,
} from '@arca/core';

/**
 * Qué combinación de motivo, comentario y checklist exige cada decisión lo
 * valida `validarRevision` en `@arca/core`; acá solo se chequean los tipos.
 */
export class RevisarSolicitudDto {
  @IsIn(DECISIONES_REVISION)
  decision: DecisionRevision;

  @IsOptional()
  @IsEnum(MotivoRevision)
  motivo?: MotivoRevision;

  /** Lo ve el vecino. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;

  @IsOptional()
  @IsObject()
  checklist?: Record<string, boolean>;
}
