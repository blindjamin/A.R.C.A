import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoDenuncia } from '../../../core';

/** Estados a los que el funcionario puede mover una denuncia (HU-18). */
export const ESTADOS_DESTINO = [
  EstadoDenuncia.INVESTIGACION,
  EstadoDenuncia.RESUELTA,
  EstadoDenuncia.RECHAZADA,
] as const;

export class CambiarEstadoDenunciaDto {
  @IsIn(ESTADOS_DESTINO)
  estado: (typeof ESTADOS_DESTINO)[number];

  /** Obligatoria al resolver o rechazar; la exige el servicio. */
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @MaxLength(500)
  resolucion?: string;
}
