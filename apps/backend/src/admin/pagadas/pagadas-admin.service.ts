import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Repository } from 'typeorm';
import {
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  SolicitudRetiro,
} from '../../core';
import { LIMITE_EXPORTACION } from '../comun/exportar-tabla';
import { condicionRango } from '../comun/rango-fechas';
import {
  NOMBRES_SECTOR,
  SIN_UBICACION,
  sectorMasCercano,
} from '../mapa-calor/sectores.constants';
import type { FiltroPagadasDto } from './dto/filtro-pagadas.dto';

/**
 * Fila del listado de pagadas. Lista blanca: nada del vecino (ni id, ni
 * descripción) sale de acá; el mapeo copia campo por campo.
 */
export interface SolicitudPagada {
  id: number;
  fechaSolicitud: string;
  fechaRevision: string | null;
  estado: EstadoSolicitudRetiro;
  residuo: string;
  categoria: string;
  sector: string;
  direccion: string;
  monto: number | null;
}

/** Tope de filas de la vista; la exportación usa LIMITE_EXPORTACION. */
const LIMITE_VISTA = 1000;

// Único punto que cambia cuando exista el campo de `datos-retiro`.
export const direccionDe = (s: SolicitudRetiro): string =>
  s.direccionAnonimizada ?? '';

@Injectable()
export class PagadasAdminService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRepository: Repository<SolicitudRetiro>,
  ) {}

  findAll(filtro: FiltroPagadasDto = {}): Promise<SolicitudPagada[]> {
    return this.buscar(filtro, LIMITE_VISTA);
  }

  /** Mismos filtros que la vista, con el tope de la exportación. */
  exportar(filtro: FiltroPagadasDto): Promise<SolicitudPagada[]> {
    return this.buscar(filtro, LIMITE_EXPORTACION);
  }

  /** Opciones del filtro por sector, con «Sin ubicación» al final. */
  sectores(): string[] {
    return NOMBRES_SECTOR;
  }

  private async buscar(
    filtro: FiltroPagadasDto,
    take: number,
  ): Promise<SolicitudPagada[]> {
    const where: FindOptionsWhere<SolicitudRetiro> = {
      estadoPago: EstadoPagoSolicitud.PAGADO,
    };
    if (filtro.estado) where.estado = filtro.estado;
    const rango = condicionRango(filtro.desde, filtro.hasta);
    if (rango) where.fechaSolicitud = rango;

    const filas = await this.solicitudRepository.find({
      where,
      relations: { residuoCatalogo: true },
      order: { fechaSolicitud: 'DESC', id: 'DESC' },
      // ponytail: el sector no es columna; se filtra en memoria tras traer hasta
      // LIMITE_EXPORTACION. Si crece, guardar el sector al crear la solicitud.
      take: filtro.sector ? LIMITE_EXPORTACION : take,
    });

    return filas
      .map((s) => this.aPagada(s))
      .filter((p) => !filtro.sector || p.sector === filtro.sector)
      .slice(0, take);
  }

  private aPagada(s: SolicitudRetiro): SolicitudPagada {
    const lat = s.latitudCapturada;
    const lng = s.longitudCapturada;

    return {
      id: s.id,
      fechaSolicitud: s.fechaSolicitud.toISOString(),
      fechaRevision: s.fechaRevision?.toISOString() ?? null,
      estado: s.estado,
      residuo: s.residuoCatalogo?.nombre ?? `Residuo ${s.residuoCatalogoId}`,
      categoria: s.residuoCatalogo?.categoria ?? '',
      sector:
        !lat || !lng
          ? SIN_UBICACION
          : sectorMasCercano(parseFloat(lat), parseFloat(lng)).nombre,
      direccion: direccionDe(s),
      monto: s.monto,
    };
  }
}
