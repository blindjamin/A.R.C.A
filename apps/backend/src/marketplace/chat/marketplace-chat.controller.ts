import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, LimiteChat, type AuthUser } from '../../core';
import { ConversacionDto, HistorialDto } from '../dto/conversacion.dto';
import { EnviarMensajeDto } from '../dto/enviar-mensaje.dto';
import { MarketplaceChatService } from './marketplace-chat.service';

@Controller('marketplace')
export class MarketplaceChatController {
  constructor(private readonly chatService: MarketplaceChatService) {}

  @Get('conversaciones')
  conversaciones(@CurrentUser() user: AuthUser) {
    return this.chatService.conversaciones(user);
  }

  @Post('articulos/:id/interes')
  @HttpCode(HttpStatus.OK)
  registrarInteres(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.chatService.registrarInteres(id, user, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Get('articulos/:id/interesados')
  interesados(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.interesados(id, user);
  }

  @Get('articulos/:id/mensajes')
  historial(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: HistorialDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.historial(id, dto, user);
  }

  @Post('articulos/:id/mensajes')
  @LimiteChat()
  enviar(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: ConversacionDto,
    @Body() body: EnviarMensajeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.enviar(id, dto, body.contenido, user);
  }

  @Patch('articulos/:id/mensajes/leidos')
  marcarLeidos(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: ConversacionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.marcarLeidos(id, dto, user);
  }
}
