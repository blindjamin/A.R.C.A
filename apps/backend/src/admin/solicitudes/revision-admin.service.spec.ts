import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  AccionAuditoria,
  type AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  ITEMS_CHECKLIST_APROBACION,
  MotivoRevision,
  RolAdministrador,
  type SolicitudRetiro,
} from '../../core';
import type { Repository } from 'typeorm';
import { RevisionAdminService } from './revision-admin.service';
import type { NotificacionesService } from '../../notificaciones/notificaciones.service';

const FUNCIONARIO: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000002',
  esAdministrador: true,
  administradorId: '00000000-0000-4000-8000-0000000000A2',
  rol: RolAdministrador.FUNCIONARIO,
};

const OTRO_FUNCIONARIO_ID = '00000000-0000-4000-8000-0000000000A4';

const filaBase = (cambios: Partial<SolicitudRetiro> = {}): SolicitudRetiro =>
  ({
    id: 7,
    usuarioCiudadanoId: '00000000-0000-4000-8000-000000000001',
    residuoCatalogoId: 1,
    nombreResiduoOtro: null,
    estado: EstadoSolicitudRetiro.EN_REVISION,
    estadoPago: EstadoPagoSolicitud.NO_APLICA,
    monto: null,
    fechaRevision: null,
    revisadoPorId: null,
    fechaCierre: null,
    tomadaPorId: null,
    tomadaHasta: null,
    residuoCatalogo: { id: 1, precio: 15000 },
    ...cambios,
  }) as SolicitudRetiro;

const checklistCompleto = () =>
  Object.fromEntries(ITEMS_CHECKLIST_APROBACION.map((i) => [i, true]));

function montar(fila: SolicitudRetiro) {
  let guardada = { ...fila };
  const revisiones: Array<Record<string, unknown>> = [];
  const notas: Array<Record<string, unknown>> = [];

  const manager = {
    save: jest.fn((entidad: unknown, datos?: Record<string, unknown>) => {
      // save(entidad) para la solicitud; save(Clase, datos) para el historial.
      if (datos) {
        const fila = { id: revisiones.length + 1, ...datos };
        revisiones.push(fila);
        return Promise.resolve(fila);
      }
      guardada = { ...(entidad as SolicitudRetiro) };
      return Promise.resolve(entidad);
    }),
  };

  const solicitudes = {
    findOne: jest.fn(() => Promise.resolve({ ...guardada })),
    update: jest.fn((_id: number, cambios: Partial<SolicitudRetiro>) => {
      guardada = { ...guardada, ...cambios };
      return Promise.resolve();
    }),
    manager: {
      transaction: jest.fn((fn: (m: typeof manager) => Promise<unknown>) =>
        fn(manager),
      ),
    },
  };
  const residuos = {
    findOne: jest.fn(({ where }: { where: { id: number } }) =>
      Promise.resolve(where.id === 99 ? null : { id: where.id, precio: 1 }),
    ),
  };
  const revisionesRepo = { find: jest.fn(() => Promise.resolve([])) };
  const notasRepo = {
    find: jest.fn(() => Promise.resolve([])),
    save: jest.fn((datos: Record<string, unknown>) => {
      const fila = { id: notas.length + 1, ...datos };
      notas.push(fila);
      return Promise.resolve(fila);
    }),
  };
  const auditoria = { registrar: jest.fn(() => Promise.resolve()) };
  const notificaciones = { notificar: jest.fn(() => Promise.resolve()) };
  // Sin filas: el precio sugerido sale del residuo principal, como antes de HU-01.
  const objetosRepo = {
    find: jest.fn((): Promise<unknown[]> => Promise.resolve([])),
    update: jest.fn(() => Promise.resolve()),
  };

  const service = new RevisionAdminService(
    solicitudes as unknown as Repository<SolicitudRetiro>,
    residuos as never,
    revisionesRepo as never,
    notasRepo as never,
    objetosRepo as never,
    auditoria as unknown as AuditoriaService,
    notificaciones as unknown as NotificacionesService,
  );

  return {
    service,
    solicitudes,
    auditoria,
    notificaciones,
    revisiones,
    notas,
    objetosRepo,
    guardada: () => guardada,
  };
}

const tomadaPorOtro = () =>
  filaBase({
    tomadaPorId: OTRO_FUNCIONARIO_ID,
    tomadaHasta: new Date(Date.now() + 10 * 60 * 1000),
  });

describe('RevisionAdminService.tomar', () => {
  it('toma una solicitud libre por 15 minutos', async () => {
    const { service, guardada } = montar(filaBase());

    const { tomadaHasta } = await service.tomar(7, FUNCIONARIO);

    expect(guardada().tomadaPorId).toBe(FUNCIONARIO.administradorId);
    const minutos = (tomadaHasta.getTime() - Date.now()) / 60000;
    expect(minutos).toBeGreaterThan(14);
    expect(minutos).toBeLessThanOrEqual(15);
  });

  it('responde 409 si otro funcionario la tiene tomada', async () => {
    const { service } = montar(tomadaPorOtro());

    await expect(service.tomar(7, FUNCIONARIO)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('una toma vencida de otro se puede reemplazar', async () => {
    const { service, guardada } = montar(
      filaBase({
        tomadaPorId: OTRO_FUNCIONARIO_ID,
        tomadaHasta: new Date(Date.now() - 1000),
      }),
    );

    await service.tomar(7, FUNCIONARIO);

    expect(guardada().tomadaPorId).toBe(FUNCIONARIO.administradorId);
  });

  it('solo se toman solicitudes en revisión', async () => {
    const { service } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.APROBADA }),
    );

    await expect(service.tomar(7, FUNCIONARIO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('RevisionAdminService.revisar', () => {
  it('con varios objetos del catálogo, cobra la suma de precio por cantidad', async () => {
    const { service, guardada, objetosRepo } = montar(filaBase());
    objetosRepo.find.mockResolvedValueOnce([
      {
        nombreOtro: null,
        cantidad: 2,
        residuoCatalogo: { nombre: 'Silla', precio: 3000 },
      },
      {
        nombreOtro: null,
        cantidad: 1,
        residuoCatalogo: { nombre: 'Mesa', precio: 7000 },
      },
    ]);

    await service.revisar(
      7,
      {
        decision: EstadoSolicitudRetiro.APROBADA,
        checklist: checklistCompleto(),
      },
      FUNCIONARIO,
    );

    expect(guardada()).toMatchObject({ monto: 13000 });
  });

  it('con un objeto fuera del catálogo, aprobar exige el monto del funcionario', async () => {
    const { service, guardada, objetosRepo } = montar(filaBase());
    const conOtro = [
      {
        nombreOtro: null,
        cantidad: 1,
        residuoCatalogo: { nombre: 'Mesa', precio: 7000 },
      },
      { nombreOtro: 'Piano', cantidad: 1, residuoCatalogo: null },
    ];
    objetosRepo.find.mockResolvedValue(conOtro);

    await expect(
      service.revisar(
        7,
        {
          decision: EstadoSolicitudRetiro.APROBADA,
          checklist: checklistCompleto(),
        },
        FUNCIONARIO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.revisar(
      7,
      {
        decision: EstadoSolicitudRetiro.APROBADA,
        checklist: checklistCompleto(),
        montoFinal: 25000,
      },
      FUNCIONARIO,
    );
    expect(guardada()).toMatchObject({ monto: 25000 });
  });

  it('aprobar guarda la decisión, libera la toma y audita sin texto libre', async () => {
    const { service, guardada, revisiones, auditoria } = montar(
      filaBase({
        tomadaPorId: FUNCIONARIO.administradorId,
        tomadaHasta: new Date(Date.now() + 60000),
      }),
    );

    await service.revisar(
      7,
      {
        decision: EstadoSolicitudRetiro.APROBADA,
        checklist: checklistCompleto(),
      },
      FUNCIONARIO,
    );

    expect(guardada()).toMatchObject({
      estado: EstadoSolicitudRetiro.APROBADA,
      monto: 15000,
      estadoPago: EstadoPagoSolicitud.PENDIENTE,
      tomadaPorId: null,
      tomadaHasta: null,
    });
    expect(revisiones).toHaveLength(1);
    expect(revisiones[0]).toMatchObject({
      solicitudRetiroId: 7,
      revisadoPorId: FUNCIONARIO.administradorId,
      decision: EstadoSolicitudRetiro.APROBADA,
    });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AccionAuditoria.UPDATE,
        datosNuevos: expect.objectContaining({
          estado: EstadoSolicitudRetiro.APROBADA,
          decision: EstadoSolicitudRetiro.APROBADA,
        }) as unknown,
      }),
    );
  });

  it.each([
    [
      EstadoSolicitudRetiro.APROBADA,
      'Tu solicitud #7 fue aprobada',
      { checklist: checklistCompleto() },
    ],
    [
      EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
      'Tu solicitud #7 necesita cambios',
      { motivo: MotivoRevision.FOTO_INSUFICIENTE, comentario: 'nota interna' },
    ],
    [
      EstadoSolicitudRetiro.RECHAZADA,
      'Tu solicitud #7 fue rechazada',
      { motivo: MotivoRevision.DUPLICADA, comentario: 'nota interna' },
    ],
  ])(
    '%s avisa al vecino en la campanita, sin notas',
    async (decision, texto, extra) => {
      const { service, notificaciones } = montar(filaBase());

      await service.revisar(7, { decision, ...extra }, FUNCIONARIO);

      expect(notificaciones.notificar).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000001',
        {
          tipo: 'solicitud',
          titulo: 'Solicitud de retiro',
          cuerpo: texto,
          url: '/mis-solicitudes',
        },
      );
      expect(JSON.stringify(notificaciones.notificar.mock.calls)).not.toContain(
        'nota interna',
      );
    },
  );

  it('una revisión inválida no avisa', async () => {
    const { service, notificaciones } = montar(filaBase());

    await expect(
      service.revisar(
        7,
        { decision: EstadoSolicitudRetiro.APROBADA, checklist: {} },
        FUNCIONARIO,
      ),
    ).rejects.toBeDefined();
    expect(notificaciones.notificar).not.toHaveBeenCalled();
  });

  it('pedir modificación guarda motivo y comentario, pero audita solo el motivo', async () => {
    const { service, revisiones, auditoria } = montar(filaBase());

    await service.revisar(
      7,
      {
        decision: EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
        motivo: MotivoRevision.FOTO_INSUFICIENTE,
        comentario: 'La foto no muestra el residuo completo',
      },
      FUNCIONARIO,
    );

    expect(revisiones[0]).toMatchObject({
      motivo: MotivoRevision.FOTO_INSUFICIENTE,
      comentario: 'La foto no muestra el residuo completo',
    });
    const [[registro]] = auditoria.registrar.mock.calls as unknown as [
      [{ datosNuevos: Record<string, unknown> }],
    ];
    expect(registro.datosNuevos.motivo).toBe(MotivoRevision.FOTO_INSUFICIENTE);
    expect(JSON.stringify(registro)).not.toContain('La foto no muestra');
  });

  it('aprobar con checklist incompleto responde 400 y no guarda', async () => {
    const { service, revisiones, guardada } = montar(filaBase());

    await expect(
      service.revisar(
        7,
        { decision: EstadoSolicitudRetiro.APROBADA, checklist: {} },
        FUNCIONARIO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(revisiones).toHaveLength(0);
    expect(guardada().estado).toBe(EstadoSolicitudRetiro.EN_REVISION);
  });

  it('responde 409 si otro funcionario la tiene tomada', async () => {
    const { service } = montar(tomadaPorOtro());

    await expect(
      service.revisar(
        7,
        {
          decision: EstadoSolicitudRetiro.RECHAZADA,
          motivo: MotivoRevision.DUPLICADA,
        },
        FUNCIONARIO,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('RevisionAdminService.corregirCategoria', () => {
  it('cambia el residuo y lo audita', async () => {
    const { service, guardada, auditoria } = montar(filaBase());

    await service.corregirCategoria(7, { residuoCatalogoId: 3 }, FUNCIONARIO);

    expect(guardada().residuoCatalogoId).toBe(3);
    expect(guardada().nombreResiduoOtro).toBeNull();
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        datosAnteriores: { residuoCatalogoId: 1, nombreResiduoOtro: null },
        datosNuevos: { residuoCatalogoId: 3, nombreResiduoOtro: null },
      }),
    );
  });

  it('fuera de revisión responde 400', async () => {
    const { service } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.APROBADA }),
    );

    await expect(
      service.corregirCategoria(7, { residuoCatalogoId: 3 }, FUNCIONARIO),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('un residuo inexistente responde 404', async () => {
    const { service } = montar(filaBase());

    await expect(
      service.corregirCategoria(7, { residuoCatalogoId: 99 }, FUNCIONARIO),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('RevisionAdminService.crearNota', () => {
  it('guarda la nota y audita sin el texto', async () => {
    const { service, notas, auditoria } = montar(filaBase());

    await service.crearNota(
      7,
      { texto: 'Vecino llamó por teléfono' },
      FUNCIONARIO,
    );

    expect(notas[0]).toMatchObject({
      solicitudRetiroId: 7,
      autorId: FUNCIONARIO.administradorId,
      texto: 'Vecino llamó por teléfono',
    });
    expect(JSON.stringify(auditoria.registrar.mock.calls)).not.toContain(
      'Vecino llamó',
    );
  });
});
