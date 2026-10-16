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
import {
  type ActorAuditoria,
  AuditoriaAdminService,
  type AuditoriaLog,
} from './auditoria-admin.service';
import {
  ConsultaAuditoriaDto,
  ExportarAuditoriaDto,
  type FiltroAuditoriaDto,
} from './dto/filtro-auditoria.dto';
import { generarArchivo } from './exportar-auditoria';

/**
 * Consulta del registro auditable (HU-14).
 *
 * **Solo rol `admin`**, a diferencia del resto del panel, que también admite
 * `funcionario`. La auditoría expone qué hizo cada funcionario: es
 * información de control interno, no operativa, y el municipio definió que la
 * revise una jefatura.
 */
@Controller('admin/auditoria')
@UseGuards(RolesGuard)
@Roles(RolAdministrador.ADMIN)
export class AuditoriaAdminController {
  constructor(
    private readonly auditoriaAdminService: AuditoriaAdminService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Query() query: ConsultaAuditoriaDto,
  ): Promise<AuditoriaLog[]> {
    const { limite, ...filtro } = query;
    const registros = await this.auditoriaAdminService.findAll(filtro, limite);

    // Leer la auditoría es en sí mismo un acceso a datos sensibles, y por eso
    // queda registrado con acción ACCESO — distinta de LOGIN, que es solo
    // entrar al sistema. Se registra DESPUÉS de la consulta para que el propio
    // acceso no aparezca dentro de su resultado.
    await this.registrarAcceso(user, req, filtro, {
      registrosConsultados: registros.length,
    });

    return registros;
  }

  /** Funcionarios para el filtro por usuario de la pantalla. */
  @Get('actores')
  actores(): Promise<ActorAuditoria[]> {
    return this.auditoriaAdminService.actores();
  }

  /**
   * Descarga del registro con los filtros de la vista, en CSV (por defecto) o
   * XLSX. Es una salida masiva de datos, así que queda auditada igual que la
   * descarga del Excel de derivación, con los filtros y la cantidad de filas.
   */
  @Get('exportar')
  async exportar(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query() query: ExportarAuditoriaDto,
  ): Promise<StreamableFile> {
    const { formato = 'csv', ...filtro } = query;
    const registros = await this.auditoriaAdminService.exportar(filtro);
    const archivo = await generarArchivo(registros, formato);

    await this.registrarAcceso(user, req, filtro, {
      exportacion: formato,
      filas: registros.length,
    });

    res.set({
      'Content-Type': archivo.tipo,
      'Content-Disposition': `attachment; filename="${archivo.nombre}"`,
      'Cache-Control': 'no-store',
    });
    return new StreamableFile(archivo.contenido);
  }

  // `registrar` no lanza: si la escritura fallara, la consulta igual responde.
  private registrarAcceso(
    user: AuthUser,
    req: Request,
    filtro: FiltroAuditoriaDto,
    datos: Record<string, unknown>,
  ): Promise<void> {
    return this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'auditoria',
      accion: AccionAuditoria.ACCESO,
      datosNuevos: { ...datos, ...filtro },
      origen: {
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });
  }
}
