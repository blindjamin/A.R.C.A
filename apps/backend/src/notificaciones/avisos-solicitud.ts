import { EstadoSolicitudRetiro, MotivoRevision } from '../core';
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

/** Motivos de la lista que el vecino ve. `otro` no dice nada y no se muestra. */
const ETIQUETA_MOTIVO: Partial<Record<MotivoRevision, string>> = {
  [MotivoRevision.FOTO_INSUFICIENTE]: 'La foto no permite ver el residuo',
  [MotivoRevision.CATEGORIA_INCORRECTA]: 'Categoría incorrecta',
  [MotivoRevision.DESCRIPCION_INCOMPLETA]: 'Descripción incompleta',
  [MotivoRevision.DIRECCION_INCOMPLETA]: 'Dirección incompleta',
  [MotivoRevision.FUERA_DE_COMUNA]: 'Dirección fuera de la comuna',
  [MotivoRevision.RESIDUO_NO_ADMITIDO]: 'Residuo no admitido',
  [MotivoRevision.DUPLICADA]: 'Solicitud duplicada',
  [MotivoRevision.CONTENIDO_INAPROPIADO]: 'Contenido inapropiado',
};

const CON_MOTIVO: EstadoSolicitudRetiro[] = [
  EstadoSolicitudRetiro.REQUIERE_MODIFICACION,
  EstadoSolicitudRetiro.RECHAZADA,
];

/**
 * Aviso de la campanita por un cambio de estado de la solicitud. Solo el
 * número, el estado y, al pedir cambios o rechazar, el motivo de la lista:
 * nunca el comentario libre, notas del funcionario, dirección ni contacto.
 */
export function avisoDeSolicitud(
  id: number,
  estado: EstadoSolicitudRetiro,
  motivo?: MotivoRevision | null,
): NuevoAviso | null {
  const texto = TEXTO_POR_ESTADO[estado];
  if (!texto) return null;
  const etiqueta =
    motivo && CON_MOTIVO.includes(estado) ? ETIQUETA_MOTIVO[motivo] : undefined;
  return {
    tipo: 'solicitud',
    titulo: 'Solicitud de retiro',
    cuerpo: etiqueta ? `${texto(id)}: ${etiqueta}` : texto(id),
    url: URL_SOLICITUDES,
  };
}
