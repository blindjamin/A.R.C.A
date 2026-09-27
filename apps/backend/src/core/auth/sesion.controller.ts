import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LimiteLogin } from '../seguridad/limites';
import { AuthService } from './auth.service';
import { COOKIE_SESION, leerCookie, opcionesCookieSesion } from './cookies';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { DevLoginDto } from './dto/dev-login.dto';
import type { AuthUser } from './interfaces/auth-user.interface';
import { loginDevHabilitado } from './login-dev';
import { SesionService } from './sesion.service';
import { RolAdministrador } from '../entities/rol-administrador.enum';

interface SesionRespuesta {
  ciudadanoId: string;
  nombre: string | null;
  rol: 'vecino' | RolAdministrador;
  devLogin: boolean;
}

/**
 * Endpoints de sesión de ARCA (SPEC-sesion-unica §2.4). El callback y el
 * logout de ClaveÚnica quedan en `ClaveUnicaController` (SU-3); acá va lo que
 * no depende de ella: consultar la sesión propia, cerrarla y el login de
 * desarrollo transitorio.
 */
@Controller()
export class SesionController {
  constructor(
    private readonly sesionService: SesionService,
    private readonly authService: AuthService,
  ) {}

  @Get('sesion')
  async obtenerSesion(
    @CurrentUser() usuario: AuthUser,
  ): Promise<SesionRespuesta> {
    return {
      ciudadanoId: usuario.ciudadanoId,
      nombre: await this.nombreParaMostrar(usuario),
      rol: usuario.rol ?? 'vecino',
      devLogin: loginDevHabilitado(process.env),
    };
  }

  /** Idempotente a propósito: reusar una cookie ya revocada también da 204. */
  @Public()
  @HttpCode(204)
  @Post('auth/logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.sesionService.revocar(leerCookie(req, COOKIE_SESION));
    res.clearCookie(COOKIE_SESION, opcionesCookieSesion());
  }

  /**
   * Login de desarrollo transitorio (se borra en SU-4): reemplaza al
   * `Bearer <uuid>` mientras el frontend no migra a la cookie. 404 en vez de
   * 403 con `ALLOW_DEV_LOGIN` apagado, para no revelar que la ruta existe.
   */
  @Public()
  @LimiteLogin()
  @HttpCode(204)
  @Post('auth/dev/login')
  async loginDev(
    @Body() dto: DevLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (!loginDevHabilitado(process.env)) {
      throw new NotFoundException();
    }

    const { valorCookie, maxAgeMs } = await this.sesionService.iniciar(
      {
        usuarioCiudadanoId: dto.ciudadanoId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      'dev',
    );

    res.cookie(COOKIE_SESION, valorCookie, opcionesCookieSesion(maxAgeMs));
  }

  private async nombreParaMostrar(usuario: AuthUser): Promise<string | null> {
    if (usuario.esAdministrador) {
      return this.authService.resolverNombreAdministrador(usuario.ciudadanoId);
    }
    return this.sesionService.nombreSesionActiva(usuario.ciudadanoId);
  }
}
