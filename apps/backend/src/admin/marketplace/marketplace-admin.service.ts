import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccionAuditoria,
  ArticuloMarketplace,
  AuditoriaService,
  type AuthUser,
  EstadoArticuloMarketplace,
  type OrigenPeticion,
  TipoActorAuditoria,
} from '../../core';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';
import { creditosPorEntrega } from '../../creditos/reglas-creditos';
import { AprobarArticuloDto } from './dto/aprobar-articulo.dto';
import { RechazarArticuloDto } from './dto/rechazar-articulo.dto';

export interface ArticuloModeracionDetalle {
  id: number;
  titulo: string;
  descripcion: string | null;
  tipo: string;
  estado: EstadoArticuloMarketplace;
  nombreResiduo: string;
  nombreResiduoOtro: string | null;
  publicador: {
    id: string;
    nombre: string;
  };
  fotoUrl: string | null;
  fechaPublicacion: Date;
  motivoRechazo: string | null;
  creditosSugeridos: number;
}

@Injectable()
export class MarketplaceAdminService {
  constructor(
    @InjectRepository(ArticuloMarketplace)
    private readonly articuloRepository: Repository<ArticuloMarketplace>,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async findPendientes(): Promise<ArticuloModeracionDetalle[]> {
    const articulos = await this.articuloRepository.find({
      where: { estado: EstadoArticuloMarketplace.PENDIENTE_APROBACION },
      relations: { residuoCatalogo: true, usuarioPublicador: true },
      order: { fechaPublicacion: 'ASC' },
    });

    return articulos.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      descripcion: a.descripcion,
      tipo: a.tipo,
      estado: a.estado,
      nombreResiduo:
        a.residuoCatalogo?.nombre ?? a.nombreResiduoOtro ?? 'Residuo general',
      nombreResiduoOtro: a.nombreResiduoOtro,
      publicador: {
        id: a.usuarioPublicadorId,
        nombre: 'Vecino de Santo Domingo',
      },
      fotoUrl: a.fotoPath ? `/api/marketplace/articulos/${a.id}/foto` : null,
      fechaPublicacion: a.fechaPublicacion,
      motivoRechazo: a.motivoRechazo,
      creditosSugeridos: creditosPorEntrega(),
    }));
  }

  async conteoPendientes(): Promise<{ pendientes: number }> {
    const conteo = await this.articuloRepository.count({
      where: { estado: EstadoArticuloMarketplace.PENDIENTE_APROBACION },
    });
    return { pendientes: conteo };
  }

  async aprobar(
    id: number,
    dto: AprobarArticuloDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<ArticuloMarketplace> {
    const articulo = await this.articuloRepository.findOne({
      where: { id },
      relations: { usuarioPublicador: true },
    });

    if (!articulo) {
      throw new NotFoundException(`Artículo ${id} no encontrado`);
    }

    if (articulo.estado !== EstadoArticuloMarketplace.PENDIENTE_APROBACION) {
      throw new BadRequestException(
        `Solo se pueden aprobar artículos en estado pendiente_aprobacion. Estado actual: ${articulo.estado}`,
      );
    }

    const creditosFinales = dto.creditos ?? creditosPorEntrega();
    const estadoAnterior = articulo.estado;
    articulo.estado = EstadoArticuloMarketplace.DISPONIBLE;
    articulo.creditos = creditosFinales;
    articulo.moderadoPorId = user.administradorId ?? null;
    articulo.fechaModeracion = new Date();
    articulo.motivoRechazo = null;

    const guardado = await this.articuloRepository.save(articulo);

    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'articulos_marketplace',
      entidadId: id,
      accion: AccionAuditoria.UPDATE,
      datosAnteriores: { estado: estadoAnterior },
      datosNuevos: {
        estado: EstadoArticuloMarketplace.DISPONIBLE,
        creditos: creditosFinales,
        moderadoPorId: user.administradorId,
      },
      origen,
    });

    // Notificar al vecino
    void this.notificaciones.notificar(articulo.usuarioPublicadorId, {
      tipo: 'marketplace_aprobado',
      titulo: 'Publicación aprobada',
      cuerpo: `Tu publicación «${articulo.titulo}» fue aprobada con ${creditosFinales} Circular Credits y ya está disponible en el Marketplace.`,
      url: `/marketplace/${articulo.id}`,
    });

    return guardado;
  }

  async rechazar(
    id: number,
    dto: RechazarArticuloDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<ArticuloMarketplace> {
    const articulo = await this.articuloRepository.findOne({
      where: { id },
      relations: { usuarioPublicador: true },
    });

    if (!articulo) {
      throw new NotFoundException(`Artículo ${id} no encontrado`);
    }

    if (articulo.estado !== EstadoArticuloMarketplace.PENDIENTE_APROBACION) {
      throw new BadRequestException(
        `Solo se pueden rechazar artículos en estado pendiente_aprobacion. Estado actual: ${articulo.estado}`,
      );
    }

    const estadoAnterior = articulo.estado;
    articulo.estado = EstadoArticuloMarketplace.RECHAZADO;
    articulo.motivoRechazo = dto.motivo.trim();
    articulo.moderadoPorId = user.administradorId ?? null;
    articulo.fechaModeracion = new Date();

    const guardado = await this.articuloRepository.save(articulo);

    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'articulos_marketplace',
      entidadId: id,
      accion: AccionAuditoria.UPDATE,
      datosAnteriores: { estado: estadoAnterior },
      datosNuevos: {
        estado: EstadoArticuloMarketplace.RECHAZADO,
        motivoRechazo: dto.motivo.trim(),
        moderadoPorId: user.administradorId,
      },
      origen,
    });

    // Notificar al vecino
    void this.notificaciones.notificar(articulo.usuarioPublicadorId, {
      tipo: 'marketplace_rechazado',
      titulo: 'Publicación no aprobada',
      cuerpo: `Tu publicación «${articulo.titulo}» no fue aprobada: ${dto.motivo.trim()}`,
      url: `/mis-publicaciones`,
    });

    return guardado;
  }
}
