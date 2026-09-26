import { loginDevHabilitado, verificarLoginDev } from './login-dev';

describe('verificarLoginDev', () => {
  it('lanza con ALLOW_DEV_LOGIN=true en producción', () => {
    expect(() =>
      verificarLoginDev({ ALLOW_DEV_LOGIN: 'true', NODE_ENV: 'production' }),
    ).toThrow(Error);
  });

  it.each([
    { ALLOW_DEV_LOGIN: 'true', NODE_ENV: 'development' },
    { ALLOW_DEV_LOGIN: 'false', NODE_ENV: 'production' },
    { NODE_ENV: 'development' },
  ])('no lanza con %o', (env) => {
    expect(() => verificarLoginDev(env)).not.toThrow();
  });
});

describe('loginDevHabilitado', () => {
  it('solo es verdadero con el texto exacto "true"', () => {
    expect(loginDevHabilitado({ ALLOW_DEV_LOGIN: 'true' })).toBe(true);
    expect(loginDevHabilitado({ ALLOW_DEV_LOGIN: '1' })).toBe(false);
    expect(loginDevHabilitado({})).toBe(false);
  });
});
