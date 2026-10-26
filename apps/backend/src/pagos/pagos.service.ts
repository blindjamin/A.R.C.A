import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';
import {
  EstadoIntentoPago,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  PagoWebpay,
  SolicitudRetiro,
  origenesPermitidos,
  type AuthUser,
} from '../core';
import { CreditosService } from '../creditos/creditos.service';
import { clasificarVueltaWebpay } from './clasificar-vuelta-webpay';
import { CLIENTE_WEBPAY, type ClienteWebpay } from './cliente-webpay';
import { nuevaOrdenCompra, nuevaSesionWebpay } from './orden-webpay';

const ESTADO_AUTORIZADO = 'AUTHORIZED';
const LARGO_URL_RETORNO = 255;

export type ResultadoPago = 'aprobado' | 'anulado' | 'agotado' | 'rechazado';

export interface InicioPago {
  url: string;
  token: string;
}

export interface ComprobantePago {
  estadoPago: EstadoPagoSolicitud;
  monto: number | null;
  orden: string | null;
  codigoAutorizacion: string | null;
  fecha: string | null;
  resultado: ResultadoPago | null;
}

/**
 * Cobro con Webpay Plus (HU-44).
 *
 * El navegador vuelve desde Transbank sin la cookie. El intento se reconoce
 * por el token, y al anular también por la orden y la sesión guardadas acá.
 * Los créditos del retiro se otorgan en la misma transacción que deja el
 * pago en `pagado`. Confirmar de nuevo no cobra ni otorga otra vez.
 */
@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudes: Repository<SolicitudRetiro>,
    @InjectRepository(PagoWebpay)
    private readonly pagos: Repository<PagoWebpay>,
    private readonly dataSource: DataSource,
    private readonly creditos: CreditosService,
    @Inject(CLIENTE_WEBPAY)
    private readonly cliente: ClienteWebpay,
  ) {}

  async iniciar(
    user: AuthUser,
    solicitudId: number,
    retorno: string,
  ): Promise<InicioPago> {
    const solicitud = await this.solicitudDelVecino(user, solicitudId);
    this.exigirCobrable(solicitud);
    const urlRetorno = validarRetorno(retorno);
    const orden = nuevaOrdenCompra(solicitud.id);
    const sesion = nuevaSesionWebpay();

    let creado: { token: string; url: string };
    try {
      creado = await this.cliente.crear(
        orden,
        sesion,
        solicitud.monto as number,
        urlRetorno,
      );
    } catch (error) {
      throw this.falloDePasarela(error, solicitud.id);
    }

    await this.pagos.save(
      this.pagos.create({
        solicitudRetiroId: solicitud.id,
        buyOrder: orden,
        sessionId: sesion,
        token: creado.token,
        monto: solicitud.monto as number,
        estado: EstadoIntentoPago.INICIADO,
        codigoAutorizacion: null,
        fechaTransaccion: null,
      }),
    );

    return { url: creado.url, token: creado.token };
  }

  async comprobante(
    user: AuthUser,
    solicitudId: number,
  ): Promise<ComprobantePago> {
    const solicitud = await this.solicitudDelVecino(user, solicitudId);
    const autorizado = await this.pagos.findOne({
      where: {
        solicitudRetiroId: solicitud.id,
        estado: EstadoIntentoPago.AUTORIZADO,
      },
      order: { id: 'DESC' },
    });
    const pago =
      autorizado ??
      (await this.pagos.findOne({
        where: { solicitudRetiroId: solicitud.id },
        order: { id: 'DESC' },
      }));

    return {
      estadoPago: solicitud.estadoPago,
      monto: pago?.monto ?? solicitud.monto,
      orden: pago?.buyOrder ?? null,
      codigoAutorizacion: pago?.codigoAutorizacion ?? null,
      fecha: pago?.fechaTransaccion
        ? new Date(pago.fechaTransaccion).toISOString()
        : null,
      resultado: pago ? resultadoDe(pago.estado) : null,
    };
  }

  /**
   * Destino del navegador tras la vuelta, o `null` si no se reconoce el intento.
   * Nunca usa una URL que haya mandado Transbank.
   */
  async procesarRetorno(
    params: Readonly<Record<string, string>>,
  ): Promise<string | null> {
    const vuelta = clasificarVueltaWebpay(params);
    if (vuelta.tipo === 'invalida') return null;

    const cierre =
      vuelta.tipo === 'confirmar'
        ? await this.confirmar(vuelta.token)
        : await this.cerrarSinCobrar(vuelta);

    if (!cierre) return null;
    this.logger.log(
      `Pago de la solicitud #${cierre.solicitudId}: ${cierre.resultado}`,
    );
    return destinoDelFrontend(cierre.solicitudId, cierre.resultado);
  }

  private async confirmar(
    token: string,
  ): Promise<{ solicitudId: number; resultado: ResultadoPago } | null> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const pago = await manager.findOne(PagoWebpay, {
          where: { token },
          lock: { mode: 'pessimistic_write' },
        });
        if (!pago) return null;
        if (pago.estado !== EstadoIntentoPago.INICIADO) {
          return {
            solicitudId: pago.solicitudRetiroId,
            resultado: resultadoDe(pago.estado) ?? 'rechazado',
          };
        }

        const confirmado = await this.cliente.confirmar(token);
        const codigo = confirmado.authorizationCode;
        const cuadra =
          confirmado.status === ESTADO_AUTORIZADO &&
          confirmado.responseCode === 0 &&
          Number.isInteger(confirmado.amount) &&
          confirmado.amount === pago.monto &&
          confirmado.buyOrder === pago.buyOrder &&
          codigo !== null &&
          /^[A-Za-z0-9]{1,6}$/.test(codigo);

        if (!cuadra) {
          if (
            confirmado.status === ESTADO_AUTORIZADO &&
            Number.isInteger(confirmado.amount) &&
            confirmado.amount > 0
          ) {
            await this.cliente.reversar(token, confirmado.amount);
          }
          pago.estado = EstadoIntentoPago.RECHAZADO;
          await manager.save(pago);
          return {
            solicitudId: pago.solicitudRetiroId,
            resultado: 'rechazado',
          };
        }

        const solicitud = await manager.findOne(SolicitudRetiro, {
          where: { id: pago.solicitudRetiroId },
          lock: { mode: 'pessimistic_write' },
        });
        const cobrable =
          solicitud !== null &&
          solicitud.estado === EstadoSolicitudRetiro.APROBADA &&
          solicitud.estadoPago === EstadoPagoSolicitud.PENDIENTE &&
          solicitud.monto === pago.monto;

        if (!cobrable || !solicitud) {
          await this.cliente.reversar(token, confirmado.amount);
          pago.estado = EstadoIntentoPago.RECHAZADO;
          await manager.save(pago);
          return {
            solicitudId: pago.solicitudRetiroId,
            resultado: 'rechazado',
          };
        }

        solicitud.estadoPago = EstadoPagoSolicitud.PAGADO;
        pago.estado = EstadoIntentoPago.AUTORIZADO;
        pago.codigoAutorizacion = codigo;
        pago.fechaTransaccion = confirmado.transactionDate ?? new Date();
        await manager.save(solicitud);
        await manager.save(pago);
        await this.creditos.otorgarPorPago(manager, solicitud);
        return { solicitudId: solicitud.id, resultado: 'aprobado' };
      });
    } catch (error) {
      throw this.falloDePasarela(error, null);
    }
  }

  private async cerrarSinCobrar(vuelta: {
    tipo: 'anulado' | 'agotado';
    orden: string;
    sesion: string;
  }): Promise<{ solicitudId: number; resultado: ResultadoPago } | null> {
    return this.dataSource.transaction(async (manager) => {
      const pago = await manager.findOne(PagoWebpay, {
        where: { buyOrder: vuelta.orden },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pago || pago.sessionId !== vuelta.sesion) return null;
      if (pago.estado === EstadoIntentoPago.INICIADO) {
        pago.estado =
          vuelta.tipo === 'anulado'
            ? EstadoIntentoPago.ANULADO
            : EstadoIntentoPago.AGOTADO;
        await manager.save(pago);
      }
      return {
        solicitudId: pago.solicitudRetiroId,
        resultado: resultadoDe(pago.estado) ?? 'rechazado',
      };
    });
  }

  private async solicitudDelVecino(
    user: AuthUser,
    id: number,
  ): Promise<SolicitudRetiro> {
    const solicitud = await this.solicitudes.findOne({ where: { id } });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }
    if (solicitud.usuarioCiudadanoId !== user.ciudadanoId) {
      throw new ForbiddenException('No puedes pagar esta solicitud.');
    }
    return solicitud;
  }

  private exigirCobrable(solicitud: SolicitudRetiro): void {
    if (solicitud.estadoPago === EstadoPagoSolicitud.PAGADO) {
      throw new ConflictException('Esta solicitud ya está pagada.');
    }
    if (
      solicitud.estado !== EstadoSolicitudRetiro.APROBADA ||
      solicitud.estadoPago !== EstadoPagoSolicitud.PENDIENTE ||
      solicitud.monto === null ||
      solicitud.monto <= 0
    ) {
      throw new ConflictException(
        'Esta solicitud no tiene un cobro pendiente.',
      );
    }
  }

  private falloDePasarela(error: unknown, solicitudId: number | null): Error {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException ||
      error instanceof ForbiddenException ||
      error instanceof NotFoundException ||
      error instanceof ServiceUnavailableException ||
      error instanceof BadGatewayException
    ) {
      return error;
    }
    const donde =
      solicitudId === null ? 'al confirmar' : `de la solicitud #${solicitudId}`;
    this.logger.error(`Webpay falló ${donde}.`);
    return new BadGatewayException('No se pudo completar el pago con Webpay.');
  }
}

function resultadoDe(estado: EstadoIntentoPago): ResultadoPago | null {
  switch (estado) {
    case EstadoIntentoPago.AUTORIZADO:
      return 'aprobado';
    case EstadoIntentoPago.ANULADO:
      return 'anulado';
    case EstadoIntentoPago.AGOTADO:
      return 'agotado';
    case EstadoIntentoPago.RECHAZADO:
      return 'rechazado';
    default:
      return null;
  }
}

function validarRetorno(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('La URL de retorno de Webpay no es válida.');
  }
  if (
    (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') ||
    parsed.pathname !== '/api/pagos/retorno' ||
    url.length > LARGO_URL_RETORNO
  ) {
    throw new BadRequestException('La URL de retorno de Webpay no es válida.');
  }
  return url;
}

function destinoDelFrontend(
  solicitudId: number,
  resultado: ResultadoPago,
): string {
  const base = origenesPermitidos()[0]?.replace(/\/$/, '');
  if (!base) {
    throw new ServiceUnavailableException('FRONTEND_URL no está configurado.');
  }
  return `${base}/pago/${solicitudId}?resultado=${resultado}`;
}
