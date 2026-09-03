import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AccionAuditoria,
  AuditoriaService,
  type AuthUser,
  CurrentUser,
  RolAdministrador,
  Roles,
  RolesGuard,
  TipoActorAuditoria,
} from '@arca/core';
import {
  AuditoriaAdminService,
  type AuditoriaLog,
} from './auditoria-admin.service';

/**
 * Consulta del registro auditable (HU-14).
 *
 * **Solo rol `admin`**, a diferencia del resto del panel, que también admite
 * operador y patrocinador. La auditoría expone qué hizo cada funcionario: es
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
    @Query('limite', new DefaultValuePipe(100), ParseIntPipe) limite: number,
  ): Promise<AuditoriaLog[]> {
    const registros = await this.auditoriaAdminService.findAll(limite);

    // Leer la auditoría es en sí mismo un acceso a datos sensibles, y por eso
    // queda registrado con acción ACCESO — distinta de LOGIN, que es solo
    // entrar al sistema. Se registra DESPUÉS de la consulta para que el propio
    // acceso no aparezca dentro de su resultado.
    //
    // `registrar` no lanza: si la escritura fallara, la consulta igual responde.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'auditoria',
      accion: AccionAuditoria.ACCESO,
      datosNuevos: { registrosConsultados: registros.length },
      origen: {
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });

    return registros;
  }
}
