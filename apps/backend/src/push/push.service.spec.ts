import { BadRequestException } from '@nestjs/common';
import webpush from 'web-push';
import type { Repository } from 'typeorm';
import type { AuthUser, SuscripcionPush } from '../core';
import { esEndpointPermitido, PushService } from './push.service';

jest.mock('web-push');

const YO = '00000000-0000-4000-8000-000000000001';
const user = { ciudadanoId: YO } as AuthUser;
const AVISO = { titulo: 'Sofá', cuerpo: 'Hola', url: '/x', tag: 't' };
const FILA = {
  id: 7,
  endpoint: 'https://fcm.googleapis.com/fcm/send/x',
  p256dh: 'p',
  auth: 'a',
} as SuscripcionPush;

function montar(conClaves = true) {
  const entorno = process.env;
  process.env = {
    ...entorno,
    VAPID_PUBLIC_KEY: conClaves ? 'pub' : '',
    VAPID_PRIVATE_KEY: conClaves ? 'priv' : '',
    VAPID_SUBJECT: conClaves ? 'mailto:a@b.cl' : '',
  };
  const qb: Record<
    'insert' | 'values' | 'orUpdate' | 'updateEntity',
    jest.Mock
  > & {
    execute: jest.Mock;
  } = {
    insert: jest.fn(),
    values: jest.fn(),
    orUpdate: jest.fn(),
    updateEntity: jest.fn(),
    execute: jest.fn(() => Promise.resolve({})),
  };
  for (const m of ['insert', 'values', 'orUpdate', 'updateEntity'] as const) {
    qb[m].mockReturnValue(qb);
  }
  const repo = {
    find: jest.fn(() => Promise.resolve([FILA])),
    createQueryBuilder: jest.fn(() => qb),
    delete: jest.fn(() => Promise.resolve({})),
  };
  const service = new PushService(
    repo as unknown as Repository<SuscripcionPush>,
  );
  process.env = entorno;
  return { service, repo, qb };
}

describe('esEndpointPermitido', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/x',
    'https://wns2-par02p.notify.windows.com/w/?token=x',
  ])('acepta %s', (e) => expect(esEndpointPermitido(e)).toBe(true));

  it.each([
    'http://fcm.googleapis.com/fcm/send/x',
    'https://169.254.169.254/',
    'https://fcm.googleapis.com.evil.com/',
    'https://localhost/',
    'https://fcm.googleapis.com:8443/x',
    'https://evil@fcm.googleapis.com/x',
  ])('rechaza %s', (e) => expect(esEndpointPermitido(e)).toBe(false));
});

describe('PushService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('suscribir rechaza un endpoint no permitido', async () => {
    const { service } = montar();

    await expect(
      service.suscribir(user, {
        endpoint: 'https://169.254.169.254/',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  const VALIDA = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/x',
    keys: { p256dh: 'nueva', auth: 'nueva-auth' },
  };

  it('al pasar el tope borra la suscripción más antigua', async () => {
    const { service, repo } = montar();
    repo.find.mockResolvedValue(
      [6, 5, 4, 3, 2, 1].map((id) => ({ id }) as SuscripcionPush),
    );

    await service.suscribir(user, VALIDA);

    expect(repo.delete).toHaveBeenCalledWith([1]);
  });

  it('reasigna al vecino actual un dispositivo ya registrado', async () => {
    const { service, qb } = montar();

    await service.suscribir(user, VALIDA);

    expect(qb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioCiudadanoId: YO,
        endpoint: VALIDA.endpoint,
        p256dh: 'nueva',
        auth: 'nueva-auth',
      }),
    );
    expect(qb.orUpdate).toHaveBeenCalledWith(
      ['usuario_ciudadano_id', 'p256dh', 'auth'],
      ['endpoint'],
    );
    expect(qb.updateEntity).toHaveBeenCalledWith(false);
  });

  it('con error 410 borra la suscripción', async () => {
    const { service, repo } = montar();
    (webpush.sendNotification as jest.Mock).mockRejectedValue({
      statusCode: 410,
    });

    await service.enviarA(YO, AVISO);

    expect(repo.delete).toHaveBeenCalledWith({ id: 7 });
  });

  it('con error 500 no borra y no lanza', async () => {
    const { service, repo } = montar();
    (webpush.sendNotification as jest.Mock).mockRejectedValue({
      statusCode: 500,
    });

    await expect(service.enviarA(YO, AVISO)).resolves.toBeUndefined();
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('sin claves VAPID no envía nada', async () => {
    const { service } = montar(false);

    await service.enviarA(YO, AVISO);

    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });
});
