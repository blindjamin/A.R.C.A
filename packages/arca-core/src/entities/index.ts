import { RolAdministrador } from './rol-administrador.enum';
import { SesionAdministrador } from './sesion-administrador.entity';
import { SesionCiudadano } from './sesion-ciudadano.entity';
import { UsuarioAdministrador } from './usuario-administrador.entity';
import { UsuarioCiudadano } from './usuario-ciudadano.entity';
import { ResiduoCatalogo } from './residuo-catalogo.entity';
import { EstadoSolicitudRetiro } from './estado-solicitud-retiro.enum';
import { SolicitudRetiro } from './solicitud-retiro.entity';
import { AccionAuditoria } from './accion-auditoria.enum';
import { TipoActorAuditoria } from './tipo-actor-auditoria.enum';
import { Auditoria } from './auditoria.entity';

export { RolAdministrador } from './rol-administrador.enum';
export { UsuarioCiudadano } from './usuario-ciudadano.entity';
export { SesionCiudadano } from './sesion-ciudadano.entity';
export { UsuarioAdministrador } from './usuario-administrador.entity';
export { SesionAdministrador } from './sesion-administrador.entity';
export { ResiduoCatalogo } from './residuo-catalogo.entity';
export { EstadoSolicitudRetiro } from './estado-solicitud-retiro.enum';
export { SolicitudRetiro } from './solicitud-retiro.entity';
export { AccionAuditoria } from './accion-auditoria.enum';
export { TipoActorAuditoria } from './tipo-actor-auditoria.enum';
export { Auditoria } from './auditoria.entity';

// Usado por apps/backend/src/database/data-source.ts: el glob __dirname +
// '/../**/*.entity' que usaba antes de la migración no encuentra las
// entidades una vez que viven fuera de apps/backend/src. Cualquier entidad
// nueva se agrega acá también, o las migraciones dejan de verla.
export const ENTIDADES = [
  UsuarioCiudadano,
  SesionCiudadano,
  UsuarioAdministrador,
  SesionAdministrador,
  ResiduoCatalogo,
  SolicitudRetiro,
  Auditoria,
];
