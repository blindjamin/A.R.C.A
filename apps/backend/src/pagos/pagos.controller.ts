import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser, Public, type AuthUser } from '../core';
import { PagosService } from './pagos.service';

/**
 * Cobro del vecino (HU-44). La vuelta es pública: Transbank no manda la cookie.
 * El pago se reconoce por el token, no por la sesión.
 *
 * GET y POST van en métodos separados: Nest se queda con un solo decorador
 * HTTP si se apilan sobre el mismo handler.
 */
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Post('solicitudes/:id')
  iniciar(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.pagos.iniciar(user, id, urlDeRetorno(req));
  }

  @Get('solicitudes/:id')
  comprobante(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pagos.comprobante(user, id);
  }

  @Public()
  @Get('retorno')
  retornoGet(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this.responderRetorno(req, res);
  }

  @Public()
  @Post('retorno')
  retornoPost(@Req() req: Request, @Res() res: Response): Promise<void> {
    return this.responderRetorno(req, res);
  }

  private async responderRetorno(req: Request, res: Response): Promise<void> {
    try {
      const destino = await this.pagos.procesarRetorno(parametrosDe(req));
      if (!destino) {
        res
          .status(400)
          .type('text/plain')
          .send('La vuelta del pago no es válida.');
        return;
      }
      res.redirect(302, destino);
    } catch {
      if (!res.headersSent) {
        res
          .status(502)
          .type('text/plain')
          .send(
            'No se pudo confirmar el pago. Vuelve a intentar desde la solicitud.',
          );
      }
    }
  }
}

function urlDeRetorno(req: Request): string {
  const configurada = process.env.WEBPAY_RETURN_URL?.trim();
  if (configurada) return configurada;
  if (process.env.NODE_ENV === 'production') {
    throw new ServiceUnavailableException(
      'WEBPAY_RETURN_URL no está configurado.',
    );
  }
  return `${req.protocol}://${req.get('host') ?? ''}/api/pagos/retorno`;
}

function parametrosDe(req: Request): Record<string, string> {
  return { ...campos(req.query), ...campos(req.body) };
}

function campos(origen: unknown): Record<string, string> {
  if (!origen || typeof origen !== 'object') return {};
  const salida: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(origen)) {
    const texto = textoDe(valor);
    if (texto) salida[clave] = texto;
  }
  return salida;
}

function textoDe(valor: unknown): string {
  if (typeof valor === 'string') return valor.trim();
  if (Array.isArray(valor) && typeof valor[0] === 'string')
    return valor[0].trim();
  return '';
}
