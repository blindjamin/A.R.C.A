import {
  precioSugerido,
  TipoFotoRetiro,
  type EstadoSolicitudRetiro,
  type MotivoRevision,
  type ObjetoSolicitudRetiro,
  type SolicitudRetiro,
} from '../core';

/** Un objeto de la solicitud, como lo ven el vecino y el panel (HU-01). */
export interface ObjetoPublico {
  residuoCatalogoId: number | null;
  /** Nombre del catálogo o el que escribió el vecino. */
  nombre: string;
  categoria: string | null;
  cantidad: number;
  /** Precio unitario vigente del catálogo; null si está fuera del catálogo. */
  precioUnitario: number | null;
}

export function aObjetoPublico(objeto: ObjetoSolicitudRetiro): ObjetoPublico {
  return {
    residuoCatalogoId: objeto.residuoCatalogoId,
    nombre: objeto.residuoCatalogo?.nombre ?? objeto.nombreOtro ?? 'Objeto',
    categoria: objeto.residuoCatalogo?.categoria ?? null,
    cantidad: objeto.cantidad,
    precioUnitario: objeto.residuoCatalogo?.precio ?? null,
  };
}

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
  /** Solo cuando se cargaron; las solicitudes de antes traen uno. */
  objetos?: ObjetoPublico[];
  /**
   * Suma de precio × cantidad si todo es del catálogo; null si algún objeto
   * está fuera de él y el monto lo presupuesta el funcionario.
   */
  precioSugerido?: number | null;
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
    ...(solicitud.objetos
      ? {
          objetos: solicitud.objetos.map(aObjetoPublico),
          precioSugerido: precioSugerido(solicitud.objetos),
        }
      : {}),
    ...(extras.ultimaRevision !== undefined
      ? { ultimaRevision: extras.ultimaRevision }
      : {}),
  };
}
