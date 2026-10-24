import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { type AuthUser, Notificacion } from '../core';
import { PushService } from '../push/push.service';
import { TiempoRealGateway } from '../tiempo-real/tiempo-real.gateway';

/** Avisos por página de la campanita. */
export const AVISOS_POR_PAGINA = 30;

/** Lo que genera cada evento: sin texto de mensajes ni datos de contacto. */
export interface NuevoAviso {
  tipo: string;
  titulo: string;
  cuerpo: string;
  url: string;
}

/** Lista blanca: nunca el id de ningún vecino. */
export interface AvisoPublico {
  id: number;
  tipo: string;
  titulo: string;
  cuerpo: string;
  url: string;
  leido: boolean;
  fecha: Date;
}

export interface ListaAvisos {
  avisos: AvisoPublico[];
  noLeidos: number;
  hayMas: boolean;
}

const aAvisoPublico = (n: Notificacion): AvisoPublico => ({
  id: n.id,
  tipo: n.tipo,
  titulo: n.titulo,
  cuerpo: n.cuerpo,
  url: n.url,
  leido: n.leidaEn !== null,
  fecha: n.createdAt,
});

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectRepository(Notificacion)
    private readonly repo: Repository<Notificacion>,
    private readonly gateway: TiempoRealGateway,
    private readonly pushService: PushService,
  ) {}

  /**
   * Guarda el aviso, lo empuja a las pestañas abiertas y, si no hay ninguna,
   * al celular. Nunca lanza: un aviso fallido no debe romper quien lo dispara.
   */
  async notificar(ciudadanoId: string, aviso: NuevoAviso): Promise<void> {
    try {
      const guardado = await this.repo.save(
        this.repo.create({
          usuarioCiudadanoId: ciudadanoId,
          tipo: aviso.tipo,
          titulo: aviso.titulo,
          cuerpo: aviso.cuerpo,
          url: aviso.url,
          leidaEn: null,
        }),
      );
      this.gateway.emitir(ciudadanoId, 'notificacion', aAvisoPublico(guardado));
      if (!this.gateway.estaConectado(ciudadanoId)) {
        void this.pushService.enviarA(ciudadanoId, {
          titulo: aviso.titulo,
          cuerpo: aviso.cuerpo,
          url: aviso.url,
          tag: `aviso-${guardado.id}`,
        });
      }
    } catch (error) {
      // Solo el tipo: el texto del aviso puede nombrar a un vecino.
      this.logger.error(
        `No se pudo crear el aviso ${aviso.tipo}: ${
          error instanceof Error ? error.name : 'error desconocido'
        }`,
      );
    }
  }

  async listar(user: AuthUser, antesDe?: number): Promise<ListaAvisos> {
    const yo = user.ciudadanoId;
    const [filas, noLeidos] = await Promise.all([
      this.repo.find({
        where: {
          usuarioCiudadanoId: yo,
          ...(antesDe ? { id: LessThan(antesDe) } : {}),
        },
        order: { id: 'DESC' },
        take: AVISOS_POR_PAGINA + 1,
      }),
      this.repo.count({ where: { usuarioCiudadanoId: yo, leidaEn: IsNull() } }),
    ]);
    return {
      avisos: filas.slice(0, AVISOS_POR_PAGINA).map(aAvisoPublico),
      noLeidos,
      hayMas: filas.length > AVISOS_POR_PAGINA,
    };
  }

  /** Marca como leídos todos los avisos del vecino. */
  async marcarLeidos(user: AuthUser): Promise<{ marcados: number }> {
    const { affected } = await this.repo.update(
      { usuarioCiudadanoId: user.ciudadanoId, leidaEn: IsNull() },
      { leidaEn: new Date() },
    );
    return { marcados: affected ?? 0 };
  }
}
