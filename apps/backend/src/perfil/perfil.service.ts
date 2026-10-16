import { Injectable } from '@nestjs/common';
import { type AuthUser, SesionService } from '../core';
import { MailService } from '../mail/mail.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

export interface PerfilRespuesta {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}

@Injectable()
export class PerfilService {
  constructor(
    private readonly sesionService: SesionService,
    private readonly mailService: MailService,
  ) {}

  async obtener(user: AuthUser): Promise<PerfilRespuesta> {
    const contacto = await this.sesionService.contactoSesionActiva(
      user.ciudadanoId,
    );
    const emailMail = await this.mailService.obtenerCorreoCiudadano(
      user.ciudadanoId,
    );

    return {
      nombre: contacto.nombre,
      email: emailMail ?? contacto.email,
      telefono: contacto.telefono,
      direccion: contacto.direccion,
    };
  }

  async actualizar(
    user: AuthUser,
    dto: ActualizarPerfilDto,
  ): Promise<PerfilRespuesta> {
    const patch: { telefono?: string | null; direccion?: string | null } = {};

    if (dto.telefono !== undefined) {
      const telefono = dto.telefono.trim();
      patch.telefono = telefono.length > 0 ? telefono : null;
    }

    if (dto.direccion !== undefined) {
      const direccion = dto.direccion.trim();
      patch.direccion = direccion.length > 0 ? direccion : null;
    }

    await this.sesionService.actualizarContactoSesion(user.ciudadanoId, patch);
    return this.obtener(user);
  }
}
