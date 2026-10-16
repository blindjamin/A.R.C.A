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
  residuoCatalogoId: number;
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

export function fotoAntesPath(solicitud: SolicitudRetiro): string | null {
  const foto = solicitud.fotos?.find(
    (f) => f.tipoFoto === TipoFotoRetiro.ANTES,
  );
  return foto?.rutaArchivo ?? null;
}

export function aSolicitudPublica(
  solicitud: SolicitudRetiro,
  extras: { ultimaRevision?: RevisionVisible | null } = {},
): SolicitudPublica {
  const tieneFoto = Boolean(fotoAntesPath(solicitud));

  return {
    id: solicitud.id,
    usuarioCiudadanoId: solicitud.usuarioCiudadanoId,
    residuoCatalogoId: solicitud.residuoCatalogoId,
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
    fotoUrl: tieneFoto ? `/api/solicitudes-retiro/${solicitud.id}/foto` : null,
    ...(extras.ultimaRevision !== undefined
      ? { ultimaRevision: extras.ultimaRevision }
      : {}),
  };
}
