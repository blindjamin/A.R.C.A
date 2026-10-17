import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Not, type Repository } from 'typeorm';
import {
  type ArticuloMarketplace,
  type AuthUser,
  EstadoArticuloMarketplace,
  type MensajeMarketplace,
} from '../../core';
import type { PushService } from '../../push/push.service';
import { MarketplaceChatGateway } from './marketplace-chat.gateway';
import { MarketplaceChatService } from './marketplace-chat.service';
import { puedeEscribir } from './reglas-chat';

const YO = '00000000-0000-4000-8000-000000000001';
const VECINA = '00000000-0000-4000-8000-000000000002';
const OTRO = '00000000-0000-4000-8000-000000000003';

const usuario = (ciudadanoId: string): AuthUser => ({
  ciudadanoId,
  esAdministrador: false,
  administradorId: null,
  rol: null,
});

const articulo = (cambios: Partial<ArticuloMarketplace> = {}) =>
  ({
    id: 10,
    usuarioPublicadorId: VECINA,
    titulo: 'Sofá',
    estado: EstadoArticuloMarketplace.DISPONIBLE,
    fotoPath: 'marketplace/sofa.jpg',
    fechaExpiracion: new Date(Date.now() + 86_400_000),
    usuarioCompradorId: null,
    ...cambios,
  }) as ArticuloMarketplace;

const mensaje = (cambios: Partial<MensajeMarketplace> = {}) =>
  ({
    id: 5,
    articuloId: 10,
    interesadoId: YO,
    usuarioRemitenteId: YO,
    contenido: 'Hola',
    fechaMensaje: new Date('2026-10-01T12:00:00.000Z'),
    leido: false,
    ...cambios,
  }) as MensajeMarketplace;

function montar({
  encontrado = articulo(),
  primero = null as MensajeMarketplace | null,
  porId = null as MensajeMarketplace | null,
  historial = [] as MensajeMarketplace[],
} = {}) {
  const articuloRepo = { findOne: jest.fn(() => Promise.resolve(encontrado)) };
  const mensajeRepo = {
    // Por id (publicador) o primer mensaje de la conversación.
    findOne: jest.fn((op: { where: { id?: number } }) =>
      Promise.resolve(op.where.id === undefined ? primero : porId),
    ),
    find: jest.fn(() => Promise.resolve(historial)),
    create: jest.fn((d: Partial<MensajeMarketplace>) => ({ ...d })),
    save: jest.fn((m: Partial<MensajeMarketplace>) =>
      Promise.resolve({ ...m, id: 77 }),
    ),
    update: jest.fn(() => Promise.resolve({ affected: 2 })),
  };
  const gateway = {
    emitirMensaje: jest.fn(),
    emitirLeidos: jest.fn(),
    estaConectado: jest.fn(),
  };
  const pushService = { enviarA: jest.fn(() => Promise.resolve()) };
  const service = new MarketplaceChatService(
    articuloRepo as unknown as Repository<ArticuloMarketplace>,
    mensajeRepo as unknown as Repository<MensajeMarketplace>,
    gateway as unknown as MarketplaceChatGateway,
    pushService as unknown as PushService,
  );
  return { service, mensajeRepo, gateway, pushService };
}

describe('MarketplaceChatService.enviar', () => {
  it('el interesado escribe en un artículo disponible', async () => {
    const { service, mensajeRepo } = montar();

    const r = await service.enviar(10, {}, 'Hola', usuario(YO));

    expect(mensajeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ interesadoId: YO, usuarioRemitenteId: YO }),
    );
    expect(r.conversacionId).toBe(77);
    expect(r.mensaje.esMio).toBe(true);
  });

  it('el publicador responde una conversación existente', async () => {
    const { service, mensajeRepo } = montar({
      porId: mensaje({ id: 9, interesadoId: OTRO, usuarioRemitenteId: OTRO }),
      primero: mensaje({ id: 9, interesadoId: OTRO }),
    });

    const r = await service.enviar(
      10,
      { conversacion: 9 },
      'Hola',
      usuario(VECINA),
    );

    expect(mensajeRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 9, articuloId: 10 } }),
    );
    expect(mensajeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        interesadoId: OTRO,
        usuarioRemitenteId: VECINA,
      }),
    );
    expect(r.conversacionId).toBe(9);
  });

  it('emite el mensaje a ambas salas, cada una con su esMio', async () => {
    const { service, gateway } = montar();

    await service.enviar(10, {}, 'Hola', usuario(YO));

    const emitidos = gateway.emitirMensaje.mock.calls.map(
      ([vecino, evento]: [string, { mensaje: { esMio: boolean } }]) => [
        vecino,
        evento.mensaje.esMio,
      ],
    );
    expect(emitidos).toEqual([
      [YO, true],
      [VECINA, false],
    ]);
  });

  it('sin sockets del destinatario, le manda un aviso push', async () => {
    const { service, gateway, pushService } = montar();
    gateway.estaConectado.mockReturnValue(false);

    await service.enviar(10, {}, 'Hola', usuario(YO));

    expect(pushService.enviarA).toHaveBeenCalledWith(
      VECINA,
      expect.objectContaining({
        url: '/marketplace/10/chat/77',
        tag: 'chat-77',
      }),
    );
  });

  it('con el destinatario conectado no manda push', async () => {
    const { service, gateway, pushService } = montar();
    gateway.estaConectado.mockReturnValue(true);

    await service.enviar(10, {}, 'Hola', usuario(YO));

    expect(pushService.enviarA).not.toHaveBeenCalled();
  });

  it('avisa al otro participante al marcar leídos', async () => {
    const { service, gateway } = montar({ primero: mensaje() });

    await service.marcarLeidos(10, {}, usuario(YO));

    expect(gateway.emitirLeidos).toHaveBeenCalledWith(VECINA, {
      articuloId: 10,
      conversacionId: 5,
    });
  });

  it('el publicador sin conversación recibe 400', async () => {
    const { service } = montar();

    await expect(
      service.enviar(10, {}, 'Hola', usuario(VECINA)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('el publicador no puede iniciar una conversación inexistente', async () => {
    const { service } = montar({ porId: null });

    await expect(
      service.enviar(10, { conversacion: 999 }, 'Hola', usuario(VECINA)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('un tercero sin conversación no ve un artículo reservado por otro', async () => {
    const { service } = montar({
      encontrado: articulo({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: OTRO,
      }),
    });

    await expect(
      service.enviar(10, {}, 'Hola', usuario(YO)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['retirado', { estado: EstadoArticuloMarketplace.RETIRADO }],
    ['completado', { estado: EstadoArticuloMarketplace.COMPLETADO }],
    ['vencido', { fechaExpiracion: new Date(Date.now() - 1000) }],
  ])('no deja escribir si está %s', async (_nombre, cambios) => {
    const { service } = montar({
      encontrado: articulo(cambios),
      primero: mensaje(),
    });

    await expect(
      service.enviar(10, {}, 'Hola', usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('el comprador de un artículo en negociación puede escribir', async () => {
    const { service } = montar({
      encontrado: articulo({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: YO,
      }),
    });

    await expect(
      service.enviar(10, {}, 'Hola', usuario(YO)),
    ).resolves.toBeDefined();
  });
});

describe('MarketplaceChatService: tercero con conversación previa', () => {
  const reservadoPorOtro = articulo({
    estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
    usuarioCompradorId: OTRO,
  });

  it('lee su historial en solo lectura y sin foto; no puede enviar', async () => {
    const { service } = montar({
      encontrado: reservadoPorOtro,
      primero: mensaje(),
      historial: [mensaje()],
    });

    const h = await service.historial(10, {}, usuario(YO));
    expect(h.puedoEscribir).toBe(false);
    expect(h.articulo.fotoUrl).toBeNull();
    expect(h.conversacionId).toBe(5);

    await expect(
      service.enviar(10, {}, 'Hola', usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('MarketplaceChatService.marcarLeidos', () => {
  it('solo marca lo recibido y no leído', async () => {
    const { service, mensajeRepo } = montar({ primero: mensaje() });

    const r = await service.marcarLeidos(10, {}, usuario(YO));

    expect(r).toEqual({ marcados: 2 });
    expect(mensajeRepo.update).toHaveBeenCalledWith(
      {
        articuloId: 10,
        interesadoId: YO,
        usuarioRemitenteId: Not(YO),
        leido: false,
      },
      { leido: true },
    );
  });
});

describe('lista blanca de la respuesta', () => {
  it('un mensaje público tiene solo los campos permitidos y ningún UUID', async () => {
    const { service } = montar({
      primero: mensaje(),
      historial: [mensaje({ usuarioRemitenteId: VECINA })],
    });

    const h = await service.historial(10, {}, usuario(YO));

    expect(Object.keys(h.mensajes[0]).sort()).toEqual(
      ['contenido', 'esMio', 'fecha', 'id', 'leido'].sort(),
    );
    const json = JSON.stringify(h);
    expect(json).not.toContain(VECINA);
    expect(json).not.toContain(YO);
  });
});

describe('puedeEscribir', () => {
  it('reservado por otro vecino es solo lectura', () => {
    expect(
      puedeEscribir(
        {
          estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
          fechaExpiracion: new Date(Date.now() + 1000),
          usuarioCompradorId: OTRO,
        },
        YO,
        new Date(),
      ),
    ).toBe(false);
  });
});
