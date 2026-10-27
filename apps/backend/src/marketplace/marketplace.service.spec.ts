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
  type AuditoriaService,
  type Calificacion,
  EstadoArticuloMarketplace,
  type InteresadoMarketplace,
  type ResiduoCatalogo,
  type SesionService,
  TipoArticuloMarketplace,
} from '../core';
import type { ArchivosService } from '../archivos/archivos.service';
import type { CreditosService } from '../creditos/creditos.service';
import type { NotificacionesService } from '../notificaciones/notificaciones.service';
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

interface QbIntentos {
  update: () => QbIntentos;
  set: (valores: unknown) => QbIntentos;
  where: (condicion: string, parametros: unknown) => QbIntentos;
  execute: () => Promise<{ affected: number }>;
}

function montar({
  encontrado = null as ArticuloMarketplace | null,
  lista = [] as ArticuloMarketplace[],
  calificaciones = [] as Partial<Calificacion>[],
  afectadas = 1,
  interesado = null as Partial<InteresadoMarketplace> | null,
  interesados = [] as Partial<InteresadoMarketplace>[],
  afectadasIntento = 1,
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
    // Contador de intentos del código: UPDATE atómico.
    createQueryBuilder: jest.fn(() => {
      const qb = {} as QbIntentos;
      qb.update = () => qb;
      qb.set = () => qb;
      qb.where = () => qb;
      qb.execute = () => Promise.resolve({ affected: afectadasIntento });
      return qb;
    }),
  };
  const interesadoRepo = {
    findOne: jest.fn(() => Promise.resolve(interesado)),
    find: jest.fn(() => Promise.resolve(interesados)),
  };
  const notificaciones = { notificar: jest.fn(() => Promise.resolve()) };
  const sesionService = {
    nombreSesionActiva: jest.fn(() => Promise.resolve('Ana María')),
  };
  const auditoriaService = { registrar: jest.fn(() => Promise.resolve()) };
  const calificacionRepo = {
    find: jest.fn(() => Promise.resolve(calificaciones)),
    create: jest.fn((datos: Partial<Calificacion>) => ({ ...datos })),
  };
  const manager = {
    getRepository: jest.fn(() => articuloRepo),
    save: jest.fn((_entidad: unknown, c: Calificacion) =>
      errorAlCalificar
        ? Promise.reject(errorAlCalificar)
        : Promise.resolve({ ...c, id: 1 }),
    ),
    transaction: jest.fn(<T>(trabajo: (m: unknown) => Promise<T>): Promise<T> =>
      trabajo(manager),
    ),
  };
  Object.assign(articuloRepo, { manager });
  const creditos = {
    otorgarPorEntrega: jest.fn(() => Promise.resolve({})),
    otorgarPorEstrellas: jest.fn(() => Promise.resolve(null)),
    avisarAbono: jest.fn(),
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
    creditos as unknown as CreditosService,
    interesadoRepo as unknown as Repository<InteresadoMarketplace>,
    sesionService as unknown as SesionService,
    auditoriaService as unknown as AuditoriaService,
    notificaciones as unknown as NotificacionesService,
  );

  return {
    service,
    articuloRepo,
    calificacionRepo,
    manager,
    creditos,
    auditoriaService,
    notificaciones,
    interesadoRepo,
    archivos,
    limiteOrigenes,
  };
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
        codigoEntrega: null,
        fechaReserva: null,
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

describe('MarketplaceService.reservar', () => {
  const INTERESADO = '00000000-0000-4000-8000-000000000003';
  const propio = () => articulo({ usuarioPublicadorId: YO });

  it('reserva con un código de 6 dígitos, la fecha y los intentos en cero', async () => {
    const { service, articuloRepo, auditoriaService } = montar({
      encontrado: propio(),
      interesado: { id: 4, usuarioInteresadoId: INTERESADO },
    });

    await service.reservar(10, 4, usuario(YO));

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
    expect(cambios).toMatchObject({
      estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
      usuarioCompradorId: INTERESADO,
      intentosCodigo: 0,
    });
    expect(cambios.codigoEntrega).toMatch(/^\d{6}$/);
    expect(cambios.fechaReserva).toBeInstanceOf(Date);
    // La auditoría lleva el estado y nunca el código.
    expect(JSON.stringify(auditoriaService.registrar.mock.calls)).not.toContain(
      cambios.codigoEntrega as string,
    );
  });

  it('403 si quien reserva no publicó el artículo', async () => {
    const { service, articuloRepo } = montar({ encontrado: articulo() });

    await expect(service.reservar(10, 4, usuario(YO))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(articuloRepo.update).not.toHaveBeenCalled();
  });

  it('404 si el interesado no es de este artículo', async () => {
    const { service, articuloRepo, interesadoRepo } = montar({
      encontrado: propio(),
      interesado: null,
    });

    await expect(service.reservar(10, 99, usuario(YO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(interesadoRepo.findOne).toHaveBeenCalledWith({
      where: { id: 99, articuloId: 10 },
    });
    expect(articuloRepo.update).not.toHaveBeenCalled();
  });

  it('404 si el artículo no existe', async () => {
    const { service } = montar();

    await expect(service.reservar(10, 4, usuario(YO))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('409 si ya no está disponible', async () => {
    const { service } = montar({
      encontrado: propio(),
      interesado: { id: 4, usuarioInteresadoId: INTERESADO },
      afectadas: 0,
    });

    await expect(service.reservar(10, 4, usuario(YO))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('MarketplaceService.entregar', () => {
  const reservado = (cambios: Partial<ArticuloMarketplace> = {}) =>
    articulo({
      usuarioPublicadorId: YO,
      estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
      usuarioCompradorId: VECINA,
      codigoEntrega: '123456',
      intentosCodigo: 0,
      ...cambios,
    });

  it('con el código correcto completa el intercambio, borra el código y registra la fecha', async () => {
    const { service, articuloRepo } = montar({ encontrado: reservado() });

    await service.entregar(10, '123456', usuario(YO));

    const [condicion, cambios] = articuloRepo.update.mock
      .calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(condicion).toMatchObject({
      id: 10,
      estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
      usuarioCompradorId: VECINA,
    });
    expect(cambios.estado).toBe(EstadoArticuloMarketplace.COMPLETADO);
    expect(cambios.codigoEntrega).toBeNull();
    expect(cambios.fechaTransaccion).toBeInstanceOf(Date);
  });

  it('código incorrecto: 400, suma un intento y no entrega ni da créditos', async () => {
    const { service, articuloRepo, creditos } = montar({
      encontrado: reservado({ intentosCodigo: 1 }),
    });

    await expect(
      service.entregar(10, '000000', usuario(YO)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(articuloRepo.createQueryBuilder).toHaveBeenCalled();
    expect(articuloRepo.update).not.toHaveBeenCalled();
    expect(creditos.otorgarPorEntrega).not.toHaveBeenCalled();
  });

  it('el quinto intento fallido bloquea con 409', async () => {
    const { service } = montar({
      encontrado: reservado({ intentosCodigo: 4 }),
    });

    await expect(
      service.entregar(10, '000000', usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('bloqueado (5 intentos): 409 aunque el código sea correcto', async () => {
    const { service, articuloRepo } = montar({
      encontrado: reservado({ intentosCodigo: 5 }),
    });

    await expect(
      service.entregar(10, '123456', usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(articuloRepo.update).not.toHaveBeenCalled();
  });

  it('404 para un tercero que no puede ver el artículo reservado', async () => {
    const { service } = montar({
      encontrado: articulo({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: VECINA,
      }),
    });

    await expect(
      service.entregar(10, '123456', usuario(YO)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409 si no está reservado, sin intentar el UPDATE', async () => {
    const { service, articuloRepo } = montar({
      encontrado: articulo({ usuarioPublicadorId: YO }),
    });

    await expect(
      service.entregar(10, '123456', usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(articuloRepo.update).not.toHaveBeenCalled();
  });

  it('409 si entre la lectura y el UPDATE cambió el receptor o el estado, sin créditos', async () => {
    const { service, creditos } = montar({
      encontrado: reservado(),
      afectadas: 0,
    });

    await expect(
      service.entregar(10, '123456', usuario(YO)),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(creditos.otorgarPorEntrega).not.toHaveBeenCalled();
  });

  it('otorga los créditos de la entrega en la misma transacción', async () => {
    const { service, manager, creditos } = montar({ encontrado: reservado() });

    await service.entregar(10, '123456', usuario(YO));

    expect(manager.getRepository).toHaveBeenCalled();
    expect(creditos.otorgarPorEntrega).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        id: 10,
        usuarioPublicadorId: YO,
        usuarioCompradorId: VECINA,
      }),
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

  it('otorga el bono por estrellas en la misma transacción', async () => {
    const { service, manager, creditos } = montar({ encontrado: recibido() });

    await service.calificar(10, { puntuacion: 4 }, usuario(YO));

    expect(manager.transaction).toHaveBeenCalledTimes(1);
    expect(creditos.otorgarPorEstrellas).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ id: 10, usuarioPublicadorId: VECINA }),
      4,
    );
  });

  it('si la calificación falla, no se otorga el bono', async () => {
    const { service, creditos } = montar({
      encontrado: recibido(),
      errorAlCalificar: new Error('falla'),
    });

    await expect(
      service.calificar(10, { puntuacion: 5 }, usuario(YO)),
    ).rejects.toThrow('falla');
    expect(creditos.otorgarPorEstrellas).not.toHaveBeenCalled();
  });

  it('403 si quien califica es quien publicó', async () => {
    const { service, manager } = montar({
      encontrado: recibido({
        usuarioPublicadorId: YO,
        usuarioCompradorId: VECINA,
      }),
    });

    await expect(
      service.calificar(10, { puntuacion: 5 }, usuario(YO)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.save).not.toHaveBeenCalled();
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

describe('MarketplaceService: avisos de la campanita', () => {
  const RECEPTOR = '00000000-0000-4000-8000-000000000003';
  const OTRO = '00000000-0000-4000-8000-000000000004';
  const propio = (cambios: Partial<ArticuloMarketplace> = {}) =>
    articulo({
      usuarioPublicadorId: YO,
      titulo: 'Sillón',
      ...cambios,
    });
  const llamadas = (n: { notificar: jest.Mock }) =>
    n.notificar.mock.calls as unknown as [
      string,
      { tipo: string; titulo: string; cuerpo: string; url: string },
    ][];

  it('reservar avisa al elegido y a los demás interesados, no al elegido dos veces', async () => {
    const { service, notificaciones } = montar({
      encontrado: propio(),
      interesado: { id: 4, usuarioInteresadoId: RECEPTOR },
      interesados: [
        { usuarioInteresadoId: RECEPTOR },
        { usuarioInteresadoId: OTRO },
      ],
    });

    await service.reservar(10, 4, usuario(YO));

    const avisos = llamadas(notificaciones);
    expect(avisos).toHaveLength(2);
    expect(avisos[0][0]).toBe(RECEPTOR);
    expect(avisos[0][1]).toEqual({
      tipo: 'reserva',
      titulo: 'Te reservaron un artículo',
      cuerpo: 'Ana te reservó «Sillón»',
      url: '/marketplace/10',
    });
    expect(avisos[1][0]).toBe(OTRO);
    expect(avisos[1][1]).toEqual({
      tipo: 'reserva_otro',
      titulo: 'Ya fue reservado',
      cuerpo: 'Otro vecino reservó «Sillón»',
      url: '/marketplace/10/chat',
    });
  });

  it('el título largo se recorta a 40 caracteres', async () => {
    const { service, notificaciones } = montar({
      encontrado: propio({ titulo: 'x'.repeat(100) }),
      interesado: { id: 4, usuarioInteresadoId: RECEPTOR },
    });

    await service.reservar(10, 4, usuario(YO));

    expect(llamadas(notificaciones)[0][1].cuerpo).toBe(
      `Ana te reservó «${'x'.repeat(40)}»`,
    );
  });

  it('un reservar que falla no avisa a nadie', async () => {
    const { service, notificaciones } = montar({
      encontrado: propio(),
      interesado: { id: 4, usuarioInteresadoId: RECEPTOR },
      afectadas: 0,
    });

    await expect(service.reservar(10, 4, usuario(YO))).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(notificaciones.notificar).not.toHaveBeenCalled();
  });

  it('liberar avisa al ex receptor y a los demás, cada uno una vez', async () => {
    const { service, notificaciones } = montar({
      encontrado: propio({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: RECEPTOR,
      }),
      interesados: [
        { usuarioInteresadoId: RECEPTOR },
        { usuarioInteresadoId: OTRO },
      ],
    });

    await service.liberar(10, usuario(YO));

    const avisos = llamadas(notificaciones);
    expect(avisos.map((a) => a[0]).sort()).toEqual([OTRO, RECEPTOR].sort());
    expect(avisos[0][1]).toEqual({
      tipo: 'liberado',
      titulo: 'Volvió a estar disponible',
      cuerpo: '«Sillón» está disponible otra vez',
      url: '/marketplace/10',
    });
  });

  it('entregar avisa al receptor y el abono de créditos', async () => {
    const { service, notificaciones, creditos } = montar({
      encontrado: propio({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: RECEPTOR,
        codigoEntrega: '123456',
        intentosCodigo: 0,
      }),
    });

    await service.entregar(10, '123456', usuario(YO));

    expect(llamadas(notificaciones)).toEqual([
      [
        RECEPTOR,
        {
          tipo: 'entrega',
          titulo: 'Entrega confirmada',
          cuerpo: 'Recibiste «Sillón»',
          url: '/marketplace/10',
        },
      ],
    ]);
    expect(creditos.avisarAbono).toHaveBeenCalledTimes(1);
  });

  it('un código incorrecto no avisa ni abona', async () => {
    const { service, notificaciones, creditos } = montar({
      encontrado: propio({
        estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        usuarioCompradorId: RECEPTOR,
        codigoEntrega: '123456',
        intentosCodigo: 0,
      }),
    });

    await expect(
      service.entregar(10, '000000', usuario(YO)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(notificaciones.notificar).not.toHaveBeenCalled();
    expect(creditos.avisarAbono).not.toHaveBeenCalled();
  });

  it('calificar avisa al publicador con las estrellas, sin el comentario', async () => {
    const { service, notificaciones } = montar({
      encontrado: articulo({
        titulo: 'Sillón',
        estado: EstadoArticuloMarketplace.COMPLETADO,
        usuarioCompradorId: YO,
      }),
    });

    await service.calificar(
      10,
      { puntuacion: 5, comentario: 'mi teléfono es 12345' },
      usuario(YO),
    );

    const avisos = llamadas(notificaciones);
    expect(avisos[0][0]).toBe(VECINA);
    expect(avisos[0][1]).toEqual({
      tipo: 'calificacion',
      titulo: 'Te calificaron',
      cuerpo: 'Recibiste 5 estrellas por «Sillón»',
      url: '/marketplace/10',
    });
    expect(JSON.stringify(avisos)).not.toContain('12345');
  });
});
