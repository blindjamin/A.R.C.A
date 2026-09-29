import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FindOperator, Like, QueryFailedError, type Repository } from 'typeorm';
import {
  type ArticuloMarketplace,
  type AuthUser,
  type Calificacion,
  EstadoArticuloMarketplace,
  type ResiduoCatalogo,
  TipoArticuloMarketplace,
} from '../core';
import type { ArchivosService } from '../archivos/archivos.service';
import type { ResiduosService } from '../residuos/residuos.service';
import { MarketplaceService, SUBCARPETA_FOTOS } from './marketplace.service';
import type { LimiteOrigenesService } from './ubicacion/limite-origenes.service';
import { aproximarAGrilla } from './ubicacion/ubicacion-marketplace';

const YO = '00000000-0000-4000-8000-000000000001';
const VECINA = '00000000-0000-4000-8000-000000000002';

const usuario = (ciudadanoId: string): AuthUser => ({
  ciudadanoId,
  esAdministrador: false,
  administradorId: null,
  rol: null,
});

const MUEBLES = {
  id: 3,
  categoria: 'Muebles',
  precio: 15000,
} as ResiduoCatalogo;

const articulo = (cambios: Partial<ArticuloMarketplace> = {}) =>
  ({
    id: 10,
    usuarioPublicadorId: VECINA,
    residuoCatalogoId: MUEBLES.id,
    tipo: TipoArticuloMarketplace.REGALO,
    titulo: 'Sofá',
    descripcion: null,
    estado: EstadoArticuloMarketplace.DISPONIBLE,
    fotoPath: null,
    latitud: '-33.63650000',
    longitud: '-71.62960000',
    fechaPublicacion: new Date('2026-09-28T12:00:00.000Z'),
    fechaExpiracion: new Date(Date.now() + 86_400_000),
    usuarioCompradorId: null,
    fechaTransaccion: null,
    residuoCatalogo: MUEBLES,
    ...cambios,
  }) as ArticuloMarketplace;

function montar({
  encontrado = null as ArticuloMarketplace | null,
  lista = [] as ArticuloMarketplace[],
  calificaciones = [] as Partial<Calificacion>[],
  afectadas = 1,
  errorAlCalificar = null as Error | null,
} = {}) {
  const articuloRepo = {
    create: jest.fn((datos: Partial<ArticuloMarketplace>) => ({ ...datos })),
    save: jest.fn((a: ArticuloMarketplace) =>
      Promise.resolve({ ...a, id: 99 }),
    ),
    find: jest.fn(() => Promise.resolve(lista)),
    findOne: jest.fn(() => Promise.resolve(encontrado)),
    update: jest.fn(() => Promise.resolve({ affected: afectadas })),
  };
  const calificacionRepo = {
    find: jest.fn(() => Promise.resolve(calificaciones)),
    create: jest.fn((datos: Partial<Calificacion>) => ({ ...datos })),
    save: jest.fn((c: Calificacion) =>
      errorAlCalificar
        ? Promise.reject(errorAlCalificar)
        : Promise.resolve({ ...c, id: 1 }),
    ),
  };
  const residuos = {
    findCatalogoById: jest.fn((id: number): Promise<ResiduoCatalogo | null> =>
      Promise.resolve(id === MUEBLES.id ? MUEBLES : null),
    ),
  };
  const archivos = {
    guardarImagen: jest.fn(() => Promise.resolve('marketplace/nueva.jpg')),
    borrar: jest.fn(() => Promise.resolve()),
    abrir: jest.fn(() => Promise.resolve({ stream: {}, mime: 'image/jpeg' })),
  };
  const limiteOrigenes = {
    bandaPara: jest.fn(() => '1_5km' as const),
  };

  const service = new MarketplaceService(
    articuloRepo as unknown as Repository<ArticuloMarketplace>,
    calificacionRepo as unknown as Repository<Calificacion>,
    residuos as unknown as ResiduosService,
    archivos as unknown as ArchivosService,
    limiteOrigenes as unknown as LimiteOrigenesService,
  );

  return { service, articuloRepo, calificacionRepo, archivos, limiteOrigenes };
}

const FOTO = { buffer: Buffer.from([0xff, 0xd8, 0xff]), size: 3 };

describe('MarketplaceService.publicar', () => {
  const dto = {
    tipo: TipoArticuloMarketplace.REGALO,
    titulo: '  Sofá de 3 cuerpos ',
    descripcion: 'Tela gris',
    residuoCatalogoId: MUEBLES.id,
    lat: -33.636512,
    lon: -71.629634,
  };

  it('guarda la ubicación ya aproximada a la grilla, nunca la exacta', async () => {
    const { service, articuloRepo } = montar();

    await service.publicar(dto, undefined, usuario(YO));

    const celda = aproximarAGrilla({ latitud: dto.lat, longitud: dto.lon });
    const guardado = articuloRepo.create.mock.calls[0][0];
    expect(guardado.latitud).toBe(String(celda.latitud));
    expect(guardado.longitud).toBe(String(celda.longitud));
    expect(guardado.latitud).not.toBe(String(dto.lat));
  });

  it('queda disponible, a nombre de la sesión, con vencimiento a 30 días', async () => {
    const { service, articuloRepo } = montar();

    const publico = await service.publicar(dto, undefined, usuario(YO));

    const guardado = articuloRepo.create.mock.calls[0][0];
    expect(guardado.usuarioPublicadorId).toBe(YO);
    expect(guardado.estado).toBe(EstadoArticuloMarketplace.DISPONIBLE);
    expect(guardado.titulo).toBe('Sofá de 3 cuerpos');
    const dias =
      (guardado.fechaExpiracion!.getTime() -
        guardado.fechaPublicacion!.getTime()) /
      86_400_000;
    expect(dias).toBe(30);
    expect(publico).toMatchObject({
      id: 99,
      esPropio: true,
      categoria: 'Muebles',
      banda: null,
      fotoUrl: null,
    });
  });

  it('sin lat/lon, se publica sin ubicación', async () => {
    const { service, articuloRepo } = montar();

    await service.publicar(
      { ...dto, lat: undefined, lon: undefined },
      undefined,
      usuario(YO),
    );

    const guardado = articuloRepo.create.mock.calls[0][0];
    expect(guardado.latitud).toBeNull();
    expect(guardado.longitud).toBeNull();
  });

  it('guarda la foto en la subcarpeta del Marketplace', async () => {
    const { service, archivos, articuloRepo } = montar();

    const publico = await service.publicar(dto, FOTO, usuario(YO));

    expect(archivos.guardarImagen).toHaveBeenCalledWith(FOTO, SUBCARPETA_FOTOS);
    expect(articuloRepo.create.mock.calls[0][0].fotoPath).toBe(
      'marketplace/nueva.jpg',
    );
    expect(publico.fotoUrl).toBe('/api/marketplace/articulos/99/foto');
  });

  it('si falla el guardado en la base, borra la foto ya escrita', async () => {
    const { service, archivos, articuloRepo } = montar();
    articuloRepo.save.mockRejectedValueOnce(new Error('se cayó MySQL'));

    await expect(service.publicar(dto, FOTO, usuario(YO))).rejects.toThrow(
      'se cayó MySQL',
    );
    expect(archivos.borrar).toHaveBeenCalledWith('marketplace/nueva.jpg');
  });

  it('404 si el residuo no está en el catálogo, sin guardar la foto', async () => {
    const { service, archivos } = montar();

    await expect(
      service.publicar({ ...dto, residuoCatalogoId: 999 }, FOTO, usuario(YO)),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(archivos.guardarImagen).not.toHaveBeenCalled();
  });

  it('si la foto no es válida, no se crea el artículo', async () => {
    const { service, archivos, articuloRepo } = montar();
    archivos.guardarImagen.mockRejectedValueOnce(
      new BadRequestException('La foto debe ser JPG, PNG o WebP'),
    );

    await expect(
      service.publicar(dto, FOTO, usuario(YO)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(articuloRepo.save).not.toHaveBeenCalled();
  });
});

describe('MarketplaceService.listar', () => {
  type Where = Record<string, unknown>;
  const whereDe = (repo: ReturnType<typeof montar>['articuloRepo']) =>
    (repo.find.mock.calls[0] as unknown as [{ where: Where | Where[] }])[0]
      .where;

  it('solo pide artículos disponibles y no vencidos', async () => {
    const { service, articuloRepo } = montar();

    await service.listar({}, usuario(YO));

    const where = whereDe(articuloRepo) as Where;
    expect(where.estado).toBe(EstadoArticuloMarketplace.DISPONIBLE);
    expect(where.fechaExpiracion).toBeInstanceOf(FindOperator);
    expect((where.fechaExpiracion as FindOperator<Date>).type).toBe('moreThan');
  });

  it('filtra por tipo y categoría del catálogo', async () => {
    const { service, articuloRepo } = montar();

    await service.listar(
      { tipo: TipoArticuloMarketplace.INTERCAMBIO, categoria: 'Muebles' },
      usuario(YO),
    );

    const where = whereDe(articuloRepo) as Where;
    expect(where.tipo).toBe(TipoArticuloMarketplace.INTERCAMBIO);
    expect(where.residuoCatalogo).toEqual({ categoria: 'Muebles' });
  });

  it('busca el texto en título o descripción, con los comodines escapados', async () => {
    const { service, articuloRepo } = montar();

    await service.listar({ texto: ' 50%_off ' }, usuario(YO));

    const where = whereDe(articuloRepo) as Where[];
    expect(where).toHaveLength(2);
    expect(where[0].titulo).toEqual(Like('%50\\%\\_off%'));
    expect(where[1].descripcion).toEqual(Like('%50\\%\\_off%'));
  });

  it('calcula la banda con el límite de orígenes, salvo en lo propio', async () => {
    const ajeno = articulo({ id: 1 });
    const propio = articulo({ id: 2, usuarioPublicadorId: YO });
    const { service, limiteOrigenes } = montar({ lista: [ajeno, propio] });

    const resultado = await service.listar(
      { lat: -33.6, lon: -71.6 },
      usuario(YO),
    );

    expect(limiteOrigenes.bandaPara).toHaveBeenCalledTimes(1);
    expect(limiteOrigenes.bandaPara).toHaveBeenCalledWith(
      YO,
      { latitud: -33.6, longitud: -71.6 },
      { latitud: -33.6365, longitud: -71.6296 },
    );
    expect(resultado.map((a) => a.banda)).toEqual(['1_5km', null]);
  });

  it('sin lat/lon no hay banda', async () => {
    const { service, limiteOrigenes } = montar({ lista: [articulo()] });

    const [unico] = await service.listar({}, usuario(YO));

    expect(unico.banda).toBeNull();
    expect(limiteOrigenes.bandaPara).not.toHaveBeenCalled();
  });

  it('con filtro de banda, deja fuera lo que no está en ella o no tiene banda', async () => {
    const { service, limiteOrigenes } = montar({
      lista: [articulo({ id: 1 }), articulo({ id: 2 }), articulo({ id: 3 })],
    });
    limiteOrigenes.bandaPara
      .mockReturnValueOnce('1_5km')
      .mockReturnValueOnce('mas_10km' as never)
      .mockReturnValueOnce(null as never);

    const resultado = await service.listar(
      { lat: -33.6, lon: -71.6, banda: '1_5km' },
      usuario(YO),
    );

    expect(resultado.map((a) => a.id)).toEqual([1]);
  });

  it('agrega la reputación de cada publicador', async () => {
    const { service } = montar({
      lista: [articulo()],
      calificaciones: [
        { usuarioCalificadoId: VECINA, puntuacion: 5 },
        { usuarioCalificadoId: VECINA, puntuacion: 4 },
      ],
    });

    const [unico] = await service.listar({}, usuario(YO));

    expect(unico.publicador.calificacionPromedio).toBe(4.5);
    expect(unico.publicador.cantidadCalificaciones).toBe(2);
  });
});

describe('MarketplaceService.obtener', () => {
  it('404 para un tercero si el artículo está reservado', async () => {
    const { service } = montar({
      encontrado: articulo({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: VECINA,
      }),
    });

    await expect(service.obtener(10, {}, usuario(YO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404 si no existe', async () => {
    const { service } = montar();
    await expect(service.obtener(10, {}, usuario(YO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('marca puedoCalificar si la sesión recibió el artículo y no lo calificó', async () => {
    const { service } = montar({
      encontrado: articulo({
        estado: EstadoArticuloMarketplace.COMPLETADO,
        usuarioCompradorId: YO,
      }),
    });

    const publico = await service.obtener(10, {}, usuario(YO));

    expect(publico.soyReceptor).toBe(true);
    expect(publico.puedoCalificar).toBe(true);
  });
});

describe('MarketplaceService.retirar', () => {
  it('pasa a retirado un artículo propio disponible', async () => {
    const { service, articuloRepo } = montar({
      encontrado: articulo({ usuarioPublicadorId: YO }),
    });

    await service.retirar(10, usuario(YO));

    expect(articuloRepo.update).toHaveBeenCalledWith(
      { id: 10, estado: EstadoArticuloMarketplace.DISPONIBLE },
      { estado: EstadoArticuloMarketplace.RETIRADO },
    );
  });

  it('403 si el artículo es de otra persona', async () => {
    const { service, articuloRepo } = montar({ encontrado: articulo() });

    await expect(service.retirar(10, usuario(YO))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(articuloRepo.update).not.toHaveBeenCalled();
  });

  it('409 si ya no está disponible (el UPDATE condicionado no afecta filas)', async () => {
    const { service } = montar({
      encontrado: articulo({
        usuarioPublicadorId: YO,
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: VECINA,
      }),
      afectadas: 0,
    });

    await expect(service.retirar(10, usuario(YO))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('MarketplaceService.solicitar', () => {
  it('reserva para la sesión solo si sigue disponible y vigente', async () => {
    const { service, articuloRepo } = montar({ encontrado: articulo() });

    await service.solicitar(10, usuario(YO));

    const [condicion, cambios] = articuloRepo.update.mock
      .calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(condicion).toMatchObject({
      id: 10,
      estado: EstadoArticuloMarketplace.DISPONIBLE,
    });
    expect((condicion.fechaExpiracion as FindOperator<Date>).type).toBe(
      'moreThan',
    );
    expect(cambios).toEqual({
      estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
      usuarioCompradorId: YO,
    });
  });

  it('403 si el artículo es propio', async () => {
    const { service, articuloRepo } = montar({
      encontrado: articulo({ usuarioPublicadorId: YO }),
    });

    await expect(service.solicitar(10, usuario(YO))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(articuloRepo.update).not.toHaveBeenCalled();
  });

  it('409 si otra persona lo reservó antes o venció', async () => {
    const { service } = montar({ encontrado: articulo(), afectadas: 0 });

    await expect(service.solicitar(10, usuario(YO))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('404 si no existe', async () => {
    const { service } = montar();

    await expect(service.solicitar(10, usuario(YO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('MarketplaceService.liberar', () => {
  const reservado = () =>
    articulo({
      usuarioPublicadorId: YO,
      estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
      usuarioCompradorId: VECINA,
    });

  it('vuelve a disponible y borra al interesado', async () => {
    const { service, articuloRepo } = montar({ encontrado: reservado() });

    await service.liberar(10, usuario(YO));

    expect(articuloRepo.update).toHaveBeenCalledWith(
      { id: 10, estado: EstadoArticuloMarketplace.EN_NEGOCIACION },
      {
        estado: EstadoArticuloMarketplace.DISPONIBLE,
        usuarioCompradorId: null,
      },
    );
  });

  it('403 si quien lo pide es el interesado y no quien publicó', async () => {
    const { service, articuloRepo } = montar({
      encontrado: articulo({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: YO,
      }),
    });

    await expect(service.liberar(10, usuario(YO))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(articuloRepo.update).not.toHaveBeenCalled();
  });

  it('409 si no está reservado', async () => {
    const { service } = montar({
      encontrado: articulo({ usuarioPublicadorId: YO }),
      afectadas: 0,
    });

    await expect(service.liberar(10, usuario(YO))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('MarketplaceService.entregar', () => {
  it('completa el intercambio con el mismo receptor y registra la fecha', async () => {
    const { service, articuloRepo } = montar({
      encontrado: articulo({
        usuarioPublicadorId: YO,
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: VECINA,
      }),
    });

    await service.entregar(10, usuario(YO));

    const [condicion, cambios] = articuloRepo.update.mock
      .calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(condicion).toEqual({
      id: 10,
      estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
      usuarioCompradorId: VECINA,
    });
    expect(cambios.estado).toBe(EstadoArticuloMarketplace.COMPLETADO);
    expect(cambios.fechaTransaccion).toBeInstanceOf(Date);
  });

  it('404 para un tercero que no puede ver el artículo reservado', async () => {
    const { service } = montar({
      encontrado: articulo({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: VECINA,
      }),
    });

    await expect(service.entregar(10, usuario(YO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('409 si no está reservado, sin intentar el UPDATE', async () => {
    const { service, articuloRepo } = montar({
      encontrado: articulo({ usuarioPublicadorId: YO }),
    });

    await expect(service.entregar(10, usuario(YO))).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(articuloRepo.update).not.toHaveBeenCalled();
  });

  it('409 si entre la lectura y el UPDATE cambió el receptor o el estado', async () => {
    const { service } = montar({
      encontrado: articulo({
        usuarioPublicadorId: YO,
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: VECINA,
      }),
      afectadas: 0,
    });

    await expect(service.entregar(10, usuario(YO))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('MarketplaceService.calificar', () => {
  const recibido = (cambios: Partial<ArticuloMarketplace> = {}) =>
    articulo({
      estado: EstadoArticuloMarketplace.COMPLETADO,
      usuarioCompradorId: YO,
      ...cambios,
    });

  it('guarda la calificación de quien recibió hacia quien publicó', async () => {
    const { service, calificacionRepo } = montar({ encontrado: recibido() });

    const respuesta = await service.calificar(
      10,
      { puntuacion: 5, comentario: '  Todo bien ' },
      usuario(YO),
    );

    expect(calificacionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioCalificadorId: YO,
        usuarioCalificadoId: VECINA,
        articuloId: 10,
        puntuacion: 5,
        comentario: 'Todo bien',
      }),
    );
    expect(respuesta).toEqual({
      puntuacion: 5,
      comentario: 'Todo bien',
      fecha: expect.any(Date) as Date,
    });
  });

  it('comentario vacío se guarda como null', async () => {
    const { service, calificacionRepo } = montar({ encontrado: recibido() });

    await service.calificar(
      10,
      { puntuacion: 4, comentario: '  ' },
      usuario(YO),
    );

    expect(calificacionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ comentario: null }),
    );
  });

  it('403 si quien califica es quien publicó', async () => {
    const { service, calificacionRepo } = montar({
      encontrado: recibido({
        usuarioPublicadorId: YO,
        usuarioCompradorId: VECINA,
      }),
    });

    await expect(
      service.calificar(10, { puntuacion: 5 }, usuario(YO)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(calificacionRepo.save).not.toHaveBeenCalled();
  });

  it('409 si todavía no se entrega', async () => {
    const { service } = montar({
      encontrado: recibido({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
      }),
    });

    await expect(
      service.calificar(10, { puntuacion: 5 }, usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('409 si ya calificó (índice único de la base)', async () => {
    const duplicada = new QueryFailedError('INSERT', [], {
      code: 'ER_DUP_ENTRY',
    } as unknown as Error);
    const { service } = montar({
      encontrado: recibido(),
      errorAlCalificar: duplicada,
    });

    await expect(
      service.calificar(10, { puntuacion: 5 }, usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('otros errores de la base no se disfrazan de 409', async () => {
    const { service } = montar({
      encontrado: recibido(),
      errorAlCalificar: new Error('se cayó la conexión'),
    });

    await expect(
      service.calificar(10, { puntuacion: 5 }, usuario(YO)),
    ).rejects.toThrow('se cayó la conexión');
  });
});

describe('MarketplaceService.foto', () => {
  it('entrega la foto de un artículo visible', async () => {
    const { service, archivos } = montar({
      encontrado: articulo({ fotoPath: 'marketplace/abc.png' }),
    });

    await service.foto(10, usuario(YO));

    expect(archivos.abrir).toHaveBeenCalledWith('marketplace/abc.png');
  });

  it('404 si el artículo no tiene foto', async () => {
    const { service } = montar({ encontrado: articulo() });
    await expect(service.foto(10, usuario(YO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404 si el artículo no es visible para la sesión', async () => {
    const { service, archivos } = montar({
      encontrado: articulo({
        fotoPath: 'marketplace/abc.png',
        estado: EstadoArticuloMarketplace.RETIRADO,
      }),
    });

    await expect(service.foto(10, usuario(YO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(archivos.abrir).not.toHaveBeenCalled();
  });
});

describe('MarketplaceService.misArticulos', () => {
  it('pide solo los de la sesión, sin banda', async () => {
    const { service, articuloRepo } = montar({
      lista: [articulo({ usuarioPublicadorId: YO })],
    });

    const [unico] = await service.misArticulos(usuario(YO));

    expect(
      (articuloRepo.find.mock.calls[0] as unknown as [{ where: unknown }])[0]
        .where,
    ).toEqual({ usuarioPublicadorId: YO });
    expect(unico.esPropio).toBe(true);
    expect(unico.banda).toBeNull();
  });
});
