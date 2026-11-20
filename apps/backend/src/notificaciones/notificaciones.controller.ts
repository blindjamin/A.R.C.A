import { Controller, Get, Patch, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../core';
import { ListarAvisosDto } from './dto/listar-avisos.dto';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get()
  listar(@Query() dto: ListarAvisosDto, @CurrentUser() user: AuthUser) {
    return this.notificaciones.listar(user, dto.antesDe);
  }

  @Patch('leidas')
  marcarLeidas(@CurrentUser() user: AuthUser) {
    return this.notificaciones.marcarLeidos(user);
  }
}
