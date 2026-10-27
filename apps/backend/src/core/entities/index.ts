import { SesionAdministrador } from './sesion-administrador.entity';
import { SesionCiudadano } from './sesion-ciudadano.entity';
import { UsuarioAdministrador } from './usuario-administrador.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';
import { ContactoCiudadano } from './contacto-ciudadano.entity';
import { ResiduoCatalogo } from './residuo-catalogo.entity';
import { SolicitudRetiro } from './solicitud-retiro.entity';
import { FotoRetiro } from './foto-retiro.entity';
import { Auditoria } from './auditoria.entity';
import { RevisionSolicitud } from './revision-solicitud.entity';
import { NotaSolicitud } from './nota-solicitud.entity';
import { LoteDerivacion } from './lote-derivacion.entity';
import { ArticuloMarketplace } from './articulo-marketplace.entity';
import { Calificacion } from './calificacion.entity';
import { MensajeMarketplace } from './mensaje-marketplace.entity';
import { InteresadoMarketplace } from './interesado-marketplace.entity';
import { TransaccionCircularCredits } from './transaccion-circular-credits.entity';
import { SuscripcionPush } from './suscripcion-push.entity';

export { RolAdministrador } from './rol-administrador.enum';
export { UsuarioCiudadano } from './usuario-ciudadano.entity';
export { ContactoCiudadano } from './contacto-ciudadano.entity';
export { SesionCiudadano } from './sesion-ciudadano.entity';
export { UsuarioAdministrador } from './usuario-administrador.entity';
export { SesionAdministrador } from './sesion-administrador.entity';
export { ResiduoCatalogo } from './residuo-catalogo.entity';
export { EstadoSolicitudRetiro } from './estado-solicitud-retiro.enum';
export { EstadoPagoSolicitud } from './estado-pago-solicitud.enum';
export { SolicitudRetiro } from './solicitud-retiro.entity';
export { TipoFotoRetiro } from './tipo-foto-retiro.enum';
export { FotoRetiro } from './foto-retiro.entity';
export { AccionAuditoria } from './accion-auditoria.enum';
export { TipoActorAuditoria } from './tipo-actor-auditoria.enum';
export { Auditoria } from './auditoria.entity';
export { MotivoRevision } from './motivo-revision.enum';
export { RevisionSolicitud } from './revision-solicitud.entity';
export { NotaSolicitud } from './nota-solicitud.entity';
export { LoteDerivacion } from './lote-derivacion.entity';
export { TipoArticuloMarketplace } from './tipo-articulo-marketplace.enum';
export { EstadoArticuloMarketplace } from './estado-articulo-marketplace.enum';
export { ArticuloMarketplace } from './articulo-marketplace.entity';
export { Calificacion } from './calificacion.entity';
export { MensajeMarketplace } from './mensaje-marketplace.entity';
export { InteresadoMarketplace } from './interesado-marketplace.entity';
export { TipoMovimientoCreditos } from './tipo-movimiento-creditos.enum';
export { OrigenMovimientoCreditos } from './origen-movimiento-creditos.enum';
export { TransaccionCircularCredits } from './transaccion-circular-credits.entity';
export { SuscripcionPush } from './suscripcion-push.entity';

// Usado por apps/backend/src/database/data-source.ts: el glob __dirname +
// '/../**/*.entity' que usaba antes de la migración no encuentra las
// entidades una vez que viven fuera de apps/backend/src. Cualquier entidad
// nueva se agrega acá también, o las migraciones dejan de verla.
export const ENTIDADES = [
  UsuarioCiudadano,
  ContactoCiudadano,
  SesionCiudadano,
  UsuarioAdministrador,
  SesionAdministrador,
  ResiduoCatalogo,
  SolicitudRetiro,
  FotoRetiro,
  Auditoria,
  RevisionSolicitud,
  NotaSolicitud,
  LoteDerivacion,
  ArticuloMarketplace,
  Calificacion,
  MensajeMarketplace,
  InteresadoMarketplace,
  TransaccionCircularCredits,
  SuscripcionPush,
];
