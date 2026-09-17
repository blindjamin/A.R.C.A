import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AccionAuditoria,
  type AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  RolAdministrador,
  type SolicitudRetiro,
} from '@arca/core';
import type { Repository } from 'typeorm';
import { SolicitudesAdminService } from './solicitudes-admin.service';

const FUNCIONARIO: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000002',
  esAdministrador: true,
  administradorId: '00000000-0000-4000-8000-0000000000A2',
  rol: RolAdministrador.FUNCIONARIO,
};

const ADMIN: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000003',
  esAdministrador: true,
  administradorId: '00000000-0000-4000-8000-0000000000A3',
  rol: RolAdministrador.ADMIN,
};

const filaBase = (cambios: Partial<SolicitudRetiro> = {}): SolicitudRetiro =>
  ({
    id: 7,
    usuarioCiudadanoId: '00000000-0000-4000-8000-000000000001',
    residuoCatalogoId: 1,
    estado: EstadoSolicitudRetiro.EN_REVISION,
    estadoPago: EstadoPagoSolicitud.NO_APLICA,
    monto: null,
    fechaRevision: null,
    revisadoPorId: null,
    fechaCierre: null,
    razonRechazo: null,
    residuoCatalogo: { id: 1, precio: 15000 },
    ...cambios,
  }) as SolicitudRetiro;

/**
 * Repositorio en memoria con una sola fila: `findOne` devuelve una copia y
 * `save` la reemplaza, así el service no puede depender de mutar el objeto
 * leído.
 */
function montar(fila: SolicitudRetiro) {
  let guardada = { ...fila };

  const repositorio = {
    findOne: jest.fn(() => Promise.resolve({ ...guardada })),
    save: jest.fn((s: SolicitudRetiro) => {
      guardada = { ...s };
      return Promise.resolve({ ...s });
    }),
  };
  const auditoria = { registrar: jest.fn(() => Promise.resolve()) };

  const service = new SolicitudesAdminService(
    repositorio as unknown as Repository<SolicitudRetiro>,
    auditoria as unknown as AuditoriaService,
  );

  return { service, repositorio, auditoria, guardada: () => guardada };
}

describe('SolicitudesAdminService.update', () => {
  it('aprobar congela monto y pago, registra revisor y audita', async () => {
    const { service, auditoria, guardada } = montar(filaBase());

    await service.update(
      7,
      { estado: EstadoSolicitudRetiro.APROBADA },
      FUNCIONARIO,
    );

    expect(guardada()).toMatchObject({
      estado: EstadoSolicitudRetiro.APROBADA,
      estadoPago: EstadoPagoSolicitud.PENDIENTE,
      monto: 15000,
      revisadoPorId: FUNCIONARIO.administradorId,
    });
    expect(auditoria.registrar).toHaveBeenCalledTimes(1);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AccionAuditoria.UPDATE,
        entidadId: 7,
        datosAnteriores: expect.objectContaining({
          estado: EstadoSolicitudRetiro.EN_REVISION,
        }) as unknown,
        datosNuevos: expect.objectContaining({
          estado: EstadoSolicitudRetiro.APROBADA,
          estadoPago: EstadoPagoSolicitud.PENDIENTE,
          monto: 15000,
        }) as unknown,
      }),
    );
  });

  it('una transición que no existe responde 400 y no guarda', async () => {
    const { service, repositorio, auditoria } = montar(filaBase());

    await expect(
      service.update(7, { estado: EstadoSolicitudRetiro.RETIRADA }, ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repositorio.save).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('un funcionario no puede reabrir una rechazada (403)', async () => {
    const { service } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.RECHAZADA }),
    );

    await expect(
      service.update(
        7,
        { estado: EstadoSolicitudRetiro.EN_REVISION },
        FUNCIONARIO,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('un admin sí puede reabrir una rechazada', async () => {
    const { service, guardada } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.RECHAZADA }),
    );

    await service.update(
      7,
      { estado: EstadoSolicitudRetiro.EN_REVISION },
      ADMIN,
    );

    expect(guardada().estado).toBe(EstadoSolicitudRetiro.EN_REVISION);
  });

  it('derivar con pago pendiente responde 400', async () => {
    const { service } = montar(
      filaBase({
        estado: EstadoSolicitudRetiro.APROBADA,
        estadoPago: EstadoPagoSolicitud.PENDIENTE,
      }),
    );

    await expect(
      service.update(
        7,
        { estado: EstadoSolicitudRetiro.DERIVADA },
        FUNCIONARIO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SolicitudesAdminService.detalle', () => {
  it('en revisión ofrece las tres decisiones al funcionario', async () => {
    const { service } = montar(filaBase());

    const detalle = await service.detalle(7, FUNCIONARIO);

    expect(detalle.transicionesDisponibles).toEqual([
      EstadoSolicitudRetiro.APROBADA,
      EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
      EstadoSolicitudRetiro.RECHAZADA,
    ]);
  });

  it('rechazada: nada para el funcionario, reabrir para el admin', async () => {
    const { service } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.RECHAZADA }),
    );

    expect(
      (await service.detalle(7, FUNCIONARIO)).transicionesDisponibles,
    ).toEqual([]);
    expect((await service.detalle(7, ADMIN)).transicionesDisponibles).toEqual([
      EstadoSolicitudRetiro.EN_REVISION,
    ]);
  });
});
