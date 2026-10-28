import { clasificarVueltaWebpay } from './clasificar-vuelta-webpay';

describe('clasificarVueltaWebpay', () => {
  it('confirma solo cuando vuelve token_ws', () => {
    expect(clasificarVueltaWebpay({ token_ws: 'abc' })).toEqual({
      tipo: 'confirmar',
      token: 'abc',
    });
  });

  it('no confirma si el vecino anuló en el formulario', () => {
    expect(
      clasificarVueltaWebpay({
        TBK_TOKEN: 'abc',
        TBK_ORDEN_COMPRA: 'orden1',
        TBK_ID_SESION: 'sesion1',
      }),
    ).toEqual({ tipo: 'anulado', orden: 'orden1', sesion: 'sesion1' });
  });

  it('no confirma si se agotó el tiempo con ambos tokens', () => {
    expect(
      clasificarVueltaWebpay({
        token_ws: 'abc',
        TBK_TOKEN: 'abc',
        TBK_ORDEN_COMPRA: 'orden1',
        TBK_ID_SESION: 'sesion1',
      }),
    ).toEqual({ tipo: 'agotado', orden: 'orden1', sesion: 'sesion1' });
  });

  it('no confirma si se agotó el tiempo antes del formulario', () => {
    expect(
      clasificarVueltaWebpay({
        TBK_ORDEN_COMPRA: 'orden1',
        TBK_ID_SESION: 'sesion1',
      }),
    ).toEqual({ tipo: 'agotado', orden: 'orden1', sesion: 'sesion1' });
  });

  it('rechaza una vuelta irreconocible y un timeout sin orden', () => {
    expect(clasificarVueltaWebpay({})).toEqual({ tipo: 'invalida' });
    expect(
      clasificarVueltaWebpay({ token_ws: 'abc', TBK_TOKEN: 'abc' }),
    ).toEqual({ tipo: 'invalida' });
  });
});
