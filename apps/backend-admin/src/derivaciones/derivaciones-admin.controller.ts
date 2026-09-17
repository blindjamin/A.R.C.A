import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  type AuthUser,
  CurrentUser,
  type OrigenPeticion,
  RolAdministrador,
  Roles,
  RolesGuard,
} from '@arca/core';
import { DerivacionesAdminService } from './derivaciones-admin.service';

const origenDe = (req: Request): OrigenPeticion => ({
  ip: req.ip ?? null,
  userAgent: req.headers['user-agent'] ?? null,
});

const TIPO_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Derivación de solicitudes a la empresa operadora (spec `derivacion-excel`). */
@Controller('admin/derivaciones')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO)
export class DerivacionesAdminController {
  constructor(
    private readonly derivacionesAdminService: DerivacionesAdminService,
  ) {}

  @Get('resumen')
  resumen() {
    return this.derivacionesAdminService.resumen();
  }

  @Get()
  listar() {
    return this.derivacionesAdminService.listar();
  }

  @Post()
  crearLote(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.derivacionesAdminService.crearLote(user, origenDe(req));
  }

  @Get(':id/excel')
  async excel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const archivo = await this.derivacionesAdminService.excel(
      id,
      user,
      origenDe(req),
    );

    res.set({
      'Content-Type': TIPO_XLSX,
      'Content-Disposition': `attachment; filename="${archivo.nombre}"`,
      'Cache-Control': 'no-store',
    });

    return new StreamableFile(archivo.contenido);
  }
}
