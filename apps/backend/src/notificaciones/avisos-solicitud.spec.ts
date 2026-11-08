import { EstadoSolicitudRetiro, MotivoRevision } from '../core';
import { avisoDeSolicitud } from './avisos-solicitud';

describe('avisoDeSolicitud', () => {
  it('agrega el motivo de la lista al pedir cambios', () => {
    expect(
      avisoDeSolicitud(
        7,
        EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
        MotivoRevision.CATEGORIA_INCORRECTA,
      )?.cuerpo,
    ).toBe('Tu solicitud #7 necesita cambios: Categoría incorrecta');
  });

  it('agrega el motivo al rechazar', () => {
    expect(
      avisoDeSolicitud(
        7,
        EstadoSolicitudRetiro.RECHAZADA,
        MotivoRevision.FUERA_DE_COMUNA,
      )?.cuerpo,
    ).toBe('Tu solicitud #7 fue rechazada: Dirección fuera de la comuna');
  });

  it('omite el motivo «otro», que no dice nada', () => {
    expect(
      avisoDeSolicitud(7, EstadoSolicitudRetiro.RECHAZADA, MotivoRevision.OTRO)
        ?.cuerpo,
    ).toBe('Tu solicitud #7 fue rechazada');
  });

  it('no agrega motivo a otros estados', () => {
    expect(
      avisoDeSolicitud(
        7,
        EstadoSolicitudRetiro.APROBADA,
        MotivoRevision.DUPLICADA,
      )?.cuerpo,
    ).toBe('Tu solicitud #7 fue aprobada');
  });
});
