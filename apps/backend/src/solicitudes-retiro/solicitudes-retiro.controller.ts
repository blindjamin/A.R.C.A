import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { CurrentUser, type AuthUser, type OrigenPeticion } from '../core';
import {
  type ArchivoSubido,
  TAMANO_MAXIMO_IMAGEN_BYTES,
} from '../archivos/archivos.service';
import { CancelarSolicitudRetiroDto } from './dto/cancelar-solicitud-retiro.dto';
import { CreateSolicitudRetiroDto } from './dto/create-solicitud-retiro.dto';
import { FilterSolicitudesRetiroDto } from './dto/filter-solicitudes-retiro.dto';
import { ReenviarSolicitudRetiroDto } from './dto/reenviar-solicitud-retiro.dto';
import { SolicitudesRetiroService } from './solicitudes-retiro.service';

/**
 * Datos de la petición que acompañan a las acciones auditadas (HU-14).
 */
const origenDe = (req: Request): OrigenPeticion => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});

@Controller('solicitudes-retiro')
export class SolicitudesRetiroController {
  constructor(
    private readonly solicitudesRetiroService: SolicitudesRetiroService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: TAMANO_MAXIMO_IMAGEN_BYTES, files: 1 },
    }),
  )
  create(
    @Body() dto: CreateSolicitudRetiroDto,
    @UploadedFile() foto: ArchivoSubido | undefined,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.solicitudesRetiroService.create(dto, foto, user, origenDe(req));
  }

  @Get()
  findAll(
    @Query() filtros: FilterSolicitudesRetiroDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitudesRetiroService.findAll(filtros, user);
  }

  @Get(':id/foto')
  async foto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, mime } = await this.solicitudesRetiroService.foto(id, user);
    res.set({
      'Content-Type': mime,
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(stream);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.solicitudesRetiroService.findOneConUltimaRevision(id, user);
  }

  @Patch(':id/reenviar')
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: TAMANO_MAXIMO_IMAGEN_BYTES, files: 1 },
    }),
  )
  reenviar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReenviarSolicitudRetiroDto,
    @UploadedFile() foto: ArchivoSubido | undefined,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.solicitudesRetiroService.reenviarPorCiudadano(
      id,
      dto,
      foto,
      user,
      origenDe(req),
    );
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarSolicitudRetiroDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.solicitudesRetiroService.cancelarPorCiudadano(
      id,
      dto,
      user,
      origenDe(req),
    );
  }
}
