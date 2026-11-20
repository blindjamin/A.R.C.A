import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../core';
import {
  QuitarSuscripcionPushDto,
  SuscripcionPushDto,
} from './dto/suscripcion-push.dto';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('clave-publica')
  clavePublica() {
    return { clavePublica: this.pushService.clavePublicaVapid() };
  }

  @Post('suscripciones')
  async suscribir(
    @Body() dto: SuscripcionPushDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.pushService.suscribir(user, dto);
    return { suscrito: true };
  }

  @Delete('suscripciones')
  async quitar(
    @Body() dto: QuitarSuscripcionPushDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.pushService.desuscribir(user, dto.endpoint);
    return { eliminado: true };
  }
}
