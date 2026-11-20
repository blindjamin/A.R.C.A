import { verificarWebpayEnv } from './verificar-webpay-env';

describe('verificarWebpayEnv', () => {
  it('en producción sin WEBPAY_ENV no arranca', () => {
    expect(() => verificarWebpayEnv({ NODE_ENV: 'production' })).toThrow(
      /WEBPAY_ENV/,
    );
  });

  it('en producción acepta integration o production', () => {
    expect(() =>
      verificarWebpayEnv({ NODE_ENV: 'production', WEBPAY_ENV: 'integration' }),
    ).not.toThrow();
    expect(() =>
      verificarWebpayEnv({ NODE_ENV: 'production', WEBPAY_ENV: 'production' }),
    ).not.toThrow();
  });

  it('en desarrollo no exige la variable', () => {
    expect(() => verificarWebpayEnv({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => verificarWebpayEnv({})).not.toThrow();
  });
});
