import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CurrentUser,
  type AuthUser,
  type OrigenPeticion,
  RolAdministrador,
  Roles,
  RolesGuard,
} from '../core';
import { BloqueosService } from './bloqueos.service';
import { MotivoBloqueoDto } from './dto/motivo-bloqueo.dto';
import { ROLES_BLOQUEO } from './permisos-bloqueo';

const origenDe = (req: Request): OrigenPeticion => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});

/** Panel municipal: ve el estado quien revisa denuncias, escribe solo ROLES_BLOQUEO. */
@Controller('admin/denuncias')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO)
export class BloqueosAdminController {
  constructor(private readonly bloqueos: BloqueosService) {}

  @Get(':id/bloqueo')
  estado(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.bloqueos.estadoPorDenuncia(id, user);
  }

  // El @Roles del método tiene prioridad sobre el de la clase (RolesGuard).
  @Post(':id/bloqueo')
  @Roles(...ROLES_BLOQUEO)
  @HttpCode(HttpStatus.OK)
  bloquear(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoBloqueoDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.bloqueos.bloquear(id, dto.motivo, user, origenDe(req));
  }

  @Post(':id/desbloqueo')
  @Roles(...ROLES_BLOQUEO)
  @HttpCode(HttpStatus.OK)
  desbloquear(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoBloqueoDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.bloqueos.desbloquear(id, dto.motivo, user, origenDe(req));
  }
}

/** El vecino consulta su propio bloqueo para mostrar el aviso. */
@Controller('marketplace/bloqueo')
export class MiBloqueoController {
  constructor(private readonly bloqueos: BloqueosService) {}

  @Get()
  async mio(@CurrentUser() user: AuthUser) {
    const b = await this.bloqueos.vigente(user.ciudadanoId);
    return b
      ? { bloqueado: true, motivo: b.motivo, fecha: b.createdAt }
      : { bloqueado: false };
  }
}
