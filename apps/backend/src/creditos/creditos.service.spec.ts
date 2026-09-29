import type { EntityManager, Repository } from 'typeorm';
import {
  OrigenMovimientoCreditos,
  TipoMovimientoCreditos,
  type TransaccionCircularCredits,
  UsuarioCiudadano,
} from '../core';
import { CreditosService } from './creditos.service';

const REGALA = '00000000-0000-4000-8000-000000000003';
const RECIBE = '00000000-0000-4000-8000-000000000002';

const ARTICULO = {
  id: 7,
  titulo: 'Sofá',
  usuarioPublicadorId: REGALA,
  usuarioCompradorId: RECIBE,
};

function montar({
  saldo = null as number | null,
  ganadoMes = 0,
  generadoPareja = 0,
  historial = [] as Partial<TransaccionCircularCredits>[],
} = {}) {
  const manager = {
    find: jest.fn(() => Promise.resolve([])),
    findOne: jest.fn(() =>
      Promise.resolve(saldo === null ? null : { saldoNuevo: saldo }),
    ),
    // La suma con una lista de condiciones es la de la pareja.
    sum: jest.fn((_entidad: unknown, _columna: string, where: unknown) =>
      Promise.resolve(Array.isArray(where) ? generadoPareja : ganadoMes),
    ),
    create: jest.fn((_entidad: unknown, datos: object) => ({ ...datos })),
    save: jest.fn((t: object) => Promise.resolve({ ...t, id: 1 })),
  };
  const repositorio = {
    find: jest.fn(() => Promise.resolve(historial)),
  };
  const service = new CreditosService(
    repositorio as unknown as Repository<TransaccionCircularCredits>,
  );
  return {
    service,
    manager,
    em: manager as unknown as EntityManager,
    repositorio,
  };
}

describe('CreditosService.otorgarPorEntrega', () => {
  it('da VALOR_BASE a quien regaló, sobre el saldo anterior', async () => {
    const { service, em, manager } = montar({ saldo: 200 });

    const movimiento = await service.otorgarPorEntrega(em, ARTICULO);

    expect(movimiento).toMatchObject({
      usuarioCiudadanoId: REGALA,
      articuloId: 7,
      montoCreditos: 100,
      tipo: TipoMovimientoCreditos.BONIFICACION,
      origen: OrigenMovimientoCreditos.ENTREGA,
      razon: 'Entrega de «Sofá»',
      saldoAnterior: 200,
      saldoNuevo: 300,
    });
    expect(manager.save).toHaveBeenCalledTimes(1);
  });

  it('primer movimiento: parte de saldo 0', async () => {
    const { service, em } = montar();

    const movimiento = await service.otorgarPorEntrega(em, ARTICULO);

    expect(movimiento).toMatchObject({ saldoAnterior: 0, saldoNuevo: 100 });
  });

  it('bloquea a los dos vecinos, en orden de id, antes de leer el saldo', async () => {
    const { service, em, manager } = montar();

    await service.otorgarPorEntrega(em, ARTICULO);

    const [entidad, opciones] = manager.find.mock.calls[0] as unknown as [
      unknown,
      { where: { id: { value: string[] } }; lock: unknown },
    ];
    expect(entidad).toBe(UsuarioCiudadano);
    expect(opciones.where.id.value).toEqual([RECIBE, REGALA]);
    expect(opciones.lock).toEqual({ mode: 'pessimistic_write' });
    expect(manager.find.mock.invocationCallOrder[0]).toBeLessThan(
      manager.findOne.mock.invocationCallOrder[0],
    );
  });

  it('con el tope por pareja lleno registra un movimiento de 0 con el motivo', async () => {
    const { service, em } = montar({
      saldo: 400,
      ganadoMes: 400,
      generadoPareja: 400,
    });

    const movimiento = await service.otorgarPorEntrega(em, ARTICULO);

    expect(movimiento).toMatchObject({
      montoCreditos: 0,
      saldoAnterior: 400,
      saldoNuevo: 400,
      razon: 'Entrega de «Sofá» (se alcanzó el tope por pareja)',
    });
  });

  it('otorga hasta completar el tope mensual', async () => {
    const { service, em } = montar({ saldo: 950, ganadoMes: 950 });

    const movimiento = await service.otorgarPorEntrega(em, ARTICULO);

    expect(movimiento).toMatchObject({
      montoCreditos: 50,
      saldoNuevo: 1000,
      razon: 'Entrega de «Sofá» (se alcanzó el tope mensual)',
    });
  });

  it('la suma que devuelve MySQL como texto se toma como número', async () => {
    const { service, em, manager } = montar({ saldo: 0 });
    manager.sum.mockImplementation(
      (_entidad: unknown, _columna: string, where: unknown) =>
        Promise.resolve(
          (Array.isArray(where) ? '0' : '950') as unknown as number,
        ),
    );

    const movimiento = await service.otorgarPorEntrega(em, ARTICULO);

    expect(movimiento.montoCreditos).toBe(50);
  });
});

describe('CreditosService.otorgarPorEstrellas', () => {
  it('5 estrellas dan 100 a quien regaló', async () => {
    const { service, em } = montar({ saldo: 100 });

    const movimiento = await service.otorgarPorEstrellas(em, ARTICULO, 5);

    expect(movimiento).toMatchObject({
      usuarioCiudadanoId: REGALA,
      montoCreditos: 100,
      origen: OrigenMovimientoCreditos.ESTRELLAS,
      razon: '5 estrellas por «Sofá»',
      saldoNuevo: 200,
    });
  });

  it('con 3 estrellas o menos no hay movimiento', async () => {
    const { service, em, manager } = montar();

    expect(await service.otorgarPorEstrellas(em, ARTICULO, 3)).toBeNull();
    expect(manager.find).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
  });
});

describe('CreditosService.otorgarPorRetirada', () => {
  it('da 50 al solicitante, sin tope por pareja', async () => {
    const { service, em, manager } = montar({ saldo: 0 });

    const movimiento = await service.otorgarPorRetirada(em, 12, RECIBE);

    expect(movimiento).toMatchObject({
      usuarioCiudadanoId: RECIBE,
      solicitudRetiroId: 12,
      articuloId: null,
      montoCreditos: 50,
      origen: OrigenMovimientoCreditos.RETIRADA,
    });
    const sumas = manager.sum.mock.calls as unknown as [
      unknown,
      string,
      unknown,
    ][];
    expect(sumas.some(([, , where]) => Array.isArray(where))).toBe(false);
  });
});

describe('CreditosService.resumen', () => {
  it('saldo del último movimiento y la lista más reciente primero', async () => {
    const fecha = new Date('2026-09-30T15:04:00.000Z');
    const { service, repositorio } = montar({
      historial: [
        {
          id: 12,
          montoCreditos: 100,
          origen: OrigenMovimientoCreditos.ENTREGA,
          razon: 'Entrega de «Sofá»',
          saldoAnterior: 200,
          saldoNuevo: 300,
          fechaTransaccion: fecha,
        },
      ],
    });

    const resumen = await service.resumen(REGALA);

    expect(repositorio.find).toHaveBeenCalledWith({
      where: { usuarioCiudadanoId: REGALA },
      order: { id: 'DESC' },
    });
    expect(resumen).toEqual({
      saldo: 300,
      movimientos: [
        {
          id: 12,
          monto: 100,
          origen: 'entrega',
          motivo: 'Entrega de «Sofá»',
          saldoAnterior: 200,
          saldoNuevo: 300,
          fecha,
        },
      ],
    });
  });

  it('sin movimientos, saldo 0', async () => {
    const { service } = montar();
    expect(await service.resumen(REGALA)).toEqual({
      saldo: 0,
      movimientos: [],
    });
  });
});
