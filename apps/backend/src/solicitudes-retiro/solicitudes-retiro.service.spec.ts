import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AccionAuditoria,
  type AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  type ResiduoCatalogo,
  type SolicitudRetiro,
  type UsuarioCiudadano,
} from '@arca/core';
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

  const residuos = {
    findCatalogoById: jest.fn(() =>
      Promise.resolve({ id: 1, precio: 15000 } as ResiduoCatalogo),
    ),
  };

  const auditoria = { registrar: jest.fn(() => Promise.resolve()) };

  const service = new SolicitudesRetiroService(
    solicitudRepo as unknown as Repository<SolicitudRetiro>,
    ciudadanoRepo as unknown as Repository<UsuarioCiudadano>,
    residuos as unknown as ResiduosService,
    auditoria as unknown as AuditoriaService,
  );

  return { service, solicitudRepo, auditoria, guardada: () => guardada };
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
