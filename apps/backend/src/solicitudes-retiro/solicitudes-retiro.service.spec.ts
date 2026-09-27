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
  MotivoRevision,
  type ResiduoCatalogo,
  type RevisionSolicitud,
  type SolicitudRetiro,
  type UsuarioCiudadano,
} from '../core';
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
    direccionAnonimizada: null,
    latitudCapturada: null,
    longitudCapturada: null,
    fechaSolicitud: new Date('2026-09-17T12:00:00.000Z'),
    ...cambios,
  }) as SolicitudRetiro;

function montar(fila?: SolicitudRetiro) {
  let guardada = fila ? { ...fila } : null;

  const solicitudRepo = {
    create: jest.fn((data: Partial<SolicitudRetiro>) => ({
      id: 1,
      ...data,
    })),
    save: jest.fn((s: SolicitudRetiro) => {
      guardada = { ...s };
      return Promise.resolve({ ...s });
    }),
    findOne: jest.fn(() => Promise.resolve(guardada ? { ...guardada } : null)),
    find: jest.fn(() => Promise.resolve([])),
  };

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

  const residuos = {
    findCatalogoById: jest.fn((id: number): Promise<ResiduoCatalogo | null> =>
      Promise.resolve({ id, precio: 15000 } as ResiduoCatalogo),
    ),
  };

  const auditoria = { registrar: jest.fn(() => Promise.resolve()) };

  const service = new SolicitudesRetiroService(
    solicitudRepo as unknown as Repository<SolicitudRetiro>,
    ciudadanoRepo as unknown as Repository<UsuarioCiudadano>,
    revisionRepo as unknown as Repository<RevisionSolicitud>,
    residuos as unknown as ResiduosService,
    auditoria as unknown as AuditoriaService,
  );

  return {
    service,
    solicitudRepo,
    revisionRepo,
    residuos,
    auditoria,
    guardada: () => guardada,
  };
}

describe('SolicitudesRetiroService.create', () => {
  it('deja la solicitud en en_revision con pago no_aplica', async () => {
    const { service, auditoria, guardada } = montar();

    const creada = await service.create(
      {
        usuarioCiudadanoId: CIUDADANO_ID,
        residuoCatalogoId: 1,
      },
      VECINO,
    );

    expect(creada.estado).toBe(EstadoSolicitudRetiro.EN_REVISION);
    expect(creada.estadoPago).toBe(EstadoPagoSolicitud.NO_APLICA);
    expect(guardada()?.estado).toBe(EstadoSolicitudRetiro.EN_REVISION);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AccionAuditoria.CREATE,
        datosNuevos: { estado: EstadoSolicitudRetiro.EN_REVISION },
      }),
    );
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

  it('sin correcciones también se puede reenviar, y la auditoría lleva solo el estado', async () => {
    const { service, auditoria, guardada } = montar(requiereModificacion());

    await service.reenviarPorCiudadano(7, {}, VECINO);

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

  it.each([
    EstadoSolicitudRetiro.EN_REVISION,
    EstadoSolicitudRetiro.APROBADA,
    EstadoSolicitudRetiro.CANCELADA,
  ])('desde %s responde 400 y no guarda', async (estado) => {
    const { service, solicitudRepo } = montar(filaBase({ estado }));

    await expect(
      service.reenviarPorCiudadano(7, {}, VECINO),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('una rechazada responde 403: solo un admin la reabre', async () => {
    const { service, solicitudRepo } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.RECHAZADA }),
    );

    await expect(
      service.reenviarPorCiudadano(7, {}, VECINO),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('la solicitud de otro vecino responde 403', async () => {
    const { service, solicitudRepo } = montar(
      requiereModificacion({ usuarioCiudadanoId: OTRO_CIUDADANO_ID }),
    );

    await expect(
      service.reenviarPorCiudadano(7, {}, VECINO),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('una categoría inexistente responde 404 y no guarda', async () => {
    const { service, solicitudRepo, residuos } = montar(requiereModificacion());
    residuos.findCatalogoById.mockResolvedValueOnce(null);

    await expect(
      service.reenviarPorCiudadano(7, { residuoCatalogoId: 999 }, VECINO),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(solicitudRepo.save).not.toHaveBeenCalled();
  });

  it('una solicitud inexistente responde 404', async () => {
    const { service } = montar();

    await expect(
      service.reenviarPorCiudadano(7, {}, VECINO),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
