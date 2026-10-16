import { IsEnum, IsIn, IsISO8601, IsOptional } from 'class-validator';
import { EstadoSolicitudRetiro } from '../../../core';
import {
  FORMATOS_EXPORTACION,
  type FormatoExportacion,
} from '../../comun/exportar-tabla';
import { NOMBRES_SECTOR } from '../../mapa-calor/sectores.constants';

/**
 * Filtros del listado de solicitudes pagadas.
 *
 * `estado` es el del ciclo de la solicitud. `desde` y `hasta` son instantes
 * ISO, ambos inclusive: el panel los arma desde la fecha local del navegador,
 * así el backend no tiene que saber de zonas horarias. `sector` es uno de los
 * sectores provisionales o «Sin ubicación».
 */
export class FiltroPagadasDto {
  @IsOptional()
  @IsEnum(EstadoSolicitudRetiro)
  estado?: EstadoSolicitudRetiro;

  @IsOptional()
  @IsISO8601({ strict: true })
  desde?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  hasta?: string;

  @IsOptional()
  @IsIn(NOMBRES_SECTOR)
  sector?: string;
}

export class ExportarPagadasDto extends FiltroPagadasDto {
  @IsOptional()
  @IsIn(FORMATOS_EXPORTACION)
  formato?: FormatoExportacion;
}
