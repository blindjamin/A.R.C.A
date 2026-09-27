import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Correcciones del vecino al reenviar una solicitud que requiere
 * modificación. Ambas son opcionales: si lo pedido era otra cosa (por
 * ejemplo, una foto), puede reenviarla tal cual.
 */
export class ReenviarSolicitudRetiroDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  residuoCatalogoId?: number;
}
