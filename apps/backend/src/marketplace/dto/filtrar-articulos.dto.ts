import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoArticuloMarketplace } from '../../core';
import type { BandaDistancia } from '../ubicacion/ubicacion-marketplace';
import { OrigenDto } from './origen.dto';

export const BANDAS_DISTANCIA: BandaDistancia[] = [
  'menos_1km',
  '1_5km',
  '5_10km',
  'mas_10km',
];

export class FiltrarArticulosDto extends OrigenDto {
  @IsOptional()
  @IsEnum(TipoArticuloMarketplace)
  tipo?: TipoArticuloMarketplace;

  /** Categoría del catálogo municipal (`residuos_catalogo.categoria`). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string;

  /** Busca en título y descripción. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  texto?: string;

  /** Solo artículos en esa banda. Requiere `lat` y `lon`. */
  @IsOptional()
  @IsIn(BANDAS_DISTANCIA)
  banda?: BandaDistancia;
}
