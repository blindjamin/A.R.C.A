import type { Repository } from 'typeorm';
import {
  AccionAuditoria,
  type AuditoriaService,
  type Notificacion,
  TipoActorAuditoria,
} from '../core';
import {
  ConservacionAvisosService,
  DIAS_CONSERVACION_AVISOS,
} from './conservacion-avisos.service';

describe('ConservacionAvisosService', () => {
  const AHORA = new Date('2026-10-24T12:00:00.000Z');

  function montar(borrados: number) {
    const repo = {
      delete: jest.fn(() => Promise.resolve({ affected: borrados })),
    };
    const auditoria = { registrar: jest.fn(() => Promise.resolve()) };
    const service = new ConservacionAvisosService(
      repo as unknown as Repository<Notificacion>,
      auditoria as unknown as AuditoriaService,
    );
    return { service, repo, auditoria };
  }

  it('borra los avisos de más de 90 días y deja constancia SISTEMA con el conteo', async () => {
    const { service, repo, auditoria } = montar(5);

    await expect(service.borrarAvisosVencidos(AHORA)).resolves.toBe(5);

    const [criterio] = repo.delete.mock.calls[0] as unknown as [
      { createdAt: { type: string; value: Date } },
    ];
    expect(criterio.createdAt.type).toBe('lessThan');
    expect(criterio.createdAt.value.toISOString()).toBe(
      new Date(
        AHORA.getTime() - DIAS_CONSERVACION_AVISOS * 24 * 60 * 60 * 1000,
      ).toISOString(),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith({
      tipoActor: TipoActorAuditoria.SISTEMA,
      entidad: 'notificaciones',
      accion: AccionAuditoria.DELETE,
      datosNuevos: { avisos: 5, plazoDias: DIAS_CONSERVACION_AVISOS },
    });
  });

  it('sin nada que borrar no audita', async () => {
    const { service, auditoria } = montar(0);

    await service.borrarAvisosVencidos(AHORA);

    expect(auditoria.registrar).not.toHaveBeenCalled();
  });
});
