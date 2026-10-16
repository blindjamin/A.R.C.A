import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

/** Valores de `actor` que no son un funcionario puntual. */
export const ACTOR_VECINOS = 'vecinos';
export const ACTOR_SISTEMA = 'sistema';

/**
 * Filtros del registro de auditoría.
 *
 * `desde` y `hasta` son instantes ISO, ambos inclusive. El panel los arma desde
 * la fecha local del navegador (inicio y fin del día en Chile), así el backend
 * no tiene que saber de zonas horarias.
 *
 * `actor` es el id de un funcionario, `vecinos` o `sistema`. Los vecinos no se
 * filtran uno por uno: la auditoría no guarda su nombre (seudonimización), y
 * para seguir a uno puntual está el buscador por referencia en la pantalla.
 */
export class FiltroAuditoriaDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  desde?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  hasta?: string;

  @IsOptional()
  @Matches(
    new RegExp(`^(${ACTOR_VECINOS}|${ACTOR_SISTEMA}|[0-9a-fA-F-]{36})$`),
    { message: 'actor debe ser el id de un funcionario, vecinos o sistema' },
  )
  actor?: string;
}

export class ConsultaAuditoriaDto extends FiltroAuditoriaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limite?: number;
}

export const FORMATOS_EXPORTACION = ['csv', 'xlsx'] as const;
export type FormatoExportacion = (typeof FORMATOS_EXPORTACION)[number];

export class ExportarAuditoriaDto extends FiltroAuditoriaDto {
  @IsOptional()
  @IsIn(FORMATOS_EXPORTACION)
  formato?: FormatoExportacion;
}
