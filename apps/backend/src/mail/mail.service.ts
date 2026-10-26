import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import { SesionCiudadano } from '../core/entities/sesion-ciudadano.entity';
import {
  generarHtmlCodigo,
  generarHtmlCambioEstado,
  generarHtmlPerfilActualizado,
} from './mail-templates';

interface OtpData {
  codigo: string;
  expira: number; // timestamp ms
  intentos: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly otps = new Map<string, OtpData>(); // email normalizado -> OtpData
  private readonly emailsVerificados = new Map<string, string>(); // usuarioCiudadanoId -> email verificado

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(SesionCiudadano)
    private readonly sesionCiudadanoRepository: Repository<SesionCiudadano>,
  ) {
    this.inicializarTransporte();
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
        'MAIL_PASS / GMAIL_APP_PASSWORD no configurado en entorno. Se utilizará modo SIMULACIÓN para el envío de correos.',
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
      this.logger.log(
        `Servicio de correo inicializado con éxito usando: ${user}`,
      );
    } catch (err) {
      this.logger.error('Error al inicializar transporte de correo:', err);
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
   */
  async enviarCodigo(
    email: string,
    usuarioCiudadanoId?: string,
  ): Promise<{ ok: boolean; mensaje: string; codigoDev?: string }> {
    if (usuarioCiudadanoId) {
      this.logger.debug(
        `Código solicitado para ciudadano: ${usuarioCiudadanoId}`,
      );
    }
    const normalizado = email.trim().toLowerCase();
    // Generar código de 6 dígitos numéricos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = Date.now() + 10 * 60 * 1000; // 10 minutos

    this.otps.set(normalizado, { codigo, expira, intentos: 0 });

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
        this.logger.log(
          `Código de verificación enviado por email a: ${normalizado}`,
        );
        return { ok: true, mensaje: 'Código enviado a tu correo' };
      } catch (error) {
        this.logger.error(`Error enviando correo a ${normalizado}:`, error);
        // Fallback para no bloquear al usuario en desarrollo si falla SMTP
        return {
          ok: true,
          mensaje:
            'No se pudo conectar al servidor de correos, se generó código para desarrollo.',
          codigoDev: codigo,
        };
      }
    } else {
      // Modo simulación / local
      this.logger.log(
        `[MAIL DEV] Código de verificación para ${normalizado}: ${codigo}`,
      );
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
    const otp = this.otps.get(normalizado);

    if (!otp) {
      return {
        ok: false,
        verificado: false,
        mensaje:
          'No hay un código pendiente para este correo. Solicita uno nuevo.',
      };
    }

    if (Date.now() > otp.expira) {
      this.otps.delete(normalizado);
      return {
        ok: false,
        verificado: false,
        mensaje: 'El código ha expirado. Por favor solicita uno nuevo.',
      };
    }

    if (otp.codigo !== codigo.trim()) {
      otp.intentos += 1;
      if (otp.intentos >= 4) {
        this.otps.delete(normalizado);
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
    this.otps.delete(normalizado);

    if (usuarioCiudadanoId) {
      this.emailsVerificados.set(usuarioCiudadanoId, normalizado);
      try {
        // Actualizar emailSesion en la última sesión activa del ciudadano
        await this.sesionCiudadanoRepository
          .createQueryBuilder()
          .update(SesionCiudadano)
          .set({ emailSesion: normalizado })
          .where('usuario_ciudadano_id = :id', { id: usuarioCiudadanoId })
          .execute();
      } catch (err) {
        this.logger.warn(
          `No se pudo sincronizar email_sesion en sesiones_ciudadano: ${err}`,
        );
      }
    }

    return {
      ok: true,
      verificado: true,
      mensaje: 'Correo verificado exitosamente.',
    };
  }

  /**
   * Asocia directamente un correo verificado al ciudadano en memoria y en la sesión.
   */
  async registrarCorreoCiudadano(
    usuarioCiudadanoId: string,
    email: string,
  ): Promise<void> {
    const normalizado = email.trim().toLowerCase();
    this.emailsVerificados.set(usuarioCiudadanoId, normalizado);
    try {
      await this.sesionCiudadanoRepository
        .createQueryBuilder()
        .update(SesionCiudadano)
        .set({ emailSesion: normalizado })
        .where('usuario_ciudadano_id = :id', { id: usuarioCiudadanoId })
        .execute();
    } catch (err) {
      this.logger.warn(
        `No se pudo sincronizar email_sesion en sesiones_ciudadano: ${err}`,
      );
    }
  }

  /**
   * Obtiene el correo verificado de un vecino, buscando en memoria o en su última sesión.
   */
  async obtenerCorreoCiudadano(
    usuarioCiudadanoId: string,
  ): Promise<string | null> {
    if (this.emailsVerificados.has(usuarioCiudadanoId)) {
      return this.emailsVerificados.get(usuarioCiudadanoId)!;
    }

    try {
      const sesion = await this.sesionCiudadanoRepository.findOne({
        where: { usuarioCiudadanoId },
        order: { fechaInicio: 'DESC' },
      });
      if (sesion?.emailSesion) {
        this.emailsVerificados.set(usuarioCiudadanoId, sesion.emailSesion);
        return sesion.emailSesion;
      }
    } catch {
      // Ignorar fallback
    }

    return null;
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
        `[MAIL DEV] Notificación de estado '${nuevoEstado}' enviada a ${normalizado} para solicitud #${solicitud.id}`,
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
        `Notificación de cambio de estado a '${nuevoEstado}' enviada a ${normalizado}`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Error al enviar correo de cambio de estado a ${normalizado}:`,
        err,
      );
      return false;
    }
  }

  /**
   * Avisa que cambió el teléfono o la dirección de contacto. El cuerpo nombra
   * el campo, no el valor nuevo.
   */
  async notificarPerfilActualizado(
    email: string,
    campos: ReadonlyArray<'telefono' | 'direccion'>,
  ): Promise<boolean> {
    const normalizado = email.trim().toLowerCase();
    const etiquetas = campos.map((campo) =>
      campo === 'telefono' ? 'teléfono' : 'dirección',
    );
    const html = generarHtmlPerfilActualizado(etiquetas);
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      'A.R.C.A. Santo Domingo <soporte.arcaa@gmail.com>';

    if (!this.transporter) {
      this.logger.log(
        `[MAIL DEV] Aviso de perfil (${etiquetas.join(', ')}) a ${normalizado}`,
      );
      return true;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: normalizado,
        subject: 'Actualizamos tus datos de contacto — A.R.C.A. Santo Domingo',
        html,
        attachments: this.obtenerAdjuntosLogo(),
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Error al avisar el cambio de perfil a ${normalizado}:`,
        err,
      );
      return false;
    }
  }
}
