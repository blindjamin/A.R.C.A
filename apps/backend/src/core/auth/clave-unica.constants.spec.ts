import {
  CLAVE_UNICA_AUTHORIZE_URL,
  CLAVE_UNICA_BASE_URL,
  CLAVE_UNICA_LOGOUT_URL,
  CLAVE_UNICA_TOKEN_URL,
  CLAVE_UNICA_USERINFO_URL,
} from './clave-unica.constants';

/**
 * Requisito de certificación: todos los endpoints consumidos empiezan con
 * `accounts.claveunica.gob.cl`. Las URLs están escritas completas para la
 * evidencia, así que este test evita que una se desvíe al editarla.
 */
describe('Endpoints de ClaveÚnica', () => {
  it.each([
    ['authorize', CLAVE_UNICA_AUTHORIZE_URL, '/openid/authorize/'],
    ['token', CLAVE_UNICA_TOKEN_URL, '/openid/token/'],
    ['userinfo', CLAVE_UNICA_USERINFO_URL, '/openid/userinfo/'],
    ['logout', CLAVE_UNICA_LOGOUT_URL, '/api/v1/accounts/app/logout'],
  ])('%s cuelga de accounts.claveunica.gob.cl por HTTPS', (_, url, ruta) => {
    expect(url).toBe(`${CLAVE_UNICA_BASE_URL}${ruta}`);
    expect(new URL(url).protocol).toBe('https:');
  });
});
