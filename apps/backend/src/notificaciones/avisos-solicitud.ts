import { EstadoSolicitudRetiro } from '../core';
import type { NuevoAviso } from './notificaciones.service';

/**
 * Ruta del frontend ciudadano para una solicitud: hoy no hay pantalla de
 * detalle, así que lleva a la lista.
 */
export const URL_SOLICITUDES = '/mis-solicitudes';

const TEXTO_POR_ESTADO: Partial<
  Record<EstadoSolicitudRetiro, (id: number) => string>
> = {
  [EstadoSolicitudRetiro.EN_REVISION]: (id) =>
    `Tu solicitud #${id} volvió a revisión`,
  [EstadoSolicitudRetiro.APROBADA]: (id) => `Tu solicitud #${id} fue aprobada`,
  [EstadoSolicitudRetiro.REQUIERE_MODIFICACION]: (id) =>
    `Tu solicitud #${id} necesita cambios`,
  [EstadoSolicitudRetiro.RECHAZADA]: (id) =>
    `Tu solicitud #${id} fue rechazada`,
  [EstadoSolicitudRetiro.DERIVADA]: (id) =>
    `Tu solicitud #${id} fue derivada para el retiro`,
  [EstadoSolicitudRetiro.RETIRADA]: (id) =>
    `Retiramos tu residuo (solicitud #${id})`,
  [EstadoSolicitudRetiro.NO_REALIZADA]: (id) =>
    `No pudimos hacer el retiro de la solicitud #${id}`,
  [EstadoSolicitudRetiro.CANCELADA]: (id) =>
    `Tu solicitud #${id} fue cancelada`,
};

/**
 * Aviso de la campanita por un cambio de estado de la solicitud. Solo el
 * número y el estado: nunca notas del funcionario, dirección ni contacto.
 */
export function avisoDeSolicitud(
  id: number,
  estado: EstadoSolicitudRetiro,
): NuevoAviso | null {
  const texto = TEXTO_POR_ESTADO[estado];
  if (!texto) return null;
  return {
    tipo: 'solicitud',
    titulo: 'Solicitud de retiro',
    cuerpo: texto(id),
    url: URL_SOLICITUDES,
  };
}
