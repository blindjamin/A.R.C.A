import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from './decorators/public.decorator';
import { LimiteLogin } from '../seguridad/limites';
import { ClaveUnicaService } from './clave-unica.service';
import {
  ERROR_INGRESO_CLAVE_UNICA,
  OAUTH_STATE_COOKIE,
} from './clave-unica.constants';
import { COOKIE_SESION, leerCookie, opcionesCookieSesion } from './cookies';
import { SesionService } from './sesion.service';

/**
 * Punto de entrada del inicio de sesión con ClaveÚnica (HU-12).
 *
 * Con el prefijo global `/api`, la ruta expuesta es `/api/auth/clave-unica/login`.
 *
 * Es pública (no exige sesión), así que lleva un límite de consultas propio,
 * más estricto que el general: ver `LIMITE_LOGIN`.
 */
@Public()
@LimiteLogin()
@Controller('auth/clave-unica')
export class ClaveUnicaController {
  private readonly logger = new Logger(ClaveUnicaController.name);

  constructor(
    private readonly claveUnicaService: ClaveUnicaService,
    private readonly sesionService: SesionService,
  ) {}

  /**
   * Inicia el flujo: genera el `state`, lo deja en una cookie HttpOnly y redirige
   * a ClaveÚnica.
   *
   * El `client_id` y el `state` se arman en el servidor y nunca llegan al navegador
   * como dato manipulable. La certificación exige además que el formulario de
   * ClaveÚnica se abra a pantalla completa, con la barra de direcciones visible y
   * sin iframes ni popups: por eso esto responde con una redirección 302 real.
   *
   * En el frontend hay que navegar de verdad hacia acá
   * (`window.location.href = '/api/auth/clave-unica/login'`). Un `fetch` seguiría la
   * redirección por detrás sin mover al usuario, y el flujo no funcionaría.
   */
  @Get('login')
  login(@Res() res: Response): void {
    const estado = this.claveUnicaService.generarEstado();

    // La URL se arma ANTES de escribir la cookie: si la configuración está
    // incompleta esto lanza, y no queremos dejar en el navegador un `state`
    // que nunca llegó a enviarse a ClaveÚnica.
    const urlAutorizacion =
      this.claveUnicaService.construirUrlAutorizacion(estado);

    res.cookie(
      OAUTH_STATE_COOKIE,
      estado,
      this.claveUnicaService.opcionesCookieEstado(),
    );

    res.redirect(302, urlAutorizacion);
  }

  /**
   * Callback de ClaveÚnica: pasos 3, 4 y 6 del manual.
   *
   * La Redirect URI registrada es la raíz del sitio, no esta ruta: ClaveÚnica
   * vuelve a `/` y el `index.html` del frontend reenvía `code` y `state` acá.
   * Por eso `CLAVE_UNICA_REDIRECT_URI` vale la raíz: en el intercambio del token
   * tiene que ir la misma URI que se usó al pedir la autorización.
   *
   * Valida el `state`, cambia el código por el token de acceso y consulta la
   * identidad. Las dos llamadas salen desde acá, del backend, como exige la
   * certificación. Después emite la sesión de ARCA en la cookie `arca_sesion` y
   * vuelve al inicio del sitio.
   *
   * Si el ingreso no se completa (cuenta desactivada, `state` inválido, falla de
   * ClaveÚnica), se hace el **cierre implícito** que exige la certificación: se
   * cierra la sesión de ClaveÚnica y la persona vuelve a `/login` con un aviso.
   * Sin esto, la sesión de ClaveÚnica quedaría abierta y la persona vería el
   * JSON del error en vez de una pantalla.
   */
  @Get('callback')
  async callback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') codigo?: string,
    @Query('state') estado?: string,
    @Query('error') error?: string,
  ): Promise<void> {
    // El `state` es de un solo uso: se borra apenas se lee, pase lo que pase
    // después. Si se dejara, un mismo valor serviría para varios intentos.
    const estadoEsperado = leerCookie(req, OAUTH_STATE_COOKIE);
    res.clearCookie(
      OAUTH_STATE_COOKIE,
      this.claveUnicaService.opcionesBorradoCookieEstado(),
    );

    let sesion: { valorCookie: string; maxAgeMs: number };
    try {
      sesion = await this.completarIngreso(
        req,
        estadoEsperado,
        codigo,
        estado,
        error,
      );
    } catch (fallo) {
      await this.cerrarIngresoFallido(req, res, fallo);
      return;
    }

    // La identidad nunca viaja en la URL de vuelta: el frontend la pide con
    // `GET /api/sesion`. Devolverla por la URL es el error de Atención Vecino,
    // donde cualquiera se hace pasar por otro escribiendo un RUN.
    res.cookie(
      COOKIE_SESION,
      sesion.valorCookie,
      opcionesCookieSesion(sesion.maxAgeMs),
    );
    res.redirect(302, '/');
  }

  /** Valida la vuelta de ClaveÚnica y crea la sesión. Lanza si algo no cuadra. */
  private async completarIngreso(
    req: Request,
    estadoEsperado: string | undefined,
    codigo?: string,
    estado?: string,
    error?: string,
  ): Promise<{ valorCookie: string; maxAgeMs: number }> {
    if (error) {
      // Es el propio ClaveÚnica avisando; no se refleja el texto al usuario.
      this.logger.warn(`ClaveÚnica devolvió un error en el callback: ${error}`);
      throw new UnauthorizedException('No se pudo completar la autenticación.');
    }

    // Paso 3: confirmar el token anti-falsificación.
    if (!this.claveUnicaService.validarEstado(estado, estadoEsperado)) {
      this.logger.warn(
        'Callback con state inválido o ausente: se descarta el intento.',
      );
      throw new UnauthorizedException('No se pudo completar la autenticación.');
    }

    if (!codigo) {
      throw new BadRequestException('Falta el código de autorización.');
    }

    // Paso 4: código por token. Paso 6: identidad.
    const token = await this.claveUnicaService.intercambiarCodigoPorToken(
      codigo,
      estado as string,
    );
    const userInfo = await this.claveUnicaService.obtenerInformacionUsuario(
      token.access_token,
    );

    // A partir de acá el RUN ya no existe: queda solo su derivación.
    const identidad = this.claveUnicaService.normalizarIdentidad(userInfo);

    this.logger.log(
      `Autenticación completada para ${identidad.identificador.slice(0, 8)}…`,
    );

    // La cookie nueva reemplaza a la anterior en el navegador, pero su fila
    // seguiría activa hasta expirar.
    await this.sesionService.revocar(leerCookie(req, COOKIE_SESION));
    return this.sesionService.iniciarConClaveUnica(identidad, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Cierre implícito (paso 7 del manual): el ingreso falló, así que se cierra
   * también la sesión de ClaveÚnica y la persona vuelve a `/login`.
   *
   * La sesión de ARCA que el navegador ya traía también se cierra: con la de
   * ClaveÚnica cerrada, dejarla viva mostraría a la persona adentro con otra
   * identidad que la que acaba de intentar usar.
   */
  private async cerrarIngresoFallido(
    req: Request,
    res: Response,
    fallo: unknown,
  ): Promise<void> {
    // Solo el tipo de error: los mensajes ya son genéricos y el detalle quedó
    // registrado donde ocurrió.
    this.logger.warn(
      `Ingreso con ClaveÚnica no completado (${(fallo as Error)?.name ?? 'desconocido'}): se cierra la sesión de ClaveÚnica.`,
    );

    try {
      await this.sesionService.revocar(leerCookie(req, COOKIE_SESION));
    } catch {
      // Si la base no responde, igual hay que cerrar la sesión de ClaveÚnica.
    }
    res.clearCookie(COOKIE_SESION, opcionesCookieSesion());

    res.redirect(
      302,
      this.claveUnicaService.construirUrlCierreSesion(
        ERROR_INGRESO_CLAVE_UNICA,
      ),
    );
  }

  /**
   * Cierra la sesión de ARCA (revoca la fila y borra `arca_sesion`) y después
   * la de ClaveÚnica (paso 7 del manual).
   *
   * La certificación verifica que exista un enlace o botón claramente identificado
   * para cerrar sesión y que efectivamente llame a este endpoint. Cerrar solo la
   * sesión propia no basta: ClaveÚnica mantiene la suya y la persona volvería a
   * entrar sin escribir su clave.
   *
   * Igual que el login, tiene que ser una navegación de nivel superior. El manual
   * advierte que llamarlo desde un popup o un iframe provoca un error de CORS y la
   * sesión de ClaveÚnica queda abierta.
   */
  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.sesionService.revocar(leerCookie(req, COOKIE_SESION));
    res.clearCookie(COOKIE_SESION, opcionesCookieSesion());
    res.clearCookie(
      OAUTH_STATE_COOKIE,
      this.claveUnicaService.opcionesBorradoCookieEstado(),
    );

    res.redirect(302, this.claveUnicaService.construirUrlCierreSesion());
  }
}
