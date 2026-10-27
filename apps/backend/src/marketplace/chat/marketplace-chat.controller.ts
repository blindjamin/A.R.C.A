import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
