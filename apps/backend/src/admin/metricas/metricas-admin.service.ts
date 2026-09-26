import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoteDerivacion, RevisionSolicitud, SolicitudRetiro } from '@arca/core';
import {
  calcularMetricas,
  type Metricas,
  type RangoDias,
} from './calcular-metricas';

/**
 * Indicadores del panel (spec `dashboard-metricas`). Lee solo las columnas que
 * necesita el cálculo: nada de descripción, dirección ni vecino.
 */
@Injectable()
export class MetricasAdminService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRetiroRepository: Repository<SolicitudRetiro>,
    @InjectRepository(RevisionSolicitud)
    private readonly revisionRepository: Repository<RevisionSolicitud>,
    @InjectRepository(LoteDerivacion)
    private readonly loteRepository: Repository<LoteDerivacion>,
  ) {}

  async obtener(dias: RangoDias): Promise<Metricas> {
    const [solicitudes, revisiones, lotes] = await Promise.all([
      this.solicitudRetiroRepository.find({
        select: {
          id: true,
          estado: true,
          estadoPago: true,
          monto: true,
          fechaSolicitud: true,
          fechaCierre: true,
          residuoCatalogo: { id: true, categoria: true },
        },
        relations: { residuoCatalogo: true },
      }),
      this.revisionRepository.find({
        select: {
          solicitudRetiroId: true,
          decision: true,
          motivo: true,
          createdAt: true,
        },
      }),
      this.loteRepository.find({ select: { cantidad: true, createdAt: true } }),
    ]);

    return calcularMetricas(
      {
        solicitudes: solicitudes.map((s) => ({
          id: s.id,
          estado: s.estado,
          estadoPago: s.estadoPago,
          monto: s.monto,
          fechaSolicitud: s.fechaSolicitud,
          fechaCierre: s.fechaCierre,
          categoria: s.residuoCatalogo?.categoria ?? null,
        })),
        revisiones,
        lotes,
      },
      dias,
      new Date(),
    );
  }
}
