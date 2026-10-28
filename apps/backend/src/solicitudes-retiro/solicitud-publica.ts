import {
  TipoFotoRetiro,
  type EstadoSolicitudRetiro,
  type MotivoRevision,
  type SolicitudRetiro,
} from '../core';

/** Lo que la API ciudadana muestra de una revisión (nunca revisor ni checklist). */
export interface RevisionVisible {
  decision: EstadoSolicitudRetiro;
  motivo: MotivoRevision | null;
  comentario: string | null;
  fecha: Date;
}

/**
 * Forma pública de una solicitud: no expone rutas de disco ni la colección
 * interna de fotos. `fotoUrl` apunta al endpoint protegido.
 */
export interface SolicitudPublica {
  id: number;
  usuarioCiudadanoId: string;
  residuoCatalogoId: number | null;
  nombreResiduoOtro?: string | null;
  estado: SolicitudRetiro['estado'];
  estadoPago: SolicitudRetiro['estadoPago'];
  monto: number | null;
  descripcion: string | null;
  direccionRetiro: string | null;
  direccionAnonimizada: string | null;
  latitudCapturada: string | null;
  longitudCapturada: string | null;
  fechaSolicitud: Date;
  fechaRevision: Date | null;
  fechaCierre: Date | null;
  razonRechazo: string | null;
  createdAt: Date;
  updatedAt: Date;
  residuoCatalogo?: SolicitudRetiro['residuoCatalogo'];
  fotoUrl: string | null;
  ultimaRevision?: RevisionVisible | null;
}

export function fotoAntesPath(
  solicitud: Pick<SolicitudRetiro, 'fotos'>,
): string | null {
  const foto = solicitud.fotos?.find(
    (f) => f.tipoFoto === TipoFotoRetiro.ANTES,
  );
  return foto?.rutaArchivo ?? null;
}

/** Endpoint protegido de la foto del vecino, o null si no tiene. */
export function fotoUrlDe(
  solicitud: Pick<SolicitudRetiro, 'id' | 'fotos'>,
): string | null {
  return fotoAntesPath(solicitud)
    ? `/api/solicitudes-retiro/${solicitud.id}/foto`
    : null;
}

export function aSolicitudPublica(
  solicitud: SolicitudRetiro,
  extras: { ultimaRevision?: RevisionVisible | null } = {},
): SolicitudPublica {
  return {
    id: solicitud.id,
    usuarioCiudadanoId: solicitud.usuarioCiudadanoId,
    residuoCatalogoId: solicitud.residuoCatalogoId,
    nombreResiduoOtro: solicitud.nombreResiduoOtro,
    estado: solicitud.estado,
    estadoPago: solicitud.estadoPago,
    monto: solicitud.monto,
    descripcion: solicitud.descripcion,
    direccionRetiro: solicitud.direccionRetiro,
    direccionAnonimizada: solicitud.direccionAnonimizada,
    latitudCapturada: solicitud.latitudCapturada,
    longitudCapturada: solicitud.longitudCapturada,
    fechaSolicitud: solicitud.fechaSolicitud,
    fechaRevision: solicitud.fechaRevision,
    fechaCierre: solicitud.fechaCierre,
    razonRechazo: solicitud.razonRechazo,
    createdAt: solicitud.createdAt,
    updatedAt: solicitud.updatedAt,
    residuoCatalogo: solicitud.residuoCatalogo,
    fotoUrl: fotoUrlDe(solicitud),
    ...(extras.ultimaRevision !== undefined
      ? { ultimaRevision: extras.ultimaRevision }
      : {}),
  };
}
