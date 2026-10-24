import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Not, type Repository } from 'typeorm';
import {
  type ArticuloMarketplace,
  type AuthUser,
  type AuditoriaService,
  type Calificacion,
  EstadoArticuloMarketplace,
  type InteresadoMarketplace,
  type MensajeMarketplace,
  type SesionService,
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

const fila = (cambios: Partial<InteresadoMarketplace> = {}) =>
  ({
    id: 5,
    articuloId: 10,
    usuarioInteresadoId: YO,
    createdAt: new Date('2026-10-01T11:00:00.000Z'),
    ...cambios,
  }) as InteresadoMarketplace;

function montar({
  encontrado = articulo(),
  // Fila de interés del vecino (interesado) o la elegida por id (publicador).
  primero = fila(),
  porId = null as InteresadoMarketplace | null,
  historial = [] as MensajeMarketplace[],
  enUltimoMinuto = 0,
  intereses = [] as InteresadoMarketplace[],
  interesesHoy = 0,
  altaNueva = true,
} = {}) {
  const articuloRepo = { findOne: jest.fn(() => Promise.resolve(encontrado)) };
  const interesadoRepo = {
    findOne: jest.fn((op: { where: { id?: number } }) =>
      Promise.resolve(op.where.id === undefined ? primero : porId),
    ),
    findOneOrFail: jest.fn(() => Promise.resolve(primero ?? fila())),
    find: jest.fn(() => Promise.resolve(intereses)),
    count: jest.fn(() => Promise.resolve(interesesHoy)),
    createQueryBuilder: jest.fn(() => {
      const qb = {
        insert: () => qb,
        values: () => qb,
        orIgnore: () => qb,
        execute: () =>
          Promise.resolve({ raw: { affectedRows: altaNueva ? 1 : 0 } }),
      };
      return qb;
    }),
  };
  const calificacionRepo = { find: jest.fn(() => Promise.resolve([])) };
  const sesionService = {
    nombreSesionActiva: jest.fn(() => Promise.resolve('Ana María')),
  };
  const auditoriaService = { registrar: jest.fn(() => Promise.resolve()) };
  const mensajeRepo = {
    count: jest.fn(() => Promise.resolve(enUltimoMinuto)),
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
    interesadoRepo as unknown as Repository<InteresadoMarketplace>,
    calificacionRepo as unknown as Repository<Calificacion>,
    gateway as unknown as MarketplaceChatGateway,
    pushService as unknown as PushService,
    sesionService as unknown as SesionService,
    auditoriaService as unknown as AuditoriaService,
  );
  return {
    service,
    mensajeRepo,
    interesadoRepo,
    gateway,
    pushService,
    auditoriaService,
  };
}

describe('MarketplaceChatService.enviar', () => {
  it('el interesado escribe en un artículo disponible', async () => {
    const { service, mensajeRepo } = montar();

    const r = await service.enviar(10, {}, 'Hola', usuario(YO));

    expect(mensajeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ interesadoId: YO, usuarioRemitenteId: YO }),
    );
    expect(r.conversacionId).toBe(5);
    expect(r.mensaje.esMio).toBe(true);
  });

  it('el publicador responde una conversación existente', async () => {
    const { service, mensajeRepo, interesadoRepo } = montar({
      porId: fila({ id: 9, usuarioInteresadoId: OTRO }),
    });

    const r = await service.enviar(
      10,
      { conversacion: 9 },
      'Hola',
      usuario(VECINA),
    );

    expect(interesadoRepo.findOne).toHaveBeenCalledWith(
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
        titulo: 'Sofá',
        cuerpo: 'Ana te escribió',
        url: '/marketplace/10/chat/5',
        tag: 'chat-5',
      }),
    );
  });

  it('el aviso push no lleva el texto del mensaje', async () => {
    const { service, gateway, pushService } = montar();
    gateway.estaConectado.mockReturnValue(false);

    await service.enviar(10, {}, 'mi dirección es Calle 123', usuario(YO));

    expect(JSON.stringify(pushService.enviarA.mock.calls)).not.toContain(
      'Calle 123',
    );
  });

  it('con el destinatario conectado no manda push', async () => {
    const { service, gateway, pushService } = montar();
    gateway.estaConectado.mockReturnValue(true);

    await service.enviar(10, {}, 'Hola', usuario(YO));

    expect(pushService.enviarA).not.toHaveBeenCalled();
  });

  it('avisa al otro participante al marcar leídos', async () => {
    const { service, gateway } = montar();

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
      primero: null,
      encontrado: articulo({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: OTRO,
      }),
    });

    await expect(
      service.enviar(10, {}, 'Hola', usuario(YO)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sin haber dicho que le interesa no puede escribir (403)', async () => {
    const { service, mensajeRepo } = montar({ primero: null });

    await expect(
      service.enviar(10, {}, 'Hola', usuario(YO)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mensajeRepo.save).not.toHaveBeenCalled();
  });

  it('el publicador inicia la conversación aunque no haya mensajes', async () => {
    const { service, mensajeRepo } = montar({
      porId: fila({ id: 9, usuarioInteresadoId: OTRO }),
    });

    await service.enviar(10, { conversacion: 9 }, 'Hola', usuario(VECINA));

    expect(mensajeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        interesadoId: OTRO,
        usuarioRemitenteId: VECINA,
      }),
    );
  });

  it('429 al pasar el tope de mensajes por minuto', async () => {
    const { service, mensajeRepo } = montar({ enUltimoMinuto: 20 });

    const error = await service
      .enviar(10, {}, 'Hola', usuario(YO))
      .catch((e: HttpException) => e);

    expect((error as HttpException).getStatus()).toBe(429);
    expect(mensajeRepo.save).not.toHaveBeenCalled();
  });

  it.each([
    ['retirado', { estado: EstadoArticuloMarketplace.RETIRADO }],
    ['completado', { estado: EstadoArticuloMarketplace.COMPLETADO }],
    ['vencido', { fechaExpiracion: new Date(Date.now() - 1000) }],
  ])('no deja escribir si está %s', async (_nombre, cambios) => {
    const { service } = montar({ encontrado: articulo(cambios) });

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
    const { service, mensajeRepo } = montar();

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
      historial: [mensaje({ usuarioRemitenteId: VECINA })],
    });

    const h = await service.historial(10, {}, usuario(YO));

    expect(Object.keys(h.mensajes[0]).sort()).toEqual(
      ['contenido', 'esMio', 'fecha', 'id', 'leido'].sort(),
    );
    expect(h.otroNombre).toBe('Ana');
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

describe('MarketplaceChatService.registrarInteres', () => {
  it('crea el interés, devuelve la conversación y lo audita', async () => {
    const { service, auditoriaService } = montar({ primero: null });
    const r = await service.registrarInteres(10, usuario(YO));
    expect(r.conversacionId).toBe(5);
    expect(auditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ entidad: 'interesados_marketplace' }),
    );
  });

  it('es idempotente: repetir no cuenta contra el tope ni audita', async () => {
    const { service, auditoriaService } = montar({ interesesHoy: 20 });

    await expect(service.registrarInteres(10, usuario(YO))).resolves.toEqual({
      conversacionId: 5,
    });
    expect(auditoriaService.registrar).not.toHaveBeenCalled();
  });

  it('429 al llegar a 20 intereses nuevos en el día', async () => {
    const { service } = montar({ primero: null, interesesHoy: 20 });

    const error = await service
      .registrarInteres(10, usuario(YO))
      .catch((e: HttpException) => e);

    expect((error as HttpException).getStatus()).toBe(429);
  });

  it('403 si el artículo es propio', async () => {
    const { service } = montar({ primero: null });

    await expect(
      service.registrarInteres(10, usuario(VECINA)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('409 si ya no está disponible', async () => {
    const { service } = montar({
      primero: null,
      encontrado: articulo({ estado: EstadoArticuloMarketplace.RETIRADO }),
    });

    await expect(
      service.registrarInteres(10, usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('MarketplaceChatService.interesados', () => {
  it('lista a los interesados con nombre, sin ids de vecinos', async () => {
    const { service } = montar({
      intereses: [fila({ usuarioInteresadoId: OTRO })],
    });

    const r = await service.interesados(10, usuario(VECINA));

    expect(r).toEqual([
      expect.objectContaining({
        conversacionId: 5,
        nombre: 'Ana',
        identidadVerificada: true,
        ultimoMensaje: null,
        reservado: false,
      }),
    ]);
    expect(JSON.stringify(r)).not.toContain(OTRO);
  });

  it('403 si no es el publicador', async () => {
    const { service } = montar();

    await expect(service.interesados(10, usuario(YO))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
