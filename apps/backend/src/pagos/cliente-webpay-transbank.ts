import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  WebpayPlus,
} from 'transbank-sdk';
import type {
  ClienteWebpay,
  TransaccionConfirmada,
  TransaccionCreada,
} from './cliente-webpay';

type TransaccionSdk = {
  create(
    orden: string,
    sesion: string,
    monto: number,
    retorno: string,
  ): Promise<unknown>;
  commit(token: string): Promise<unknown>;
  refund(token: string, monto: number): Promise<unknown>;
};

/**
 * Webpay Plus en el ambiente de integración, salvo que `WEBPAY_ENV=production`
 * y existan código de comercio y llave. Esos valores no van en el código:
 * vacíos, en integración se usan las credenciales públicas de prueba del SDK.
 */
@Injectable()
export class ClienteWebpayTransbank implements ClienteWebpay {
  async crear(
    orden: string,
    sesion: string,
    monto: number,
    retorno: string,
  ): Promise<TransaccionCreada> {
    const creado = await this.transaccion().create(
      orden,
      sesion,
      monto,
      retorno,
    );
    if (!esObjeto(creado)) {
      throw new Error('Webpay no devolvió la transacción.');
    }
    const token = creado.token;
    const url = creado.url;
    if (typeof token !== 'string' || typeof url !== 'string') {
      throw new Error('Webpay no devolvió token y url.');
    }
    return { token, url };
  }

  async confirmar(token: string): Promise<TransaccionConfirmada> {
    const respuesta = await this.transaccion().commit(token);
    if (!esObjeto(respuesta)) {
      throw new Error('Webpay no devolvió el resultado.');
    }
    const amount = Number(respuesta.amount);
    const fecha = respuesta.transaction_date;
    const codigo = respuesta.authorization_code;
    const code = respuesta.response_code;
    return {
      status: typeof respuesta.status === 'string' ? respuesta.status : '',
      responseCode:
        code === undefined || code === null || code === ''
          ? null
          : Number(code),
      amount,
      buyOrder:
        typeof respuesta.buy_order === 'string' ? respuesta.buy_order : '',
      authorizationCode:
        typeof codigo === 'string' && codigo.trim() ? codigo.trim() : null,
      transactionDate:
        typeof fecha === 'string' && !Number.isNaN(Date.parse(fecha))
          ? new Date(fecha)
          : null,
    };
  }

  async reversar(token: string, monto: number): Promise<void> {
    await this.transaccion().refund(token, monto);
  }

  private transaccion(): TransaccionSdk {
    const entorno = (process.env.WEBPAY_ENV ?? 'integration').trim();
    const codigo = process.env.WEBPAY_COMMERCE_CODE?.trim();
    const llave = process.env.WEBPAY_API_KEY?.trim();

    if (entorno === 'production') {
      if (!codigo || !llave) {
        throw new ServiceUnavailableException(
          'Webpay de producción no está configurado.',
        );
      }
      return WebpayPlus.Transaction.buildForProduction(codigo, llave);
    }

    if (entorno !== 'integration') {
      throw new ServiceUnavailableException(
        'WEBPAY_ENV debe ser integration o production.',
      );
    }

    return WebpayPlus.Transaction.buildForIntegration(
      codigo || IntegrationCommerceCodes.WEBPAY_PLUS,
      llave || IntegrationApiKeys.WEBPAY,
    );
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}
