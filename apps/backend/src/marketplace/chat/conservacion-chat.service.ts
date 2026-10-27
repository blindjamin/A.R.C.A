import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccionAuditoria,
  AuditoriaService,
  EstadoArticuloMarketplace,
  InteresadoMarketplace,
  MensajeMarketplace,
  TipoActorAuditoria,
} from '../../core';

/**
 * Días que se conserva el chat de un artículo cerrado (completado o retirado)
 * o vencido sin entregar. Provisorio: lo confirma Miguel.
 */
export const DIAS_CONSERVACION_CHAT = 30;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Borra mensajes e intereses de los artículos cerrados o vencidos hace más de
 * `DIAS_CONSERVACION_CHAT` días. Corre al arrancar y una vez al día.
 *
 * Los mensajes pueden contener datos personales (direcciones, teléfonos):
 * cerrado el intercambio no tienen finalidad (Ley 21.719).
 */
@Injectable()
export class ConservacionChatService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ConservacionChatService.name);
  private temporizador: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(MensajeMarketplace)
    private readonly mensajes: Repository<MensajeMarketplace>,
    @InjectRepository(InteresadoMarketplace)
    private readonly intereses: Repository<InteresadoMarketplace>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  onApplicationBootstrap(): void {
    void this.ejecutar();
    this.temporizador = setInterval(() => void this.ejecutar(), UN_DIA_MS);
    // No mantiene vivo el proceso solo por esta tarea.
    this.temporizador.unref();
  }

  onApplicationShutdown(): void {
    if (this.temporizador) clearInterval(this.temporizador);
  }

  /** Devuelve cuántos mensajes e intereses se borraron. */
  async borrarChatsVencidos(
    ahora: Date = new Date(),
  ): Promise<{ mensajes: number; intereses: number }> {
    const limite = new Date(
      ahora.getTime() - DIAS_CONSERVACION_CHAT * UN_DIA_MS,
    );
    const condicion = `articulo_id IN (
      SELECT id FROM articulos_marketplace
      WHERE (estado IN (:...cerrados) AND updated_at < :limite)
         OR (estado = :disponible AND fecha_expiracion < :limite)
    )`;
    const parametros = {
      cerrados: [
        EstadoArticuloMarketplace.COMPLETADO,
        EstadoArticuloMarketplace.RETIRADO,
      ],
      disponible: EstadoArticuloMarketplace.DISPONIBLE,
      limite,
    };

    const { affected: m } = await this.mensajes
      .createQueryBuilder()
      .delete()
      .from(MensajeMarketplace)
      .where(condicion, parametros)
      .execute();
    const { affected: i } = await this.intereses
      .createQueryBuilder()
      .delete()
      .from(InteresadoMarketplace)
      .where(condicion, parametros)
      .execute();
    const borrados = { mensajes: m ?? 0, intereses: i ?? 0 };

    if (borrados.mensajes > 0 || borrados.intereses > 0) {
      // Constancia de que se aplicó el plazo, sin ids ni texto.
      await this.auditoriaService.registrar({
        tipoActor: TipoActorAuditoria.SISTEMA,
        entidad: 'mensajes_marketplace',
        accion: AccionAuditoria.DELETE,
        datosNuevos: { ...borrados, plazoDias: DIAS_CONSERVACION_CHAT },
      });
    }
    return borrados;
  }

  private async ejecutar(): Promise<void> {
    try {
      const { mensajes, intereses } = await this.borrarChatsVencidos();
      if (mensajes > 0 || intereses > 0) {
        this.logger.log(
          `Plazo de conservación: ${mensajes} mensajes y ${intereses} intereses borrados.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `No se pudo aplicar el plazo de conservación del chat: ${String(error)}`,
      );
    }
  }
}
