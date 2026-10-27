import type { Repository } from 'typeorm';
import {
  AccionAuditoria,
  type AuditoriaService,
  EstadoArticuloMarketplace,
  type InteresadoMarketplace,
  type MensajeMarketplace,
  TipoActorAuditoria,
} from '../../core';
import {
  ConservacionChatService,
  DIAS_CONSERVACION_CHAT,
} from './conservacion-chat.service';

describe('ConservacionChatService', () => {
  const AHORA = new Date('2026-10-24T12:00:00.000Z');

  interface QbBorrado {
    delete: jest.Mock<QbBorrado, []>;
    from: jest.Mock<QbBorrado, [unknown]>;
    where: jest.Mock<QbBorrado, [string, unknown]>;
    execute: jest.Mock<Promise<{ affected: number }>, []>;
  }

  function repoFalso(afectadas: number) {
    const qb = {} as QbBorrado;
    qb.delete = jest.fn(() => qb);
    qb.from = jest.fn(() => qb);
    qb.where = jest.fn(() => qb);
    qb.execute = jest.fn(() => Promise.resolve({ affected: afectadas }));
    return { qb, repo: { createQueryBuilder: jest.fn(() => qb) } };
  }

  function montar(mensajes: number, intereses: number) {
    const m = repoFalso(mensajes);
    const i = repoFalso(intereses);
    const auditoria = { registrar: jest.fn(() => Promise.resolve()) };
    const service = new ConservacionChatService(
      m.repo as unknown as Repository<MensajeMarketplace>,
      i.repo as unknown as Repository<InteresadoMarketplace>,
      auditoria as unknown as AuditoriaService,
    );
    return { service, m, i, auditoria };
  }

  it('borra solo lo vencido: cerrados y disponibles vencidos hace más del plazo', async () => {
    const { service, m, i } = montar(7, 3);

    await expect(service.borrarChatsVencidos(AHORA)).resolves.toEqual({
      mensajes: 7,
      intereses: 3,
    });

    const limite = new Date(
      AHORA.getTime() - DIAS_CONSERVACION_CHAT * 24 * 60 * 60 * 1000,
    );
    for (const { qb } of [m, i]) {
      const [condicion, parametros] = qb.where.mock.calls[0];
      expect(condicion).toContain('estado IN (:...cerrados) AND updated_at <');
      expect(condicion).toContain('fecha_expiracion < :limite');
      expect(parametros).toEqual({
        cerrados: [
          EstadoArticuloMarketplace.COMPLETADO,
          EstadoArticuloMarketplace.RETIRADO,
        ],
        disponible: EstadoArticuloMarketplace.DISPONIBLE,
        limite,
      });
    }
  });

  it('deja constancia SISTEMA con los conteos y sin ids ni texto', async () => {
    const { service, auditoria } = montar(7, 3);

    await service.borrarChatsVencidos(AHORA);

    expect(auditoria.registrar).toHaveBeenCalledWith({
      tipoActor: TipoActorAuditoria.SISTEMA,
      entidad: 'mensajes_marketplace',
      accion: AccionAuditoria.DELETE,
      datosNuevos: {
        mensajes: 7,
        intereses: 3,
        plazoDias: DIAS_CONSERVACION_CHAT,
      },
    });
  });

  it('sin nada que borrar no audita', async () => {
    const { service, auditoria } = montar(0, 0);

    await service.borrarChatsVencidos(AHORA);

    expect(auditoria.registrar).not.toHaveBeenCalled();
  });
});
