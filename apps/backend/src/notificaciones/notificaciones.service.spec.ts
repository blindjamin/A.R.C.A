import { IsNull, type Repository } from 'typeorm';
import { type AuthUser, type Notificacion } from '../core';
import type { PushService } from '../push/push.service';
import type { TiempoRealGateway } from '../tiempo-real/tiempo-real.gateway';
import {
  AVISOS_POR_PAGINA,
  NotificacionesService,
} from './notificaciones.service';

const YO = '00000000-0000-4000-8000-000000000001';
const usuario = { ciudadanoId: YO } as AuthUser;

const fila = (id: number, leidaEn: Date | null = null) =>
  ({
    id,
    usuarioCiudadanoId: YO,
    tipo: 'interes',
    titulo: 'Nuevo interesado',
    cuerpo: 'Carlos quiere tu Sillón',
    url: '/marketplace/3',
    leidaEn,
    createdAt: new Date('2026-10-24T12:00:00.000Z'),
  }) as Notificacion;

function montar({
  filas = [] as Notificacion[],
  noLeidos = 0,
  conectado = false,
  falla = false,
} = {}) {
  const repo = {
    create: jest.fn((d: Partial<Notificacion>) => d),
    save: jest.fn((d: Partial<Notificacion>) =>
      falla
        ? Promise.reject(new Error('db caída con datos'))
        : Promise.resolve({ ...fila(7), ...d }),
    ),
    find: jest.fn(() => Promise.resolve(filas)),
    count: jest.fn(() => Promise.resolve(noLeidos)),
    update: jest.fn(() => Promise.resolve({ affected: 3 })),
  };
  const gateway = {
    emitir: jest.fn(),
    estaConectado: jest.fn(() => conectado),
  };
  const push = { enviarA: jest.fn(() => Promise.resolve()) };
  const service = new NotificacionesService(
    repo as unknown as Repository<Notificacion>,
    gateway as unknown as TiempoRealGateway,
    push as unknown as PushService,
  );
  return { service, repo, gateway, push };
}

const AVISO = {
  tipo: 'interes',
  titulo: 'Nuevo interesado',
  cuerpo: 'Carlos quiere tu Sillón',
  url: '/marketplace/3',
};

describe('NotificacionesService.notificar', () => {
  it('guarda la fila y emite el aviso con la forma pública, sin ids de vecinos', async () => {
    const { service, repo, gateway } = montar({ conectado: true });

    await service.notificar(YO, AVISO);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioCiudadanoId: YO, ...AVISO }),
    );
    expect(gateway.emitir).toHaveBeenCalledWith(
      YO,
      'notificacion',
      expect.objectContaining({ id: 7, leido: false, ...AVISO }),
    );
    expect(
      JSON.stringify((gateway.emitir.mock.calls[0] as unknown[])[2]),
    ).not.toContain(YO);
  });

  it('sin pestañas abiertas manda push con tag aviso-<id>', async () => {
    const { service, push } = montar({ conectado: false });

    await service.notificar(YO, AVISO);

    expect(push.enviarA).toHaveBeenCalledWith(YO, {
      titulo: AVISO.titulo,
      cuerpo: AVISO.cuerpo,
      url: AVISO.url,
      tag: 'aviso-7',
    });
  });

  it('con el vecino conectado no manda push', async () => {
    const { service, push } = montar({ conectado: true });

    await service.notificar(YO, AVISO);

    expect(push.enviarA).not.toHaveBeenCalled();
  });

  it('no lanza si falla el repositorio ni loguea el texto del aviso', async () => {
    const { service, gateway, push } = montar({ falla: true });

    await expect(service.notificar(YO, AVISO)).resolves.toBeUndefined();
    expect(gateway.emitir).not.toHaveBeenCalled();
    expect(push.enviarA).not.toHaveBeenCalled();
  });
});

describe('NotificacionesService.listar', () => {
  it('devuelve la página, el conteo de no leídos y hayMas', async () => {
    const filas = Array.from({ length: AVISOS_POR_PAGINA + 1 }, (_, i) =>
      fila(100 - i, i === 0 ? null : new Date()),
    );
    const { service, repo } = montar({ filas, noLeidos: 4 });

    const r = await service.listar(usuario, 500);

    expect(r.avisos).toHaveLength(AVISOS_POR_PAGINA);
    expect(r.hayMas).toBe(true);
    expect(r.noLeidos).toBe(4);
    expect(r.avisos[0]).toEqual(
      expect.objectContaining({ id: 100, leido: false }),
    );
    expect(r.avisos[1].leido).toBe(true);
    expect(Object.keys(r.avisos[0]).sort()).toEqual(
      ['id', 'tipo', 'titulo', 'cuerpo', 'url', 'leido', 'fecha'].sort(),
    );
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { id: 'DESC' },
        take: AVISOS_POR_PAGINA + 1,
      }),
    );
  });

  it('última página: hayMas es false', async () => {
    const { service } = montar({ filas: [fila(3), fila(2)] });

    const r = await service.listar(usuario);

    expect(r.hayMas).toBe(false);
    expect(r.avisos).toHaveLength(2);
  });
});

describe('NotificacionesService.marcarLeidos', () => {
  it('marca solo los no leídos del vecino', async () => {
    const { service, repo } = montar();

    await expect(service.marcarLeidos(usuario)).resolves.toEqual({
      marcados: 3,
    });
    expect(repo.update).toHaveBeenCalledWith(
      { usuarioCiudadanoId: YO, leidaEn: IsNull() },
      { leidaEn: expect.any(Date) as Date },
    );
  });
});
