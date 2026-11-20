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

/** Tiempo máximo de espera a Transbank; el lock de la BD no debe quedar colgado. */
export const TIMEOUT_WEBPAY_MS = 12_000;

type TransaccionSdk = {
  create(
    orden: string,
    sesion: string,
    monto: number,
    retorno: string,
  ): Promise<unknown>;
  commit(token: string): Promise<unknown>;
  status(token: string): Promise<unknown>;
  refund(token: string, monto: number): Promise<unknown>;
};

/**
 * Webpay Plus. En desarrollo, sin `WEBPAY_ENV`, usa integración. En producción
 * el arranque ya exige `WEBPAY_ENV` (ver `verificarWebpayEnv`).
 */
@Injectable()
export class ClienteWebpayTransbank implements ClienteWebpay {
  async crear(
    orden: string,
    sesion: string,
    monto: number,
    retorno: string,
  ): Promise<TransaccionCreada> {
    const creado = await conTimeout(
      this.transaccion().create(orden, sesion, monto, retorno),
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
    return leerConfirmacion(await conTimeout(this.transaccion().commit(token)));
  }

  async consultarEstado(token: string): Promise<TransaccionConfirmada> {
    return leerConfirmacion(await conTimeout(this.transaccion().status(token)));
  }

  async reversar(token: string, monto: number): Promise<void> {
    await conTimeout(this.transaccion().refund(token, monto));
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

function leerConfirmacion(respuesta: unknown): TransaccionConfirmada {
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
      code === undefined || code === null || code === '' ? null : Number(code),
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

function conTimeout<T>(promesa: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Webpay no respondió en ${TIMEOUT_WEBPAY_MS} ms.`));
    }, TIMEOUT_WEBPAY_MS);
    promesa.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}
