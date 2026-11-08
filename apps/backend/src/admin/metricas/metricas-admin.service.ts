import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { LoteDerivacion, RevisionSolicitud, SolicitudRetiro } from '../../core';
import {
  calcularMetricas,
  type Metricas,
  type RangoDias,
} from './calcular-metricas';
import {
  DIAS_MAXIMO_REPORTE,
  calcularReporte,
  diasDelRango,
  type ReporteGestion,
} from './calcular-reporte';

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

  /**
   * Reporte para el selector de fechas (HU-09). Solicitudes recibidas, retiros
   * realizados, objetos por categoría y monto recaudado. Sin vecino, dirección
   * ni contacto. La pantalla la arma el frontend.
   */
  async reporte(desdeIso: string, hastaIso: string): Promise<ReporteGestion> {
    const desde = desdeIso.slice(0, 10);
    const hasta = hastaIso.slice(0, 10);
    const dias = diasDelRango(desde, hasta);
    if (dias === null || dias > DIAS_MAXIMO_REPORTE) {
      throw new BadRequestException(
        'El rango de fechas no es válido o supera un año.',
      );
    }

    const inicio = new Date(`${desde}T00:00:00`);
    const fin = new Date(`${hasta}T00:00:00`);
    fin.setDate(fin.getDate() + 1);

    const solicitudes = await this.solicitudRetiroRepository.find({
      where: { fechaSolicitud: Between(inicio, fin) },
      select: {
        monto: true,
        estado: true,
        estadoPago: true,
        fechaSolicitud: true,
        residuoCatalogo: { id: true, categoria: true },
        objetos: {
          id: true,
          cantidad: true,
          residuoCatalogo: { id: true, categoria: true },
        },
      },
      relations: { residuoCatalogo: true, objetos: { residuoCatalogo: true } },
    });

    return calcularReporte(
      solicitudes.map((solicitud) => ({
        fechaSolicitud: solicitud.fechaSolicitud,
        estado: solicitud.estado,
        estadoPago: solicitud.estadoPago,
        monto: solicitud.monto,
        objetos: solicitud.objetos?.length
          ? solicitud.objetos.map((objeto) => ({
              categoria: objeto.residuoCatalogo?.categoria ?? null,
              cantidad: objeto.cantidad,
            }))
          : [
              {
                categoria: solicitud.residuoCatalogo?.categoria ?? null,
                cantidad: 1,
              },
            ],
      })),
      desde,
      hasta,
    );
  }
}
