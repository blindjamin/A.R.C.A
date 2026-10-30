import {
  categoriasObjetos,
  leerObjetosPedidos,
  MAXIMO_OBJETOS_POR_SOLICITUD,
  ObjetosInvalidosError,
  precioSugerido,
  resumenObjetos,
} from './objetos-solicitud';

describe('leerObjetosPedidos', () => {
  it('sin lista, arma un objeto con los campos de antes', () => {
    expect(leerObjetosPedidos(undefined, { residuoCatalogoId: 3 })).toEqual([
      { residuoCatalogoId: 3, nombreOtro: null, cantidad: 1 },
    ]);
    expect(leerObjetosPedidos('', { nombreResiduoOtro: '  Piano  ' })).toEqual([
      { residuoCatalogoId: null, nombreOtro: 'Piano', cantidad: 1 },
    ]);
  });

  it('sin lista ni campos de antes, rechaza', () => {
    expect(() => leerObjetosPedidos(undefined, {})).toThrow(
      ObjetosInvalidosError,
    );
  });

  it('lee objetos del catálogo y fuera de él, con cantidad', () => {
    const json = JSON.stringify([
      { residuoCatalogoId: 2, cantidad: 3 },
      { nombreOtro: 'Hamaca de jardín' },
    ]);
    expect(leerObjetosPedidos(json, {})).toEqual([
      { residuoCatalogoId: 2, nombreOtro: null, cantidad: 3 },
      { residuoCatalogoId: null, nombreOtro: 'Hamaca de jardín', cantidad: 1 },
    ]);
  });

  it('si trae catálogo y nombre, manda el catálogo', () => {
    const json = JSON.stringify([{ residuoCatalogoId: 2, nombreOtro: 'x' }]);
    expect(leerObjetosPedidos(json, {})[0].nombreOtro).toBeNull();
  });

  it.each([
    ['JSON roto', '[{'],
    ['lista vacía', '[]'],
    ['no es lista', '{"residuoCatalogoId":1}'],
    ['cantidad 0', '[{"residuoCatalogoId":1,"cantidad":0}]'],
    ['cantidad 11', '[{"residuoCatalogoId":1,"cantidad":11}]'],
    ['cantidad decimal', '[{"residuoCatalogoId":1,"cantidad":1.5}]'],
    ['id como texto', '[{"residuoCatalogoId":"1"}]'],
    ['nombre vacío', '[{"nombreOtro":"   "}]'],
    ['nombre largo', JSON.stringify([{ nombreOtro: 'a'.repeat(151) }])],
    ['objeto nulo', '[null]'],
  ])('rechaza %s', (_caso, json) => {
    expect(() => leerObjetosPedidos(json, {})).toThrow(ObjetosInvalidosError);
  });

  it('pone un tope a la cantidad de objetos', () => {
    const lista = Array.from(
      { length: MAXIMO_OBJETOS_POR_SOLICITUD + 1 },
      () => ({ residuoCatalogoId: 1 }),
    );
    expect(() => leerObjetosPedidos(JSON.stringify(lista), {})).toThrow(
      ObjetosInvalidosError,
    );
  });
});

describe('precioSugerido', () => {
  const sillon = { nombre: 'Sillón', categoria: 'Muebles', precio: 5000 };
  const refri = {
    nombre: 'Refrigerador',
    categoria: 'Línea Blanca',
    precio: 8000,
  };

  it('suma precio por cantidad cuando todo es del catálogo', () => {
    expect(
      precioSugerido([
        { nombreOtro: null, cantidad: 2, residuoCatalogo: sillon },
        { nombreOtro: null, cantidad: 1, residuoCatalogo: refri },
      ]),
    ).toBe(18000);
  });

  it('con un objeto fuera del catálogo no sugiere nada', () => {
    expect(
      precioSugerido([
        { nombreOtro: null, cantidad: 1, residuoCatalogo: sillon },
        { nombreOtro: 'Piano', cantidad: 1, residuoCatalogo: null },
      ]),
    ).toBeNull();
  });

  it('sin objetos no sugiere nada', () => {
    expect(precioSugerido([])).toBeNull();
  });

  it('resume y junta las categorías sin repetir', () => {
    const objetos = [
      { nombreOtro: null, cantidad: 2, residuoCatalogo: sillon },
      {
        nombreOtro: null,
        cantidad: 1,
        residuoCatalogo: { ...sillon, nombre: 'Mesa' },
      },
      { nombreOtro: 'Piano', cantidad: 1, residuoCatalogo: null },
    ];
    expect(resumenObjetos(objetos)).toBe('Sillón ×2, Mesa, Piano');
    expect(categoriasObjetos(objetos)).toBe('Muebles');
  });
});
