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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser, LimiteUbicacion, type AuthUser } from '../core';
import {
  type ArchivoSubido,
  TAMANO_MAXIMO_IMAGEN_BYTES,
} from '../archivos/archivos.service';
import { CalificarArticuloDto } from './dto/calificar-articulo.dto';
import { FiltrarArticulosDto } from './dto/filtrar-articulos.dto';
import { OrigenDto } from './dto/origen.dto';
import { PublicarArticuloDto } from './dto/publicar-articulo.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('articulos')
  @LimiteUbicacion()
  listar(@Query() filtros: FiltrarArticulosDto, @CurrentUser() user: AuthUser) {
    return this.marketplaceService.listar(filtros, user);
  }

  @Post('articulos')
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: TAMANO_MAXIMO_IMAGEN_BYTES, files: 1 },
    }),
  )
  publicar(
    @Body() dto: PublicarArticuloDto,
    @UploadedFile() foto: ArchivoSubido | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.marketplaceService.publicar(dto, foto, user);
  }

  @Get('articulos/:id')
  @LimiteUbicacion()
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @Query() origen: OrigenDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.marketplaceService.obtener(id, origen, user);
  }

  @Get('articulos/:id/foto')
  async foto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, mime } = await this.marketplaceService.foto(id, user);
    res.set({
      'Content-Type': mime,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(stream);
  }

  @Patch('articulos/:id/retirar')
  retirar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.marketplaceService.retirar(id, user);
  }

  @Post('articulos/:id/solicitar')
  @HttpCode(HttpStatus.OK)
  solicitar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.marketplaceService.solicitar(id, user);
  }

  @Patch('articulos/:id/liberar')
  liberar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.marketplaceService.liberar(id, user);
  }

  @Patch('articulos/:id/entregar')
  entregar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.marketplaceService.entregar(id, user);
  }

  @Post('articulos/:id/calificacion')
  calificar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CalificarArticuloDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.marketplaceService.calificar(id, dto, user);
  }

  @Get('mis-articulos')
  misArticulos(@CurrentUser() user: AuthUser) {
    return this.marketplaceService.misArticulos(user);
  }
}
