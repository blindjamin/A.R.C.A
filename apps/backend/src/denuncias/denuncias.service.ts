import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import {
  AccionAuditoria,
  ArticuloMarketplace,
  AuditoriaService,
  type AuthUser,
  Denuncia,
  InteresadoMarketplace,
  type MensajeAdjunto,
  MensajeMarketplace,
  type OrigenPeticion,
  TipoActorAuditoria,
} from '../core';
import { esVisiblePara, recortar } from '../marketplace/articulo-publico';
import type { CrearDenunciaDto } from './dto/crear-denuncia.dto';
import {
  type DenunciaPropia,
  ESTADOS_ABIERTOS,
  LARGO_MENSAJE_ADJUNTO,
  TOPE_DENUNCIAS_POR_DIA,
} from './reglas-denuncias';

const MS_DIA = 24 * 60 * 60 * 1000;
const SOLO_TU_CONVERSACION =
  'Solo se pueden adjuntar mensajes de tu conversación';

@Injectable()
export class DenunciasService {
  constructor(
    @InjectRepository(Denuncia)
    private readonly denunciaRepo: Repository<Denuncia>,
    @InjectRepository(ArticuloMarketplace)
    private readonly articuloRepo: Repository<ArticuloMarketplace>,
    @InjectRepository(InteresadoMarketplace)
    private readonly interesadoRepo: Repository<InteresadoMarketplace>,
    @InjectRepository(MensajeMarketplace)
    private readonly mensajeRepo: Repository<MensajeMarketplace>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  ahora = (): Date => new Date();

  /**
   * Registra la denuncia (HU-16). El denunciado se deduce: si denuncia quien
   * publicó, es el interesado de la conversación indicada; si no, es quien
   * publicó.
   */
  async crear(
    dto: CrearDenunciaDto,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<{ id: number }> {
    const yo = user.ciudadanoId;
    const ahora = this.ahora();
    const articulo = await this.articuloRepo.findOne({
      where: { id: dto.articuloId },
    });
    if (!articulo) {
      throw new NotFoundException(`Artículo ${dto.articuloId} no encontrado`);
    }

    // `interesadoId` fija la conversación: los mensajes adjuntos tienen que ser de ella.
    let denunciadoId: string;
    let interesadoId: string | null;
    if (articulo.usuarioPublicadorId === yo) {
      if (dto.conversacion === undefined) {
        throw new BadRequestException('Indica a qué vecino denuncias');
      }
      const fila = await this.interesadoRepo.findOne({
        where: { id: dto.conversacion, articuloId: articulo.id },
      });
      if (!fila) throw new NotFoundException('Conversación no encontrada');
      denunciadoId = fila.usuarioInteresadoId;
      interesadoId = fila.usuarioInteresadoId;
    } else {
      const fila = await this.interesadoRepo.findOne({
        where: { articuloId: articulo.id, usuarioInteresadoId: yo },
      });
      if (!fila && !esVisiblePara(articulo, yo, ahora)) {
        throw new NotFoundException(`Artículo ${dto.articuloId} no encontrado`);
      }
      denunciadoId = articulo.usuarioPublicadorId;
      interesadoId = fila ? yo : null;
    }
    if (denunciadoId === yo) {
      throw new ForbiddenException('No puedes denunciarte a ti mismo');
    }

    const repetida = await this.denunciaRepo.count({
      where: {
        usuarioDenuncianteId: yo,
        usuarioDenunciadoId: denunciadoId,
        articuloId: articulo.id,
        estado: In(ESTADOS_ABIERTOS),
      },
    });
    if (repetida > 0) {
      throw new ConflictException(
        'Ya tienes una denuncia abierta por este intercambio. La Municipalidad la está revisando.',
      );
    }
    const hoy = await this.denunciaRepo.count({
      where: {
        usuarioDenuncianteId: yo,
        fechaDenuncia: MoreThan(new Date(ahora.getTime() - MS_DIA)),
      },
    });
    if (hoy >= TOPE_DENUNCIAS_POR_DIA) {
      throw new HttpException(
        `Llegaste al máximo de ${TOPE_DENUNCIAS_POR_DIA} denuncias por día. Si es urgente, llama a la Municipalidad.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const mensajesAdjuntos = await this.copiarMensajes(
      dto.mensajes ?? [],
      articulo.id,
      interesadoId,
      yo,
    );

    const denuncia = await this.denunciaRepo.save(
      this.denunciaRepo.create({
        usuarioDenuncianteId: yo,
        usuarioDenunciadoId: denunciadoId,
        articuloId: articulo.id,
        motivo: dto.motivo,
        descripcion: dto.descripcion ?? null,
        origen: dto.origen,
        mensajesAdjuntos,
        fechaDenuncia: ahora,
      }),
    );

    // Sin la descripción ni los mensajes: la auditoría no copia lo que escribió el vecino.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: user,
      entidad: 'denuncias',
      entidadId: denuncia.id,
      accion: AccionAuditoria.CREATE,
      datosNuevos: {
        articuloId: articulo.id,
        motivo: dto.motivo,
        origen: dto.origen,
        mensajesAdjuntos: mensajesAdjuntos?.length ?? 0,
      },
      origen,
    });
    return { id: denuncia.id };
  }

  /** Denuncias que hizo el vecino, con su estado (HU-16). */
  async mias(user: AuthUser): Promise<DenunciaPropia[]> {
    const filas = await this.denunciaRepo.find({
      where: { usuarioDenuncianteId: user.ciudadanoId },
      relations: { articulo: true },
      order: { fechaDenuncia: 'DESC' },
    });
    return filas.map((d) => ({
      id: d.id,
      articuloId: d.articuloId,
      articuloTitulo: d.articulo?.titulo ?? null,
      motivo: d.motivo,
      origen: d.origen,
      estado: d.estado,
      fechaDenuncia: d.fechaDenuncia,
      fechaResolucion: d.fechaResolucion,
    }));
  }

  /**
   * Copia los mensajes adjuntos. Solo valen los de la conversación del
   * artículo entre el denunciante y el denunciado.
   */
  private async copiarMensajes(
    ids: number[],
    articuloId: number,
    interesadoId: string | null,
    yo: string,
  ): Promise<MensajeAdjunto[] | null> {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) return null;
    if (interesadoId === null) {
      throw new BadRequestException(SOLO_TU_CONVERSACION);
    }
    const mensajes = await this.mensajeRepo.find({
      where: { id: In(unicos), articuloId, interesadoId },
      order: { id: 'ASC' },
    });
    if (mensajes.length !== unicos.length) {
      throw new BadRequestException(SOLO_TU_CONVERSACION);
    }
    return mensajes.map((m) => ({
      deQuien: m.usuarioRemitenteId === yo ? 'denunciante' : 'denunciado',
      contenido: recortar(m.contenido, LARGO_MENSAJE_ADJUNTO),
      fecha: m.fechaMensaje.toISOString(),
    }));
  }
}
