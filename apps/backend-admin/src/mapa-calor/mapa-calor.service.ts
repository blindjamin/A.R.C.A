import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolicitudRetiro, EstadoSolicitudRetiro } from '@arca/core';
import {
  FilterMapaCalorDto,
  MetricaMapaCalor,
} from './dto/filter-mapa-calor.dto';
import {
  SECTORES_PROVISIONALES,
  MINIMO_SOLICITUDES_POR_SECTOR,
} from './sectores.constants';

export interface SectorAgregado {
  sector: string;
  lat: number;
  lng: number;
  total: number;
  pendientes: number;
  intensidad: 'alta' | 'media' | 'baja';
}

@Injectable()
export class MapaCalorService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRepository: Repository<SolicitudRetiro>,
  ) {}

  async getAgregacion(filtros: FilterMapaCalorDto): Promise<SectorAgregado[]> {
    const solicitudes = await this.solicitudRepository.find({
      select: {
        id: true,
        estado: true,
        latitudCapturada: true,
        longitudCapturada: true,
      },
    });

    const agrupados = new Map<string, { total: number; pendientes: number }>();
    SECTORES_PROVISIONALES.forEach((s) => {
      agrupados.set(s.nombre, { total: 0, pendientes: 0 });
    });

    const sinUbicacion = { total: 0, pendientes: 0 };

    for (const sol of solicitudes) {
      const isPendiente = [
        EstadoSolicitudRetiro.PENDIENTE,
        EstadoSolicitudRetiro.ASIGNADA,
        EstadoSolicitudRetiro.EN_PROCESO,
      ].includes(sol.estado);

      if (!sol.latitudCapturada || !sol.longitudCapturada) {
        sinUbicacion.total++;
        if (isPendiente) sinUbicacion.pendientes++;
        continue;
      }

      const lat = parseFloat(sol.latitudCapturada);
      const lng = parseFloat(sol.longitudCapturada);

      const sector = this.encontrarSectorMasCercano(lat, lng);

      const grupo = agrupados.get(sector.nombre);
      if (grupo) {
        grupo.total++;
        if (isPendiente) grupo.pendientes++;
      }
    }

    // Calcular valores efectivos aplicando el umbral de k-anonimato
    const sectoresCalculados = SECTORES_PROVISIONALES.map((s) => {
      const metricas = agrupados.get(s.nombre)!;
      // Si no supera el umbral y es mayor a 0, ocultamos los datos (forzamos 0) por privacidad
      if (
        metricas.total > 0 &&
        metricas.total < MINIMO_SOLICITUDES_POR_SECTOR
      ) {
        metricas.total = 0;
        metricas.pendientes = 0;
      }
      return {
        sector: s.nombre,
        lat: s.lat,
        lng: s.lng,
        total: metricas.total,
        pendientes: metricas.pendientes,
      };
    });

    // Calcular la intensidad relativa basada en la métrica solicitada
    const metricaKey =
      filtros.metrica === MetricaMapaCalor.PENDIENTES ? 'pendientes' : 'total';
    const valores = sectoresCalculados.map((s) => s[metricaKey]);
    const maxVal = Math.max(...valores, 1); // Evitar división por cero

    const umbralAlta = maxVal * 0.66;
    const umbralMedia = maxVal * 0.33;

    const resultados: SectorAgregado[] = sectoresCalculados.map((s) => {
      const val = s[metricaKey];
      let intensidad: 'alta' | 'media' | 'baja' = 'baja';
      if (val > 0) {
        if (val >= umbralAlta) intensidad = 'alta';
        else if (val >= umbralMedia) intensidad = 'media';
      }

      return {
        ...s,
        intensidad,
      };
    });

    // Agregamos un registro ficticio para representar los sin ubicación,
    // con coordenadas inválidas/nulas en el cliente, o simplemente como un registro extra.
    // El frontend debe ignorarlo en el mapa y mostrarlo en totales si es necesario,
    // pero el contrato exige lat/lng. Si los mandamos en nulo y el frontend tipa como number, fallará.
    // Lo mejor es reportarlo como un "sector" especial con lat/lng en 0.
    if (sinUbicacion.total > 0) {
      resultados.push({
        sector: 'Sin Ubicación',
        lat: 0,
        lng: 0,
        total: sinUbicacion.total,
        pendientes: sinUbicacion.pendientes,
        intensidad: 'baja',
      });
    }

    return resultados;
  }

  private encontrarSectorMasCercano(lat: number, lng: number) {
    let minDist = Infinity;
    let sectorCercano = SECTORES_PROVISIONALES[0];

    for (const sector of SECTORES_PROVISIONALES) {
      const dLat = sector.lat - lat;
      const dLng = sector.lng - lng;
      // Usamos distancia euclidiana simple por ser áreas muy cercanas
      const dist = dLat * dLat + dLng * dLng;
      if (dist < minDist) {
        minDist = dist;
        sectorCercano = sector;
      }
    }
    return sectorCercano;
  }
}
