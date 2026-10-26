import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccionAuditoria,
  AuditoriaService,
  type AuthUser,
  ContactoCiudadano,
  type OrigenPeticion,
  SesionService,
  TipoActorAuditoria,
} from '../core';
import { MailService } from '../mail/mail.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

export interface PerfilRespuesta {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}

type CampoContacto = 'telefono' | 'direccion';

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(ContactoCiudadano)
    private readonly contactos: Repository<ContactoCiudadano>,
    private readonly sesionService: SesionService,
    private readonly mailService: MailService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async obtener(user: AuthUser): Promise<PerfilRespuesta> {
    const [contacto, nombre, email] = await Promise.all([
      this.contactos.findOne({
        where: { usuarioCiudadanoId: user.ciudadanoId },
      }),
      this.sesionService.nombreSesionActiva(user.ciudadanoId),
      this.mailService.obtenerCorreoCiudadano(user.ciudadanoId),
    ]);

    return {
      nombre,
      email,
      telefono: contacto?.telefono ?? null,
      direccion: contacto?.direccion ?? null,
    };
  }

  /**
   * El contacto vive en `contacto_ciudadano` (decisión 016), no en la sesión:
   * dura lo que la cuenta y hay una sola versión del dato.
   */
  async actualizar(
    user: AuthUser,
    dto: ActualizarPerfilDto,
    origen?: OrigenPeticion,
  ): Promise<PerfilRespuesta> {
    const contacto =
      (await this.contactos.findOne({
        where: { usuarioCiudadanoId: user.ciudadanoId },
      })) ??
      this.contactos.create({
        usuarioCiudadanoId: user.ciudadanoId,
        telefono: null,
        direccion: null,
      });
    const cambiados: CampoContacto[] = [];

    for (const campo of ['telefono', 'direccion'] as const) {
      if (dto[campo] === undefined) continue;
      const valor = dto[campo].trim() || null;
      if (valor !== contacto[campo]) {
        contacto[campo] = valor;
        cambiados.push(campo);
      }
    }

    if (cambiados.length === 0) {
      return this.obtener(user);
    }

    // Si el vecino borró todo, no queda una fila vacía.
    if (contacto.telefono === null && contacto.direccion === null) {
      await this.contactos.delete({ usuarioCiudadanoId: user.ciudadanoId });
    } else {
      await this.contactos.save(contacto);
    }

    // Solo qué campos cambiaron, nunca el valor: el teléfono y la dirección
    // son datos personales y la auditoría se conserva.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: user,
      entidad: 'contacto_ciudadano',
      accion: AccionAuditoria.UPDATE,
      datosNuevos: { camposCambiados: cambiados },
      origen,
    });

    await this.avisarCambioDeContacto(user.ciudadanoId, cambiados);
    return this.obtener(user);
  }

  /**
   * Avisa qué dato cambió, nunca el valor. Si no hay correo o el envío falla,
   * el cambio del perfil igual queda guardado.
   */
  private async avisarCambioDeContacto(
    ciudadanoId: string,
    campos: CampoContacto[],
  ): Promise<void> {
    try {
      const email = await this.mailService.obtenerCorreoCiudadano(ciudadanoId);
      if (!email) return;
      await this.mailService.notificarPerfilActualizado(email, campos);
    } catch {
      // El perfil ya quedó guardado.
    }
  }
}
