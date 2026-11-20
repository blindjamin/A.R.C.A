import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AccionAuditoria,
  type AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  type FotoRetiro,
  MotivoRevision,
  type ResiduoCatalogo,
  type RevisionSolicitud,
  type SolicitudRetiro,
  TipoFotoRetiro,
  type UsuarioCiudadano,
  ObjetoSolicitudRetiro,
} from '../core';
import type { ArchivosService } from '../archivos/archivos.service';
import type { Repository } from 'typeorm';
import type { ResiduosService } from '../residuos/residuos.service';
import { SolicitudesRetiroService } from './solicitudes-retiro.service';

const CIUDADANO_ID = '00000000-0000-4000-8000-000000000001';
const OTRO_CIUDADANO_ID = '00000000-0000-4000-8000-000000000099';

const VECINO: AuthUser = {
  ciudadanoId: CIUDADANO_ID,
  esAdministrador: false,
  administradorId: null,
  rol: null,
};

const FOTO = {
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  size: 6,
};

const filaBase = (cambios: Partial<SolicitudRetiro> = {}): SolicitudRetiro =>
  ({
    id: 7,
    usuarioCiudadanoId: CIUDADANO_ID,
    residuoCatalogoId: 1,
    estado: EstadoSolicitudRetiro.EN_REVISION,
    estadoPago: EstadoPagoSolicitud.NO_APLICA,
    monto: null,
    fechaRevision: null,
    revisadoPorId: null,
    fechaCierre: null,
    razonRechazo: null,
    descripcion: null,
    direccionRetiro: 'Calle Uno 123, Santo Domingo',
    direccionAnonimizada: 'Calle Uno 123, Santo Domingo',
    latitudCapturada: null,
    longitudCapturada: null,
    fechaSolicitud: new Date('2026-09-17T12:00:00.000Z'),
    createdAt: new Date('2026-09-17T12:00:00.000Z'),
    updatedAt: new Date('2026-09-17T12:00:00.000Z'),
    fotos: [
      {
        id: 1,
        solicitudRetiroId: 7,
        rutaArchivo: 'solicitudes-retiro/abc.jpg',
        tipoFoto: TipoFotoRetiro.ANTES,
        hashIntegridad: null,
        fechaCaptura: new Date('2026-09-17T12:00:00.000Z'),
      } as FotoRetiro,
    ],
    ...cambios,
  }) as SolicitudRetiro;

function montar(fila?: SolicitudRetiro) {
  let guardada = fila
    ? { ...fila, fotos: fila.fotos ? [...fila.fotos] : [] }
    : null;

  const solicitudRepo = {
    create: jest.fn((data: Partial<SolicitudRetiro>) => ({
      id: 1,
      ...data,
    })),
    save: jest.fn((s: SolicitudRetiro) => {
      guardada = {
        ...s,
        fotos: s.fotos ?? guardada?.fotos ?? [],
        createdAt: s.createdAt ?? new Date(),
        updatedAt: s.updatedAt ?? new Date(),
      };
      return Promise.resolve({ ...guardada });
    }),
    findOne: jest.fn(() =>
      Promise.resolve(
        guardada ? { ...guardada, fotos: guardada.fotos ?? [] } : null,
      ),
    ),
    find: jest.fn(() => Promise.resolve([])),
    manager: {} as { transaction: unknown },
  };

  // Objetos guardados (HU-01), como los dejaría la tabla `objetos_solicitud_retiro`.
  let objetos: Partial<ObjetoSolicitudRetiro>[] = [];
  const objetoRepo = {
    find: jest.fn(() => Promise.resolve([...objetos])),
  };
  const em = {
    save: jest.fn((destino: unknown, filas?: unknown) => {
      if (destino === ObjetoSolicitudRetiro) {
        objetos.push(...(filas as Partial<ObjetoSolicitudRetiro>[]));
        return Promise.resolve(filas);
      }
      return solicitudRepo.save(destino as SolicitudRetiro);
    }),
    delete: jest.fn(() => {
      objetos = [];
      return Promise.resolve();
    }),
    update: jest.fn(
      (
        _destino: unknown,
        donde: { orden: number },
        cambios: Partial<ObjetoSolicitudRetiro>,
      ) => {
        objetos = objetos.map((o) =>
          o.orden === donde.orden ? { ...o, ...cambios } : o,
        );
        return Promise.resolve();
      },
    ),
  };
  solicitudRepo.manager.transaction = (fn: (m: typeof em) => unknown) => fn(em);

  const ciudadanoRepo = {
    findOne: jest.fn(() =>
      Promise.resolve({
        id: CIUDADANO_ID,
        activo: true,
      } as UsuarioCiudadano),
    ),
  };

  const revisionRepo = {
    findOne: jest.fn((): Promise<Partial<RevisionSolicitud> | null> =>
      Promise.resolve(null),
    ),
  };

  const fotoRepo = {
    create: jest.fn((data: Partial<FotoRetiro>) => ({ id: 1, ...data })),
    save: jest.fn((f: FotoRetiro) => {
      if (guardada) {
        const resto = (guardada.fotos ?? []).filter(
          (x) => x.tipoFoto !== TipoFotoRetiro.ANTES,
        );
        guardada = {
          ...guardada,
          fotos: [
            ...resto,
            {
              ...f,
              id: f.id ?? 1,
              tipoFoto: TipoFotoRetiro.ANTES,
            },
          ],
        };
      }
      return Promise.resolve(f);
    }),
  };

  const residuos = {
    findCatalogoById: jest.fn((id: number): Promise<ResiduoCatalogo | null> =>
      Promise.resolve({ id, precio: 15000 } as ResiduoCatalogo),
    ),
  };

  const auditoria = { registrar: jest.fn(() => Promise.resolve()) };

  const archivos = {
    guardarImagen: jest.fn(() =>
      Promise.resolve('solicitudes-retiro/nueva.jpg'),
    ),
    abrir: jest.fn(),
    borrar: jest.fn(() => Promise.resolve()),
  };

  const service = new SolicitudesRetiroService(
    solicitudRepo as unknown as Repository<SolicitudRetiro>,
    ciudadanoRepo as unknown as Repository<UsuarioCiudadano>,
    revisionRepo as unknown as Repository<RevisionSolicitud>,
    fotoRepo as unknown as Repository<FotoRetiro>,
    objetoRepo as unknown as Repository<ObjetoSolicitudRetiro>,
    residuos as unknown as ResiduosService,
    auditoria as unknown as AuditoriaService,
    archivos as unknown as ArchivosService,
  );

  return {
    service,
    solicitudRepo,
    revisionRepo,
    fotoRepo,
    residuos,
    auditoria,
    archivos,
    guardada: () => guardada,
    objetos: () => objetos,
  };
}

describe('SolicitudesRetiroService.create', () => {
  it('deja la solicitud en en_revision con dirección, foto y pago no_aplica', async () => {
    const { service, auditoria, guardada, archivos } = montar();

    const creada = await service.create(
      {
        usuarioCiudadanoId: CIUDADANO_ID,
        residuoCatalogoId: 1,
        direccionRetiro: 'Av. Costanera 100',
      },
      FOTO,
      VECINO,
    );

    expect(creada.estado).toBe(EstadoSolicitudRetiro.EN_REVISION);
    expect(creada.estadoPago).toBe(EstadoPagoSolicitud.NO_APLICA);
    expect(creada.direccionRetiro).toBe('Av. Costanera 100');
    expect(creada.direccionAnonimizada).toBe('Av. Costanera 100');
    expect(creada.fotoUrl).toBe('/api/solicitudes-retiro/1/foto');
    expect(guardada()?.direccionRetiro).toBe('Av. Costanera 100');
    expect(archivos.guardarImagen).toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AccionAuditoria.CREATE,
        datosNuevos: { estado: EstadoSolicitudRetiro.EN_REVISION, objetos: 1 },
      }),
    );
  });

  it('guarda varios objetos con su cantidad; el primero queda como principal', async () => {
    const { service, guardada, objetos } = montar();

    await service.create(
      {
        usuarioCiudadanoId: CIUDADANO_ID,
        direccionRetiro: 'Calle 1',
        objetos: JSON.stringify([
          { residuoCatalogoId: 2, cantidad: 3 },
          { nombreOtro: 'Hamaca' },
        ]),
      },
      FOTO,
      VECINO,
    );

    expect(guardada()?.residuoCatalogoId).toBe(2);
    expect(guardada()?.nombreResiduoOtro).toBeNull();
    expect(objetos()).toEqual([
      expect.objectContaining({ residuoCatalogoId: 2, cantidad: 3, orden: 0 }),
      expect.objectContaining({ nombreOtro: 'Hamaca', cantidad: 1, orden: 1 }),
    ]);
  });

  it('con una lista inválida responde 400 sin guardar la foto', async () => {
    const { service, archivos } = montar();

    await expect(
      service.create(
        {
          usuarioCiudadanoId: CIUDADANO_ID,
          direccionRetiro: 'Calle 1',
          objetos: JSON.stringify([{ residuoCatalogoId: 2, cantidad: 0 }]),
        },
        FOTO,
        VECINO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(archivos.guardarImagen).not.toHaveBeenCalled();
  });

  it('con un objeto que no está en el catálogo responde 404', async () => {
    const { service, residuos } = montar();
    residuos.findCatalogoById.mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          usuarioCiudadanoId: CIUDADANO_ID,
          direccionRetiro: 'Calle 1',
          objetos: JSON.stringify([{ residuoCatalogoId: 999 }]),
        },
        FOTO,
        VECINO,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sin foto responde 400', async () => {
    const { service, solicitudRepo } = montar();

    await expect(
      service.create(
        {
          usuarioCiudadanoId: CIUDADANO_ID,
          residuoCatalogoId: 1,
          direccionRetiro: 'Calle 1',
        },
        undefined,
        VECINO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('sin dirección responde 400', async () => {
    const { service, solicitudRepo } = montar();

    await expect(
      service.create(
        {
          usuarioCiudadanoId: CIUDADANO_ID,
          residuoCatalogoId: 1,
          direccionRetiro: '   ',
        },
        FOTO,
        VECINO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });
});

describe('SolicitudesRetiroService.cancelarPorCiudadano', () => {
  it('cancela una en_revision vía el ciclo y audita solo el estado', async () => {
    const { service, auditoria, guardada } = montar(filaBase());

    await service.cancelarPorCiudadano(
      7,
      { usuarioCiudadanoId: CIUDADANO_ID },
      VECINO,
    );

    expect(guardada()?.estado).toBe(EstadoSolicitudRetiro.CANCELADA);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AccionAuditoria.UPDATE,
        datosAnteriores: { estado: EstadoSolicitudRetiro.EN_REVISION },
        datosNuevos: { estado: EstadoSolicitudRetiro.CANCELADA },
      }),
    );
  });

  it('al cancelar borra la dirección de retiro, que ya no tiene finalidad', async () => {
    const { service, guardada } = montar(filaBase());

    await service.cancelarPorCiudadano(7, {}, VECINO);

    expect(guardada()?.direccionRetiro).toBeNull();
    expect(guardada()?.direccionAnonimizada).toBeNull();
  });

  it('cancelar una derivada responde 400 y no guarda', async () => {
    const { service, solicitudRepo } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.DERIVADA }),
    );

    await expect(
      service.cancelarPorCiudadano(
        7,
        { usuarioCiudadanoId: CIUDADANO_ID },
        VECINO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('cancelar la solicitud de otro vecino responde 403', async () => {
    const { service, solicitudRepo } = montar(
      filaBase({ usuarioCiudadanoId: OTRO_CIUDADANO_ID }),
    );

    await expect(
      service.cancelarPorCiudadano(
        7,
        { usuarioCiudadanoId: CIUDADANO_ID },
        VECINO,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('no permite cancelar si el pago ya está pagado (400)', async () => {
    const { service, solicitudRepo } = montar(
      filaBase({
        estado: EstadoSolicitudRetiro.APROBADA,
        estadoPago: EstadoPagoSolicitud.PAGADO,
        monto: 15000,
      }),
    );

    await expect(
      service.cancelarPorCiudadano(
        7,
        { usuarioCiudadanoId: CIUDADANO_ID },
        VECINO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });
});

describe('SolicitudesRetiroService.findOneConUltimaRevision', () => {
  it('agrega la última revisión solo con decisión, motivo, comentario y fecha', async () => {
    const { service, revisionRepo } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.REQUIERE_MODIFICACION }),
    );
    const fecha = new Date('2026-09-18T10:00:00.000Z');
    revisionRepo.findOne.mockResolvedValueOnce({
      decision: EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
      motivo: MotivoRevision.DESCRIPCION_INCOMPLETA,
      comentario: 'Indica el tamaño del mueble',
      createdAt: fecha,
    });

    const detalle = await service.findOneConUltimaRevision(7, VECINO);

    expect(detalle.ultimaRevision).toEqual({
      decision: EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
      motivo: MotivoRevision.DESCRIPCION_INCOMPLETA,
      comentario: 'Indica el tamaño del mueble',
      fecha,
    });
    expect(detalle.fotoUrl).toBe('/api/solicitudes-retiro/7/foto');
    const [consulta] = revisionRepo.findOne.mock.calls[0] as unknown as [
      { where: unknown; select: Record<string, boolean> },
    ];
    expect(consulta.where).toEqual({ solicitudRetiroId: 7 });
    expect(Object.keys(consulta.select)).toEqual([
      'decision',
      'motivo',
      'comentario',
      'createdAt',
    ]);
  });

  it('sin revisiones, ultimaRevision es null', async () => {
    const { service } = montar(filaBase());

    const detalle = await service.findOneConUltimaRevision(7, VECINO);

    expect(detalle.ultimaRevision).toBeNull();
  });

  it('otro vecino no puede verla (403)', async () => {
    const { service } = montar(
      filaBase({ usuarioCiudadanoId: OTRO_CIUDADANO_ID }),
    );

    await expect(
      service.findOneConUltimaRevision(7, VECINO),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('SolicitudesRetiroService.reenviarPorCiudadano', () => {
  const requiereModificacion = (cambios: Partial<SolicitudRetiro> = {}) =>
    filaBase({
      estado: EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
      descripcion: 'Sillón',
      ...cambios,
    });

  it('vuelve a en_revision con las correcciones y audita estado y categoría, no la descripción', async () => {
    const { service, auditoria, guardada } = montar(requiereModificacion());

    await service.reenviarPorCiudadano(
      7,
      { descripcion: 'Sillón de tres cuerpos', residuoCatalogoId: 4 },
      undefined,
      VECINO,
    );

    expect(guardada()).toMatchObject({
      estado: EstadoSolicitudRetiro.EN_REVISION,
      descripcion: 'Sillón de tres cuerpos',
      residuoCatalogoId: 4,
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AccionAuditoria.UPDATE,
        datosAnteriores: {
          estado: EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
          residuoCatalogoId: 1,
        },
        datosNuevos: {
          estado: EstadoSolicitudRetiro.EN_REVISION,
          residuoCatalogoId: 4,
        },
      }),
    );
    expect(JSON.stringify(auditoria.registrar.mock.calls)).not.toContain(
      'Sillón',
    );
  });

  it('corregir solo el residuo cambia el objeto principal y conserva los demás', async () => {
    const { service, objetos, guardada } = montar(requiereModificacion());
    objetos().push(
      {
        solicitudRetiroId: 7,
        residuoCatalogoId: 1,
        nombreOtro: null,
        cantidad: 1,
        orden: 0,
      },
      {
        solicitudRetiroId: 7,
        residuoCatalogoId: null,
        nombreOtro: 'Piano',
        cantidad: 1,
        orden: 1,
      },
    );

    await service.reenviarPorCiudadano(
      7,
      { residuoCatalogoId: 4 },
      undefined,
      VECINO,
    );

    expect(guardada()?.residuoCatalogoId).toBe(4);
    expect(objetos()).toEqual([
      expect.objectContaining({ residuoCatalogoId: 4, orden: 0 }),
      expect.objectContaining({ nombreOtro: 'Piano', orden: 1 }),
    ]);
  });

  it('una lista nueva de objetos reemplaza la anterior', async () => {
    const { service, guardada, objetos } = montar(requiereModificacion());

    await service.reenviarPorCiudadano(
      7,
      {
        objetos: JSON.stringify([
          { nombreOtro: 'Piano' },
          { residuoCatalogoId: 2, cantidad: 2 },
        ]),
      },
      undefined,
      VECINO,
    );

    expect(guardada()).toMatchObject({
      residuoCatalogoId: null,
      nombreResiduoOtro: 'Piano',
    });
    expect(objetos()).toEqual([
      expect.objectContaining({ nombreOtro: 'Piano', orden: 0 }),
      expect.objectContaining({ residuoCatalogoId: 2, cantidad: 2, orden: 1 }),
    ]);
  });

  it('sin correcciones también se puede reenviar, y la auditoría lleva solo el estado', async () => {
    const { service, auditoria, guardada } = montar(requiereModificacion());

    await service.reenviarPorCiudadano(7, {}, undefined, VECINO);

    expect(guardada()).toMatchObject({
      estado: EstadoSolicitudRetiro.EN_REVISION,
      descripcion: 'Sillón',
      residuoCatalogoId: 1,
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        datosAnteriores: {
          estado: EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
        },
        datosNuevos: { estado: EstadoSolicitudRetiro.EN_REVISION },
      }),
    );
  });

  it('actualiza dirección y copia el puente a direccionAnonimizada', async () => {
    const { service, guardada } = montar(requiereModificacion());

    await service.reenviarPorCiudadano(
      7,
      { direccionRetiro: 'Nueva 99' },
      undefined,
      VECINO,
    );

    expect(guardada()).toMatchObject({
      direccionRetiro: 'Nueva 99',
      direccionAnonimizada: 'Nueva 99',
    });
  });

  it.each([
    EstadoSolicitudRetiro.EN_REVISION,
    EstadoSolicitudRetiro.APROBADA,
    EstadoSolicitudRetiro.CANCELADA,
  ])('desde %s responde 400 y no guarda', async (estado) => {
    const { service, solicitudRepo } = montar(filaBase({ estado }));

    await expect(
      service.reenviarPorCiudadano(7, {}, undefined, VECINO),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('una rechazada responde 403: solo un admin la reabre', async () => {
    const { service, solicitudRepo } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.RECHAZADA }),
    );

    await expect(
      service.reenviarPorCiudadano(7, {}, undefined, VECINO),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('la solicitud de otro vecino responde 403', async () => {
    const { service, solicitudRepo } = montar(
      requiereModificacion({ usuarioCiudadanoId: OTRO_CIUDADANO_ID }),
    );

    await expect(
      service.reenviarPorCiudadano(7, {}, undefined, VECINO),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('una categoría inexistente responde 404 y no guarda', async () => {
    const { service, solicitudRepo, residuos } = montar(requiereModificacion());
    residuos.findCatalogoById.mockResolvedValueOnce(null);

    await expect(
      service.reenviarPorCiudadano(
        7,
        { residuoCatalogoId: 999 },
        undefined,
        VECINO,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('una solicitud inexistente responde 404', async () => {
    const { service } = montar();

    await expect(
      service.reenviarPorCiudadano(7, {}, undefined, VECINO),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
