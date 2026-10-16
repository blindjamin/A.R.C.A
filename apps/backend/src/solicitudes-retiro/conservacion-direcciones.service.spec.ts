import type { Repository } from 'typeorm';
import {
  AccionAuditoria,
  type AuditoriaService,
  ESTADOS_FINALES,
  type SolicitudRetiro,
  TipoActorAuditoria,
} from '../core';
import {
  ConservacionDireccionesService,
  DIAS_CONSERVACION_DIRECCION,
} from './conservacion-direcciones.service';

describe('ConservacionDireccionesService', () => {
  const AHORA = new Date('2026-10-16T12:00:00.000Z');

  interface QueryBuilderFalso {
    update: jest.Mock<QueryBuilderFalso, []>;
    set: jest.Mock<QueryBuilderFalso, [unknown]>;
    where: jest.Mock<QueryBuilderFalso, [string, unknown]>;
    andWhere: jest.Mock<QueryBuilderFalso, [string, unknown?]>;
    execute: jest.Mock<Promise<{ affected: number }>, []>;
  }

  function montar(afectadas: number) {
    const qb = {} as QueryBuilderFalso;
    qb.update = jest.fn(() => qb);
    qb.set = jest.fn(() => qb);
    qb.where = jest.fn(() => qb);
    qb.andWhere = jest.fn(() => qb);
    qb.execute = jest.fn(() => Promise.resolve({ affected: afectadas }));
    const repo = { createQueryBuilder: jest.fn(() => qb) };
    const auditoria = { registrar: jest.fn(() => Promise.resolve()) };
    const service = new ConservacionDireccionesService(
      repo as unknown as Repository<SolicitudRetiro>,
      auditoria as unknown as AuditoriaService,
    );
    return { service, qb, auditoria };
  }

  it('borra la dirección de las cerradas hace más del plazo', async () => {
    const { service, qb } = montar(2);

    await expect(service.borrarDireccionesVencidas(AHORA)).resolves.toBe(2);

    expect(qb.set).toHaveBeenCalledWith({
      direccionRetiro: null,
      direccionAnonimizada: null,
    });
    expect(qb.where).toHaveBeenCalledWith('estado IN (:...finales)', {
      finales: [...ESTADOS_FINALES],
    });
    const limiteEsperado = new Date(
      AHORA.getTime() - DIAS_CONSERVACION_DIRECCION * 24 * 60 * 60 * 1000,
    );
    expect(qb.andWhere).toHaveBeenCalledWith('fecha_cierre < :limite', {
      limite: limiteEsperado,
    });
  });

  it('deja constancia en la auditoría sin ids ni direcciones', async () => {
    const { service, auditoria } = montar(3);

    await service.borrarDireccionesVencidas(AHORA);

    expect(auditoria.registrar).toHaveBeenCalledWith({
      tipoActor: TipoActorAuditoria.SISTEMA,
      entidad: 'solicitudes_retiro',
      accion: AccionAuditoria.UPDATE,
      datosNuevos: {
        direccionesBorradas: 3,
        plazoDias: DIAS_CONSERVACION_DIRECCION,
      },
    });
  });

  it('si no hay nada vencido, no audita', async () => {
    const { service, auditoria } = montar(0);

    await expect(service.borrarDireccionesVencidas(AHORA)).resolves.toBe(0);
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });
});
