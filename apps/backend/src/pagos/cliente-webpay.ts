export const CLIENTE_WEBPAY = Symbol('CLIENTE_WEBPAY');

export interface TransaccionCreada {
  token: string;
  url: string;
}

export interface TransaccionConfirmada {
  status: string;
  responseCode: number | null;
  amount: number;
  buyOrder: string;
  authorizationCode: string | null;
  transactionDate: Date | null;
}

/**
 * Pasarela. Los tests usan un doble: ningún spec llama a Transbank.
 */
export interface ClienteWebpay {
  crear(
    orden: string,
    sesion: string,
    monto: number,
    retorno: string,
  ): Promise<TransaccionCreada>;

  confirmar(token: string): Promise<TransaccionConfirmada>;

  /** Reversa el cobro cuando el monto o la orden no son los de la solicitud. */
  reversar(token: string, monto: number): Promise<void>;
}
