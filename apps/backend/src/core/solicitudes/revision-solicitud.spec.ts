import { EstadoSolicitudRetiro } from '../entities/estado-solicitud-retiro.enum';
import { MotivoRevision } from '../entities/motivo-revision.enum';
import {
  type EntradaRevision,
  ITEMS_CHECKLIST_APROBACION,
  MOTIVOS_POR_DECISION,
  RevisionInvalidaError,
  validarRevision,
} from './revision-solicitud';

const { APROBADA, REQUIERE_MODIFICACION, RECHAZADA } = EstadoSolicitudRetiro;

const checklistCompleto = () =>
  Object.fromEntries(ITEMS_CHECKLIST_APROBACION.map((i) => [i, true]));

describe('validarRevision', () => {
  it('aprobar con la lista de verificación completa es válido', () => {
    expect(() =>
      validarRevision({ decision: APROBADA, checklist: checklistCompleto() }),
    ).not.toThrow();
  });

  it('aprobar sin lista de verificación es inválido', () => {
    expect(() => validarRevision({ decision: APROBADA })).toThrow(
      RevisionInvalidaError,
    );
  });

  it('aprobar con un ítem sin marcar es inválido', () => {
    const checklist = { ...checklistCompleto(), foto_clara: false };
    expect(() => validarRevision({ decision: APROBADA, checklist })).toThrow(
      'foto_clara',
    );
  });

  it('aprobar con un ítem faltante es inválido', () => {
    const checklist: Record<string, boolean> = checklistCompleto();
    delete checklist.no_duplicada;
    expect(() => validarRevision({ decision: APROBADA, checklist })).toThrow(
      'no_duplicada',
    );
  });

  it('aprobar no admite motivo', () => {
    expect(() =>
      validarRevision({
        decision: APROBADA,
        checklist: checklistCompleto(),
        motivo: MotivoRevision.OTRO,
      }),
    ).toThrow(RevisionInvalidaError);
  });

  it.each([REQUIERE_MODIFICACION, RECHAZADA])('%s exige motivo', (decision) => {
    expect(() =>
      validarRevision({ decision, comentario: 'Falta información' }),
    ).toThrow('motivo');
  });

  it('pedir modificación exige comentario para que el vecino sepa qué corregir', () => {
    expect(() =>
      validarRevision({
        decision: REQUIERE_MODIFICACION,
        motivo: MotivoRevision.FOTO_INSUFICIENTE,
        comentario: '   ',
      }),
    ).toThrow('comentario');
  });

  it('rechazar con motivo de la lista no exige comentario', () => {
    expect(() =>
      validarRevision({
        decision: RECHAZADA,
        motivo: MotivoRevision.FUERA_DE_COMUNA,
      }),
    ).not.toThrow();
  });

  it('rechazar con motivo "otro" exige comentario', () => {
    expect(() =>
      validarRevision({ decision: RECHAZADA, motivo: MotivoRevision.OTRO }),
    ).toThrow('comentario');
  });

  it('un motivo que no corresponde a la decisión es inválido', () => {
    const entrada: EntradaRevision = {
      decision: RECHAZADA,
      motivo: MotivoRevision.FOTO_INSUFICIENTE,
      comentario: 'x',
    };
    expect(() => validarRevision(entrada)).toThrow('no corresponde');
  });

  it('cada decisión que admite motivos incluye "otro"', () => {
    expect(MOTIVOS_POR_DECISION[REQUIERE_MODIFICACION]).toContain(
      MotivoRevision.OTRO,
    );
    expect(MOTIVOS_POR_DECISION[RECHAZADA]).toContain(MotivoRevision.OTRO);
  });

  it('una decisión que no es de revisión es inválida', () => {
    expect(() =>
      validarRevision({
        decision: EstadoSolicitudRetiro.DERIVADA as unknown as typeof APROBADA,
      }),
    ).toThrow(RevisionInvalidaError);
  });
});
