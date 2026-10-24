import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import webpush from 'web-push';
import { Repository } from 'typeorm';
import { type AuthUser, SuscripcionPush } from '../core';
import type { SuscripcionPushDto } from './dto/suscripcion-push.dto';

/**
 * Servicios push de los navegadores. web-push hace un POST al `endpoint` que
 * manda el cliente: sin esta lista, un vecino podría hacer que el servidor
 * llame a cualquier dirección (SSRF).
 */
export const HOSTS_PUSH_PERMITIDOS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  '.push.apple.com',
  '.notify.windows.com',
];

export function esEndpointPermitido(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    url.port === '' &&
    url.username === '' &&
    url.password === '' &&
    HOSTS_PUSH_PERMITIDOS.some((h) =>
      h.startsWith('.') ? url.hostname.endsWith(h) : url.hostname === h,
    )
  );
}

/** Por vecino; el más antiguo se borra al pasar el tope. */
export const MAXIMO_SUSCRIPCIONES = 5;

export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  url: string;
  tag: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly clavePublica: string | null;

  constructor(
    @InjectRepository(SuscripcionPush)
    private readonly repo: Repository<SuscripcionPush>,
  ) {
    const publica = process.env.VAPID_PUBLIC_KEY;
    const privada = process.env.VAPID_PRIVATE_KEY;
    const asunto = process.env.VAPID_SUBJECT;
    if (!publica || !privada || !asunto) {
      this.logger.log(
        'Notificaciones push deshabilitadas: faltan claves VAPID',
      );
      this.clavePublica = null;
      return;
    }
    try {
      webpush.setVapidDetails(asunto, publica, privada);
      this.clavePublica = publica;
    } catch {
      this.logger.error('Claves VAPID inválidas: push deshabilitado');
      this.clavePublica = null;
    }
  }

  clavePublicaVapid(): string | null {
    return this.clavePublica;
  }

  async suscribir(user: AuthUser, dto: SuscripcionPushDto): Promise<void> {
    if (!esEndpointPermitido(dto.endpoint)) {
      throw new BadRequestException('Servicio de notificaciones no admitido');
    }
    if (this.clavePublica === null) {
      throw new ConflictException('Las notificaciones no están habilitadas');
    }

    // Upsert atómico sobre el índice único de endpoint: si otro vecino usó el
    // dispositivo, se reasigna, y dos altas simultáneas no chocan.
    await this.repo.upsert(
      {
        usuarioCiudadanoId: user.ciudadanoId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      ['endpoint'],
    );

    const propias = await this.repo.find({
      where: { usuarioCiudadanoId: user.ciudadanoId },
      order: { id: 'DESC' },
      select: { id: true },
    });
    if (propias.length > MAXIMO_SUSCRIPCIONES) {
      await this.repo.delete(
        propias.slice(MAXIMO_SUSCRIPCIONES).map((s) => s.id),
      );
    }
  }

  async desuscribir(user: AuthUser, endpoint: string): Promise<void> {
    await this.repo.delete({
      endpoint,
      usuarioCiudadanoId: user.ciudadanoId,
    });
  }

  /** Nunca lanza: un aviso fallido no debe romper quien lo dispara. */
  async enviarA(ciudadanoId: string, aviso: AvisoPush): Promise<void> {
    if (this.clavePublica === null) return;
    try {
      const suscripciones = await this.repo.find({
        where: { usuarioCiudadanoId: ciudadanoId },
      });
      const carga = JSON.stringify(aviso);
      await Promise.all(
        suscripciones.map(async (s) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
              },
              carga,
              { TTL: 86_400, urgency: 'high', timeout: 5_000 },
            );
          } catch (e) {
            const estado = (e as { statusCode?: number }).statusCode;
            if (estado === 404 || estado === 410) {
              await this.repo.delete({ id: s.id });
            } else {
              // Sin el endpoint: es una URL-capacidad.
              this.logger.warn(
                `Push falló con estado ${estado ?? 'desconocido'}`,
              );
            }
          }
        }),
      );
    } catch {
      this.logger.warn('Push falló al leer las suscripciones');
    }
  }
}
