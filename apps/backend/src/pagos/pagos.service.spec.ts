import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import {
  EstadoIntentoPago,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  PagoWebpay,
  SolicitudRetiro,
  type AuditoriaService,
  type AuthUser,
} from '../core';
import type { CreditosService } from '../creditos/creditos.service';
import type { ClienteWebpay, TransaccionConfirmada } from './cliente-webpay';
import { ClienteWebpayTransbank } from './cliente-webpay-transbank';
import { nuevaOrdenCompra, nuevaSesionWebpay } from './orden-webpay';
import { PagosService } from './pagos.service';

const VECINO: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000001',
  esAdministrador: false,
  administradorId: null,
  rol: null,
};

const RETORNO = 'http://localhost:3000/api/pagos/retorno';

describe('orden de Webpay', () => {
  it('cabe en los topes de Transbank y no lleva datos del vecino', () => {
    const orden = nuevaOrdenCompra(42);
    const sesion = nuevaSesionWebpay();
    expect(orden).toMatch(/^[a-zA-Z0-9]{1,26}$/);
    expect(sesion).toMatch(/^[a-f0-9]{1,61}$/);
    expect(orden).not.toContain(VECINO.ciudadanoId);
  });
});

describe('ClienteWebpayTransbank', () => {
  const anterior = {
    entorno: process.env.WEBPAY_ENV,
    codigo: process.env.WEBPAY_COMMERCE_CODE,
    llave: process.env.WEBPAY_API_KEY,
  };

  afterEach(() => {
    restaurar('WEBPAY_ENV', anterior.entorno);
    restaurar('WEBPAY_COMMERCE_CODE', anterior.codigo);
    restaurar('WEBPAY_API_KEY', anterior.llave);
  });

  it('en producción sin llaves no llama a Transbank', async () => {
    process.env.WEBPAY_ENV = 'production';
    delete process.env.WEBPAY_COMMERCE_CODE;
    delete process.env.WEBPAY_API_KEY;

    await expect(
      new ClienteWebpayTransbank().crear('orden', 'sesion', 1000, RETORNO),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('PagosService', () => {
  const pagos: PagoWebpay[] = [];
  let guardada: SolicitudRetiro;
  const frontend = process.env.FRONTEND_URL;
  let fallarAlGuardarSolicitud = false;

  const crear = jest.fn<ClienteWebpay['crear']>();
  const confirmar = jest.fn<ClienteWebpay['confirmar']>();
  const consultarEstado = jest.fn<ClienteWebpay['consultarEstado']>();
  const reversar = jest.fn<ClienteWebpay['reversar']>();
  const cliente: ClienteWebpay = {
    crear,
    confirmar,
    consultarEstado,
    reversar,
  };
  const creditos = {
    otorgarPorPago: jest.fn(() => Promise.resolve({})),
  };
  const auditoria = {
    registrar: jest.fn(() => Promise.resolve()),
  };

  const solicitudes = {
    findOne: jest.fn(() => Promise.resolve(guardada)),
  };
  const pagosRepo = {
    create: jest.fn((datos: Partial<PagoWebpay>) => ({ ...datos })),
    save: jest.fn((pago: PagoWebpay) => {
      pagos.push(pago);
      return Promise.resolve(pago);
    }),
    findOne: jest.fn((opts: { where: Partial<PagoWebpay> }) =>
      Promise.resolve(buscar(pagos, opts.where)),
    ),
    find: jest.fn(() => Promise.resolve([])),
  };
  const manager = {
    findOne: jest.fn(
      (entidad: unknown, opts: { where: Record<string, unknown> }) => {
        if (entidad === PagoWebpay)
          return Promise.resolve(buscar(pagos, opts.where));
        if (entidad === SolicitudRetiro && opts.where.id === guardada.id) {
          return Promise.resolve(guardada);
        }
        return Promise.resolve(null);
      },
    ),
    save: jest.fn((entidad: object) => {
      if (
        fallarAlGuardarSolicitud &&
        entidad === guardada &&
        guardada.estadoPago === EstadoPagoSolicitud.PAGADO
      ) {
        return Promise.reject(new Error('BD caida'));
      }
      return Promise.resolve(entidad);
    }),
  };
  const dataSource = {
    transaction: jest.fn((fn: (m: typeof manager) => Promise<unknown>) =>
      fn(manager),
    ),
  };

  const service = new PagosService(
    solicitudes as unknown as Repository<SolicitudRetiro>,
    pagosRepo as unknown as Repository<PagoWebpay>,
    dataSource as unknown as DataSource,
    creditos as unknown as CreditosService,
    auditoria as unknown as AuditoriaService,
    cliente,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    pagos.length = 0;
    fallarAlGuardarSolicitud = false;
    guardada = solicitud();
    process.env.FRONTEND_URL = 'http://localhost:5173';
    crear.mockResolvedValue({
      token: 'token-1',
      url: 'https://webpay3gint.transbank.cl/pagar',
    });
    confirmar.mockImplementation(() =>
      Promise.resolve(
        confirmada({
          buyOrder: pagos[pagos.length - 1]?.buyOrder ?? 'orden',
        }),
      ),
    );
    consultarEstado.mockImplementation(() =>
      Promise.resolve(
        confirmada({
          buyOrder: pagos[pagos.length - 1]?.buyOrder ?? 'orden',
        }),
      ),
    );
    reversar.mockResolvedValue(undefined);
  });

  afterAll(() => {
    restaurar('FRONTEND_URL', frontend);
  });

  it('inicia el cobro solo si la solicitud aprobada es del vecino y está pendiente', async () => {
    await expect(service.iniciar(VECINO, 7, RETORNO)).resolves.toEqual({
      token: 'token-1',
      url: 'https://webpay3gint.transbank.cl/pagar',
    });
    expect(crear).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-zA-Z0-9]{1,26}$/),
      expect.any(String),
      15000,
      RETORNO,
    );
    expect(pagos).toHaveLength(1);
    expect(pagos[0]).toMatchObject({
      token: 'token-1',
      monto: 15000,
      estado: EstadoIntentoPago.INICIADO,
    });
  });

  it('no cobra si no es suya, si no está aprobada, si el monto es 0 o si ya se pagó', async () => {
    guardada = solicitud({ usuarioCiudadanoId: 'otro' });
    await expect(service.iniciar(VECINO, 7, RETORNO)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    guardada = solicitud({ estado: EstadoSolicitudRetiro.EN_REVISION });
    await expect(service.iniciar(VECINO, 7, RETORNO)).rejects.toBeInstanceOf(
      ConflictException,
    );

    guardada = solicitud({
      monto: 0,
      estadoPago: EstadoPagoSolicitud.NO_APLICA,
    });
    await expect(service.iniciar(VECINO, 7, RETORNO)).rejects.toBeInstanceOf(
      ConflictException,
    );

    guardada = solicitud({ estadoPago: EstadoPagoSolicitud.PAGADO });
    await expect(service.iniciar(VECINO, 7, RETORNO)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(crear).not.toHaveBeenCalled();
  });

  it('al confirmar, deja el pago en pagado y otorga los créditos una sola vez', async () => {
    await service.iniciar(VECINO, 7, RETORNO);

    const primera = await service.procesarRetorno({ token_ws: 'token-1' });
    const segunda = await service.procesarRetorno({ token_ws: 'token-1' });

    expect(primera).toBe('http://localhost:5173/pago/7?resultado=aprobado');
    expect(segunda).toBe(primera);
    expect(guardada.estadoPago).toBe(EstadoPagoSolicitud.PAGADO);
    expect(pagos[0].codigoAutorizacion).toBe('123456');
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(creditos.otorgarPorPago).toHaveBeenCalledTimes(1);
    expect(creditos.otorgarPorPago).toHaveBeenCalledWith(manager, guardada);
    const llamada = auditoria.registrar.mock.calls.find(
      (args) =>
        (args[0] as { entidadId?: number }).entidadId === 7 &&
        (args[0] as { datosNuevos?: { resultado?: string } }).datosNuevos
          ?.resultado === 'aprobado',
    );
    expect(llamada).toBeDefined();
    expect(llamada?.[0]).toMatchObject({
      entidad: 'solicitudes_retiro',
      entidadId: 7,
      datosNuevos: {
        estadoPago: EstadoPagoSolicitud.PAGADO,
        resultado: 'aprobado',
      },
    });
    expect(JSON.stringify(auditoria.registrar.mock.calls)).not.toContain(
      'token-1',
    );
  });

  it('si Transbank autoriza y la base falla, un reintento cierra con status', async () => {
    await service.iniciar(VECINO, 7, RETORNO);
    fallarAlGuardarSolicitud = true;

    await expect(
      service.procesarRetorno({ token_ws: 'token-1' }),
    ).rejects.toBeDefined();
    expect(creditos.otorgarPorPago).not.toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalled();

    // El mock muta el objeto en memoria; en una BD real el rollback dejaría
    // el intento en iniciado y el pago pendiente.
    guardada.estadoPago = EstadoPagoSolicitud.PENDIENTE;
    pagos[0].estado = EstadoIntentoPago.INICIADO;
    pagos[0].codigoAutorizacion = null;
    pagos[0].fechaTransaccion = null;
    fallarAlGuardarSolicitud = false;
    confirmar.mockRejectedValueOnce(new Error('token ya usado'));
    consultarEstado.mockResolvedValueOnce(
      confirmada({ buyOrder: pagos[0].buyOrder }),
    );

    await expect(
      service.procesarRetorno({ token_ws: 'token-1' }),
    ).resolves.toBe('http://localhost:5173/pago/7?resultado=aprobado');

    expect(consultarEstado).toHaveBeenCalledWith('token-1');
    expect(guardada.estadoPago).toBe(EstadoPagoSolicitud.PAGADO);
    expect(pagos[0].estado).toBe(EstadoIntentoPago.AUTORIZADO);
    expect(creditos.otorgarPorPago).toHaveBeenCalledTimes(1);
  });

  it('si el monto no coincide, no marca pagado, no otorga créditos y reversa', async () => {
    await service.iniciar(VECINO, 7, RETORNO);
    confirmar.mockResolvedValue(
      confirmada({ amount: 1, buyOrder: pagos[0].buyOrder }),
    );

    await expect(
      service.procesarRetorno({ token_ws: 'token-1' }),
    ).resolves.toBe('http://localhost:5173/pago/7?resultado=rechazado');

    expect(guardada.estadoPago).toBe(EstadoPagoSolicitud.PENDIENTE);
    expect(pagos[0].estado).toBe(EstadoIntentoPago.RECHAZADO);
    expect(reversar).toHaveBeenCalledWith('token-1', 1);
    expect(creditos.otorgarPorPago).not.toHaveBeenCalled();
  });

  it('si la orden no coincide, reversa y no cobra', async () => {
    await service.iniciar(VECINO, 7, RETORNO);
    confirmar.mockResolvedValue(confirmada({ buyOrder: 'otra' }));

    await service.procesarRetorno({ token_ws: 'token-1' });

    expect(guardada.estadoPago).toBe(EstadoPagoSolicitud.PENDIENTE);
    expect(reversar).toHaveBeenCalledWith('token-1', 15000);
    expect(creditos.otorgarPorPago).not.toHaveBeenCalled();
  });

  it('anular o agotar el tiempo no confirma ni cobra', async () => {
    await service.iniciar(VECINO, 7, RETORNO);
    const orden = pagos[0].buyOrder;
    const sesion = pagos[0].sessionId;

    const anulada = await service.procesarRetorno({
      TBK_TOKEN: 'token-1',
      TBK_ORDEN_COMPRA: orden,
      TBK_ID_SESION: sesion,
    });
    expect(anulada).toBe('http://localhost:5173/pago/7?resultado=anulado');
    expect(pagos[0].estado).toBe(EstadoIntentoPago.ANULADO);

    pagos[0].estado = EstadoIntentoPago.INICIADO;
    const agotada = await service.procesarRetorno({
      token_ws: 'token-1',
      TBK_TOKEN: 'token-1',
      TBK_ORDEN_COMPRA: orden,
      TBK_ID_SESION: sesion,
    });
    expect(agotada).toBe('http://localhost:5173/pago/7?resultado=agotado');

    pagos[0].estado = EstadoIntentoPago.INICIADO;
    await expect(
      service.procesarRetorno({
        TBK_ORDEN_COMPRA: orden,
        TBK_ID_SESION: 'sesion-ajena',
      }),
    ).resolves.toBeNull();
    expect(pagos[0].estado).toBe(EstadoIntentoPago.INICIADO);
    expect(confirmar).not.toHaveBeenCalled();
    expect(guardada.estadoPago).toBe(EstadoPagoSolicitud.PENDIENTE);
    expect(creditos.otorgarPorPago).not.toHaveBeenCalled();
  });

  it('un segundo intento autorizado se reversa si la solicitud ya estaba pagada', async () => {
    await service.iniciar(VECINO, 7, RETORNO);
    await service.procesarRetorno({ token_ws: 'token-1' });

    crear.mockResolvedValue({
      token: 'token-2',
      url: 'https://webpay3gint.transbank.cl/pagar',
    });
    guardada.estadoPago = EstadoPagoSolicitud.PENDIENTE;
    await service.iniciar(VECINO, 7, RETORNO);
    guardada.estadoPago = EstadoPagoSolicitud.PAGADO;
    confirmar.mockResolvedValue(confirmada({ buyOrder: pagos[1].buyOrder }));

    await expect(
      service.procesarRetorno({ token_ws: 'token-2' }),
    ).resolves.toBe('http://localhost:5173/pago/7?resultado=rechazado');
    expect(reversar).toHaveBeenCalledWith('token-2', 15000);
    expect(creditos.otorgarPorPago).toHaveBeenCalledTimes(1);
  });

  it('un rechazo de la tarjeta no reversa ni cobra', async () => {
    await service.iniciar(VECINO, 7, RETORNO);
    confirmar.mockResolvedValue(
      confirmada({
        status: 'FAILED',
        responseCode: -1,
        buyOrder: pagos[0].buyOrder,
      }),
    );

    await service.procesarRetorno({ token_ws: 'token-1' });

    expect(reversar).not.toHaveBeenCalled();
    expect(creditos.otorgarPorPago).not.toHaveBeenCalled();
    expect(guardada.estadoPago).toBe(EstadoPagoSolicitud.PENDIENTE);
    expect(pagos[0].estado).toBe(EstadoIntentoPago.RECHAZADO);
  });
});

function solicitud(parcial: Partial<SolicitudRetiro> = {}): SolicitudRetiro {
  return {
    id: 7,
    usuarioCiudadanoId: VECINO.ciudadanoId,
    estado: EstadoSolicitudRetiro.APROBADA,
    estadoPago: EstadoPagoSolicitud.PENDIENTE,
    monto: 15000,
    ...parcial,
  } as SolicitudRetiro;
}

function confirmada(
  parcial: Partial<TransaccionConfirmada> = {},
): TransaccionConfirmada {
  return {
    status: 'AUTHORIZED',
    responseCode: 0,
    amount: 15000,
    buyOrder: 'orden',
    authorizationCode: '123456',
    transactionDate: new Date('2026-10-26T15:00:00.000Z'),
    ...parcial,
  };
}

function buscar(
  lista: PagoWebpay[],
  where: Partial<PagoWebpay>,
): PagoWebpay | null {
  const encontrados = lista.filter((pago) =>
    Object.entries(where).every(
      ([clave, valor]) =>
        (pago as unknown as Record<string, unknown>)[clave] === valor,
    ),
  );
  return encontrados[encontrados.length - 1] ?? null;
}

function restaurar(clave: string, valor: string | undefined): void {
  if (valor === undefined) delete process.env[clave];
  else process.env[clave] = valor;
}
