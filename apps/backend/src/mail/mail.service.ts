import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import { ContactoCiudadano } from '../core/entities/contacto-ciudadano.entity';
import { generarHtmlCodigo, generarHtmlCambioEstado } from './mail-templates';

/** Códigos que una cuenta puede pedir por hora: el correo le llega a un tercero. */
export const TOPE_CODIGOS_POR_HORA = 10;
const MS_HORA = 60 * 60 * 1000;

interface OtpData {
  codigo: string;
  expira: number; // timestamp ms
  intentos: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  // Por cuenta y correo: pedir un código para el correo de otro no pisa el suyo.
  private readonly otps = new Map<string, OtpData>();
  private readonly codigosPedidos = new Map<string, number[]>(); // usuarioCiudadanoId -> timestamps

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ContactoCiudadano)
    private readonly contactos: Repository<ContactoCiudadano>,
  ) {
    this.inicializarTransporte();
  }

  private get enProduccion(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private claveOtp(email: string, usuarioCiudadanoId?: string): string {
    return `${usuarioCiudadanoId ?? ''}:${email}`;
  }

  /** Sin el destinatario ni el error completo: traen el correo del vecino. */
  private codigoDeError(error: unknown): string {
    return (error as { code?: string })?.code ?? 'desconocido';
  }

  private asegurarTopeDeCodigos(usuarioCiudadanoId?: string): void {
    if (!usuarioCiudadanoId) return;
    const desde = Date.now() - MS_HORA;
    const recientes = (
      this.codigosPedidos.get(usuarioCiudadanoId) ?? []
    ).filter((t) => t > desde);
    if (recientes.length >= TOPE_CODIGOS_POR_HORA) {
      throw new HttpException(
        'Pediste demasiados códigos. Espera un rato e inténtalo de nuevo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recientes.push(Date.now());
    this.codigosPedidos.set(usuarioCiudadanoId, recientes);
  }

  private inicializarTransporte() {
    const host =
      this.configService.get<string>('MAIL_HOST') || 'smtp.gmail.com';
    const port = Number(this.configService.get<string>('MAIL_PORT') || 465);
    const user =
      this.configService.get<string>('MAIL_USER') ||
      this.configService.get<string>('GMAIL_USER') ||
      'soporte.arcaa@gmail.com';
    const pass =
      this.configService.get<string>('MAIL_PASS') ||
      this.configService.get<string>('GMAIL_APP_PASSWORD');

    if (!pass) {
      this.logger.warn(
        this.enProduccion
          ? 'MAIL_PASS / GMAIL_APP_PASSWORD no configurado: en producción no se enviarán correos ni códigos de verificación.'
          : 'MAIL_PASS / GMAIL_APP_PASSWORD no configurado en entorno. Se utilizará modo SIMULACIÓN para el envío de correos.',
      );
      this.transporter = null;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('Servicio de correo inicializado con éxito');
    } catch (err) {
      this.logger.error(
        `Error al inicializar transporte de correo: ${this.codigoDeError(err)}`,
      );
      this.transporter = null;
    }
  }

  private obtenerAdjuntosLogo(): nodemailer.SendMailOptions['attachments'] {
    const candidatos = [
      path.resolve(__dirname, 'assets', 'logo.png'),
      path.resolve(__dirname, '..', '..', 'src', 'mail', 'assets', 'logo.png'),
      path.resolve(process.cwd(), 'src', 'mail', 'assets', 'logo.png'),
      path.resolve(process.cwd(), '..', 'frontend', 'public', 'icono-192.png'),
    ];

    for (const candidato of candidatos) {
      if (fs.existsSync(candidato)) {
        return [
          {
            filename: 'logo.png',
            path: candidato,
            cid: 'arcalogo',
          },
        ];
      }
    }
    return [];
  }

  /**
   * Genera un código OTP de 6 dígitos, lo almacena por 10 minutos y lo envía
   * por correo con la plantilla visual de A.R.C.A.
   *
   * `codigoDev` existe solo fuera de producción: entregarlo a quien lo pidió
   * anula la verificación. En producción, si no se pudo enviar, responde 503.
   */
  async enviarCodigo(
    email: string,
    usuarioCiudadanoId?: string,
  ): Promise<{ ok: boolean; mensaje: string; codigoDev?: string }> {
    this.asegurarTopeDeCodigos(usuarioCiudadanoId);
    const normalizado = email.trim().toLowerCase();
    const clave = this.claveOtp(normalizado, usuarioCiudadanoId);
    // Generar código de 6 dígitos numéricos
    const codigo = randomInt(100000, 1000000).toString();
    const expira = Date.now() + 10 * 60 * 1000; // 10 minutos

    this.otps.set(clave, { codigo, expira, intentos: 0 });

    const html = generarHtmlCodigo(codigo);
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      'A.R.C.A. Santo Domingo <soporte.arcaa@gmail.com>';

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to: normalizado,
          subject: `${codigo} es tu código de verificación — A.R.C.A. Santo Domingo`,
          html,
          attachments: this.obtenerAdjuntosLogo(),
        });
        this.logger.log('Código de verificación enviado por correo');
        return { ok: true, mensaje: 'Código enviado a tu correo' };
      } catch (error) {
        this.logger.error(
          `Error enviando código de verificación: ${this.codigoDeError(error)}`,
        );
        if (this.enProduccion) {
          this.otps.delete(clave);
          throw new ServiceUnavailableException(
            'No pudimos enviar el código. Inténtalo de nuevo en unos minutos.',
          );
        }
        // Fallback para no bloquear al usuario en desarrollo si falla SMTP
        return {
          ok: true,
          mensaje:
            'No se pudo conectar al servidor de correos, se generó código para desarrollo.',
          codigoDev: codigo,
        };
      }
    } else {
      if (this.enProduccion) {
        this.otps.delete(clave);
        this.logger.error('Código de verificación sin enviar: falta MAIL_PASS');
        throw new ServiceUnavailableException(
          'No pudimos enviar el código. Inténtalo de nuevo en unos minutos.',
        );
      }
      // Modo simulación / local
      this.logger.log('[MAIL DEV] Código de verificación generado');
      return {
        ok: true,
        mensaje: 'Código generado en modo desarrollo (simulado).',
        codigoDev: codigo,
      };
    }
  }

  /**
   * Valida el código de verificación ingresado por el vecino.
   */
  async verificarCodigo(
    email: string,
    codigo: string,
    usuarioCiudadanoId?: string,
  ): Promise<{ ok: boolean; verificado: boolean; mensaje: string }> {
    const normalizado = email.trim().toLowerCase();
    const clave = this.claveOtp(normalizado, usuarioCiudadanoId);
    const otp = this.otps.get(clave);

    if (!otp) {
      return {
        ok: false,
        verificado: false,
        mensaje:
          'No hay un código pendiente para este correo. Solicita uno nuevo.',
      };
    }

    if (Date.now() > otp.expira) {
      this.otps.delete(clave);
      return {
        ok: false,
        verificado: false,
        mensaje: 'El código ha expirado. Por favor solicita uno nuevo.',
      };
    }

    if (otp.codigo !== codigo.trim()) {
      otp.intentos += 1;
      if (otp.intentos >= 4) {
        this.otps.delete(clave);
        return {
          ok: false,
          verificado: false,
          mensaje: 'Demasiados intentos erróneos. Solicita un nuevo código.',
        };
      }
      return {
        ok: false,
        verificado: false,
        mensaje: 'El código ingresado es incorrecto.',
      };
    }

    // Código válido
    this.otps.delete(clave);

    if (usuarioCiudadanoId) {
      await this.guardarCorreoVerificado(usuarioCiudadanoId, normalizado);
    }

    return {
      ok: true,
      verificado: true,
      mensaje: 'Correo verificado exitosamente.',
    };
  }

  /**
   * Correo verificado del vecino. Vive en `contacto_ciudadano`: sobrevive al
   * reinicio y la baja borra la fila.
   */
  async obtenerCorreoCiudadano(
    usuarioCiudadanoId: string,
  ): Promise<string | null> {
    const contacto = await this.contactos.findOne({
      where: { usuarioCiudadanoId },
    });
    return contacto?.email ?? null;
  }

  private async guardarCorreoVerificado(
    usuarioCiudadanoId: string,
    email: string,
  ): Promise<void> {
    const contacto = await this.contactos.findOne({
      where: { usuarioCiudadanoId },
    });
    if (contacto) {
      contacto.email = email;
      await this.contactos.save(contacto);
      return;
    }
    await this.contactos.save(
      this.contactos.create({
        usuarioCiudadanoId,
        telefono: null,
        direccion: null,
        email,
      }),
    );
  }

  /**
   * Envía un correo con diseño visual A.R.C.A. al cambiar el estado de una solicitud.
   */
  async notificarCambioEstado(
    email: string,
    solicitud: {
      id: number;
      residuoNombre?: string;
      categoria?: string;
      direccion?: string | null;
      fechaSolicitud?: Date | string;
    },
    nuevoEstado: string,
    comentario?: string | null,
  ): Promise<boolean> {
    const normalizado = email.trim().toLowerCase();
    const html = generarHtmlCambioEstado(solicitud, nuevoEstado, comentario);
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      'A.R.C.A. Santo Domingo <soporte.arcaa@gmail.com>';

    if (!this.transporter) {
      this.logger.log(
        `[MAIL DEV] Notificación de estado '${nuevoEstado}' para solicitud #${solicitud.id}`,
      );
      return true;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: normalizado,
        subject: `Actualización de tu solicitud #${solicitud.id} — A.R.C.A. Santo Domingo`,
        html,
        attachments: this.obtenerAdjuntosLogo(),
      });
      this.logger.log(
        `Notificación de cambio de estado a '${nuevoEstado}' enviada para solicitud #${solicitud.id}`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Error al enviar correo de cambio de estado de solicitud #${solicitud.id}: ${this.codigoDeError(err)}`,
      );
      return false;
    }
  }
}
