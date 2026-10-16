import { BadRequestException } from '@nestjs/common';
import type { FindManyOptions } from 'typeorm';
import {
  AccionAuditoria,
  type Auditoria,
  RolAdministrador,
  TipoActorAuditoria,
  type UsuarioAdministrador,
} from '../../core';
import {
  AuditoriaAdminService,
  LIMITE_EXPORTACION,
} from './auditoria-admin.service';

const ADMIN_ID = '00000000-0000-4000-8000-0000000000A3';

function montar(filas: Partial<Auditoria>[] = []) {
  const auditoria = {
    find: jest.fn((opciones: FindManyOptions<Auditoria>) => {
      void opciones;
      return Promise.resolve(filas as Auditoria[]);
    }),
  };
  const administradores = {
    find: jest.fn(() =>
      Promise.resolve([
        {
          id: ADMIN_ID,
          nombre: 'Carlos',
          apellido: 'Álvarez',
          rol: RolAdministrador.ADMIN,
          activo: true,
        },
      ] as UsuarioAdministrador[]),
    ),
  };
  const servicio = new AuditoriaAdminService(
    auditoria as never,
    administradores as never,
  );
  const ultimaConsulta = () => auditoria.find.mock.calls.at(-1)![0];
  return { servicio, ultimaConsulta };
}

describe('AuditoriaAdminService', () => {
  it('sin filtros consulta todo, del más reciente al más antiguo', async () => {
    const { servicio, ultimaConsulta } = montar();
    await servicio.findAll();

    expect(ultimaConsulta().where).toEqual({});
    expect(ultimaConsulta().order).toEqual({ fechaAccion: 'DESC', id: 'DESC' });
    expect(ultimaConsulta().take).toBe(1000);
  });

  it('filtra por rango de fechas, ambos extremos inclusive', async () => {
    const { servicio, ultimaConsulta } = montar();
    await servicio.findAll({
      desde: '2026-10-01T03:00:00.000Z',
      hasta: '2026-10-02T02:59:59.999Z',
    });

    const fecha = (ultimaConsulta().where as { fechaAccion: unknown })
      .fechaAccion as { type: string; value: Date[] };
    expect(fecha.type).toBe('between');
    expect(fecha.value).toEqual([
      new Date('2026-10-01T03:00:00.000Z'),
      new Date('2026-10-02T02:59:59.999Z'),
    ]);
  });

  it('acepta solo desde o solo hasta', async () => {
    const { servicio, ultimaConsulta } = montar();

    await servicio.findAll({ desde: '2026-10-01T03:00:00.000Z' });
    expect(
      (ultimaConsulta().where as { fechaAccion: { type: string } }).fechaAccion
        .type,
    ).toBe('moreThanOrEqual');

    await servicio.findAll({ hasta: '2026-10-01T03:00:00.000Z' });
    expect(
      (ultimaConsulta().where as { fechaAccion: { type: string } }).fechaAccion
        .type,
    ).toBe('lessThanOrEqual');
  });

  it('rechaza un rango invertido o de más de un año', async () => {
    const { servicio } = montar();

    await expect(
      servicio.findAll({
        desde: '2026-10-02T00:00:00.000Z',
        hasta: '2026-10-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      servicio.findAll({
        desde: '2025-01-01T00:00:00.000Z',
        hasta: '2026-10-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it.each([
    ['vecinos', { tipoActor: TipoActorAuditoria.CIUDADANO }],
    ['sistema', { tipoActor: TipoActorAuditoria.SISTEMA }],
    [
      ADMIN_ID,
      {
        tipoActor: TipoActorAuditoria.ADMINISTRADOR,
        actorAdministradorId: ADMIN_ID,
      },
    ],
  ])('filtra por actor %s', async (actor, esperado) => {
    const { servicio, ultimaConsulta } = montar();
    await servicio.findAll({ actor });

    expect(ultimaConsulta().where).toEqual(esperado);
  });

  it('la exportación usa los mismos filtros con un tope mayor', async () => {
    const { servicio, ultimaConsulta } = montar();
    await servicio.exportar({ actor: 'sistema' });

    expect(ultimaConsulta().where).toEqual({
      tipoActor: TipoActorAuditoria.SISTEMA,
    });
    expect(ultimaConsulta().take).toBe(LIMITE_EXPORTACION);
  });

  it('lista los funcionarios para el filtro', async () => {
    const { servicio } = montar();

    await expect(servicio.actores()).resolves.toEqual([
      {
        id: ADMIN_ID,
        nombre: 'Carlos Álvarez',
        rol: 'Administrador',
        activo: true,
      },
    ]);
  });

  it('distingue la exportación de la consulta en la vista', async () => {
    const base = {
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      entidad: 'auditoria',
      entidadId: null,
      accion: AccionAuditoria.ACCESO,
      ipOrigen: null,
      fechaAccion: new Date('2026-10-16T15:00:00Z'),
      actorAdministrador: null,
    };
    const { servicio } = montar([
      { ...base, id: 2, datosNuevos: { exportacion: 'csv', filas: 3 } },
      { ...base, id: 1, datosNuevos: { registrosConsultados: 3 } },
    ]);

    const [exportacion, consulta] = await servicio.findAll();
    expect(exportacion.accion).toBe(
      'Exportación del registro de auditoría (CSV)',
    );
    expect(consulta.accion).toBe('Acceso al registro de auditoría');
  });
});
