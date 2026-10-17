import type { Socket } from 'socket.io';
import { COOKIE_SESION, type AuthUser, type SesionService } from '../../core';
import { MarketplaceChatGateway } from './marketplace-chat.gateway';

const YO = '00000000-0000-4000-8000-000000000001';
const ORIGEN = 'https://arca.santodomingo.cl';

describe('MarketplaceChatGateway.handleConnection', () => {
  const urlAnterior = process.env.FRONTEND_URL;
  beforeAll(() => {
    process.env.FRONTEND_URL = ORIGEN;
  });
  afterAll(() => {
    if (urlAnterior === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = urlAnterior;
  });

  function montar(
    headers: Record<string, string>,
    sesion: AuthUser | null,
    falla = false,
  ) {
    const validar = jest.fn(() =>
      falla ? Promise.reject(new Error('db')) : Promise.resolve(sesion),
    );
    const gateway = new MarketplaceChatGateway({
      validar,
    } as unknown as SesionService);
    const cliente = {
      handshake: { headers },
      disconnect: jest.fn(),
      join: jest.fn(() => Promise.resolve()),
    };
    return { gateway, cliente, validar };
  }
  const conectar = (g: MarketplaceChatGateway, c: unknown) =>
    g.handleConnection(c as Socket);
  const usuario = { ciudadanoId: YO } as AuthUser;
  const cookie = `${COOKIE_SESION}=abc`;

  it('corta un Origin ajeno sin consultar la sesión', async () => {
    const { gateway, cliente, validar } = montar(
      { origin: 'https://evil.example', cookie },
      usuario,
    );

    await conectar(gateway, cliente);

    expect(cliente.disconnect).toHaveBeenCalledWith(true);
    expect(validar).not.toHaveBeenCalled();
  });

  it('corta si no hay sesión válida', async () => {
    const { gateway, cliente, validar } = montar({ origin: ORIGEN }, null);

    await conectar(gateway, cliente);

    expect(validar).toHaveBeenCalledWith(undefined);
    expect(cliente.disconnect).toHaveBeenCalledWith(true);
    expect(cliente.join).not.toHaveBeenCalled();
  });

  it('une al vecino a su sala con cookie válida y Origin permitido', async () => {
    const { gateway, cliente } = montar({ origin: ORIGEN, cookie }, usuario);

    await conectar(gateway, cliente);

    expect(cliente.join).toHaveBeenCalledWith(`usuario:${YO}`);
    expect(cliente.disconnect).not.toHaveBeenCalled();
  });

  it('sin Origin y con cookie válida también entra', async () => {
    const { gateway, cliente } = montar({ cookie }, usuario);

    await conectar(gateway, cliente);

    expect(cliente.join).toHaveBeenCalledWith(`usuario:${YO}`);
  });

  it('si validar lanza, desconecta y no rechaza', async () => {
    const { gateway, cliente } = montar({ origin: ORIGEN, cookie }, null, true);

    await expect(conectar(gateway, cliente)).resolves.toBeUndefined();

    expect(cliente.disconnect).toHaveBeenCalledWith(true);
    expect(cliente.join).not.toHaveBeenCalled();
  });
});
