import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResiduosService } from '../residuos/residuos.service';
import { UsuarioCiudadano } from '../users/entities/usuario-ciudadano.entity';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { EstadoSolicitudRetiro } from './entities/estado-solicitud-retiro.enum';
import { SolicitudRetiro } from './entities/solicitud-retiro.entity';

@Injectable()
export class SolicitudesRetiroService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRetiroRepository: Repository<SolicitudRetiro>,
    @InjectRepository(UsuarioCiudadano)
    private readonly usuarioCiudadanoRepository: Repository<UsuarioCiudadano>,
    private readonly residuosService: ResiduosService,
  ) {}

  async create(dto: CreateSolicitudRetiroDto): Promise<SolicitudRetiro> {
    const usuario = await this.usuarioCiudadanoRepository.findOne({
      where: { id: dto.usuarioCiudadanoId },
    });

    if (!usuario) {
      throw new NotFoundException(
        `Usuario ciudadano ${dto.usuarioCiudadanoId} no encontrado`,
      );
    }

    if (!usuario.activo) {
      throw new BadRequestException('El usuario ciudadano no está activo');
    }

    const residuo = await this.residuosService.findCatalogoById(dto.residuoCatalogoId);

    if (!residuo) {
      throw new NotFoundException(
        `Residuo de catálogo ${dto.residuoCatalogoId} no encontrado`,
      );
    }

    const solicitud = this.solicitudRetiroRepository.create({
      usuarioCiudadanoId: dto.usuarioCiudadanoId,
      residuoCatalogoId: dto.residuoCatalogoId,
      descripcion: dto.descripcion ?? null,
      direccionAnonimizada: dto.direccionAnonimizada ?? null,
      latitudCapturada: dto.latitudCapturada ?? null,
      longitudCapturada: dto.longitudCapturada ?? null,
      fechaSolicitud: new Date(),
      estado: EstadoSolicitudRetiro.PENDIENTE,
    });

    return this.solicitudRetiroRepository.save(solicitud);
  }

  findAll(): Promise<SolicitudRetiro[]> {
    return this.solicitudRetiroRepository.find({
      relations: { residuoCatalogo: true },
      order: { fechaSolicitud: 'DESC' },
    });
  }

  findByUsuarioCiudadanoId(usuarioCiudadanoId: string): Promise<SolicitudRetiro[]> {
    return this.solicitudRetiroRepository.find({
      where: { usuarioCiudadanoId },
      relations: { residuoCatalogo: true },
      order: { fechaSolicitud: 'DESC' },
    });
  }
}
