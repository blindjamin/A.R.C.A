import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AccionAuditoria,
  AuditoriaService,
  type AuthUser,
  CurrentUser,
  RolAdministrador,
  Roles,
  RolesGuard,
  TipoActorAuditoria,
} from '../../core';
import { ExportarPagadasDto, FiltroPagadasDto } from './dto/filtro-pagadas.dto';
import { generarArchivoPagadas } from './exportar-pagadas';
import {
  PagadasAdminService,
  type SolicitudPagada,
} from './pagadas-admin.service';

/**
 * Listado de solicitudes pagadas del panel (`listado-pagadas`).
 *
 * Admin y funcionario. La vista no se audita; la descarga sí, porque es una
 * salida masiva de datos.
 */
@Controller('admin/pagadas')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN, RolAdministrador.FUNCIONARIO)
export class PagadasAdminController {
  constructor(
    private readonly pagadasAdminService: PagadasAdminService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Get()
  findAll(@Query() filtro: FiltroPagadasDto): Promise<SolicitudPagada[]> {
    return this.pagadasAdminService.findAll(filtro);
  }

  /** Opciones del filtro por sector de la pantalla. */
  @Get('sectores')
  sectores(): string[] {
    return this.pagadasAdminService.sectores();
  }

  /**
   * Descarga con los filtros de la vista, en CSV (por defecto) o XLSX. Queda
   * auditada con el formato, los filtros y la cantidad de filas, sin copiar
   * el contenido.
   */
  @Get('exportar')
  async exportar(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query() query: ExportarPagadasDto,
  ): Promise<StreamableFile> {
    const { formato = 'csv', ...filtro } = query;
    const filas = await this.pagadasAdminService.exportar(filtro);
    const archivo = await generarArchivoPagadas(filas, formato);

    // `registrar` no lanza: si la escritura fallara, la descarga igual responde.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'solicitudes_retiro',
      accion: AccionAuditoria.ACCESO,
      datosNuevos: { exportacion: formato, filas: filas.length, ...filtro },
      origen: {
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });

    res.set({
      'Content-Type': archivo.tipo,
      'Content-Disposition': `attachment; filename="${archivo.nombre}"`,
      'Cache-Control': 'no-store',
    });
    return new StreamableFile(archivo.contenido);
  }
}
