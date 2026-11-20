import {
  BadRequestException,
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
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import {
  type ArchivoSubido,
  TAMANO_MAXIMO_IMAGEN_BYTES,
} from '../../archivos/archivos.service';
import { NoBloqueadoGuard } from '../../bloqueos/no-bloqueado.guard';
import { CurrentUser, LimiteChat, type AuthUser } from '../../core';
import { ConversacionDto, HistorialDto } from '../dto/conversacion.dto';
import { EnviarMensajeImagenDto } from '../dto/enviar-mensaje-imagen.dto';
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
  @UseGuards(NoBloqueadoGuard)
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
  @UseGuards(NoBloqueadoGuard)
  @LimiteChat()
  enviar(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: ConversacionDto,
    @Body() body: EnviarMensajeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chatService.enviar(id, dto, body.contenido, user);
  }

  @Post('articulos/:id/mensajes/imagen')
  @UseGuards(NoBloqueadoGuard)
  @LimiteChat()
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: TAMANO_MAXIMO_IMAGEN_BYTES, files: 1 },
    }),
  )
  enviarImagen(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: ConversacionDto,
    @Body() body: EnviarMensajeImagenDto,
    @UploadedFile() imagen: ArchivoSubido | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!imagen) throw new BadRequestException('Adjunta una foto');
    return this.chatService.enviar(id, dto, body.contenido ?? '', user, imagen);
  }

  @Get('articulos/:id/mensajes/:mensajeId/imagen')
  async imagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('mensajeId', ParseIntPipe) mensajeId: number,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, mime } = await this.chatService.imagen(id, mensajeId, user);
    res.set({
      'Content-Type': mime,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(stream);
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
