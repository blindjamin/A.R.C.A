import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from '../entities/auditoria.entity';
import { TipoActorAuditoria } from '../entities/tipo-actor-auditoria.enum';
import { AccionAuditable } from './auditoria.types';

/**
 * Escribe el registro auditable de acciones críticas (HU-14).
 *
 * Responde a la observación 6 de la Municipalidad (24-06-2026): "debe dejar
 * registro de quién realizó cada cambio".
 *
 * Vive en @arca/core porque las acciones auditables ocurren en los dos
 * backends: crear y cancelar en la API ciudadana, cambiar estado y asignar en
 * la municipal.
 */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  /**
   * Registra una acción.
   *
   * **No lanza nunca.** Si la escritura falla, se deja constancia en el log de
   * la aplicación y la operación de negocio sigue su curso.
   *
   * Es una decisión deliberada y discutible, así que conviene dejarla explícita:
   * si auditar fallara la operación, un problema al escribir la auditoría
   * impediría que un vecino cancele su retiro. Se prioriza que el servicio
   * municipal siga funcionando por sobre la completitud del registro, y a
   * cambio el fallo queda visible en los logs para poder detectarlo.
   *
   * Si más adelante el municipio exige que ninguna acción crítica quede sin
   * registrar, este es el punto exacto donde se invierte el criterio.
   */
  async registrar(accion: AccionAuditable): Promise<void> {
    try {
      const fila = this.auditoriaRepository.create({
        ...this.resolverActor(accion),
        entidad: accion.entidad,
        entidadId: accion.entidadId ?? null,
        accion: accion.accion,
        datosAnteriores: accion.datosAnteriores ?? null,
        datosNuevos: accion.datosNuevos ?? null,
        ipOrigen: accion.origen?.ip ?? null,
        userAgent: accion.origen?.userAgent ?? null,
        fechaAccion: new Date(),
      });

      await this.auditoriaRepository.save(fila);
    } catch (error) {
      // Se registra qué acción no pudo auditarse, sin volcar `datosAnteriores`
      // ni `datosNuevos`: podrían contener el valor de un campo que en el
      // futuro sea dato personal, y los logs de la aplicación no tienen el
      // mismo control de acceso que la tabla de auditoría.
      this.logger.error(
        `No se pudo auditar ${accion.accion} sobre ${accion.entidad}` +
          `${accion.entidadId ? ` #${accion.entidadId}` : ''}: ` +
          (error instanceof Error ? error.message : 'error desconocido'),
      );
    }
  }

  /**
   * Decide qué columna de actor se llena.
   *
   * La misma persona puede tener perfil ciudadano y municipal a la vez (ver
   * `usuarios_administradores.usuario_ciudadano_id`). Lo que se registra no es
   * quién es, sino **con qué perfil actuó**, y eso lo determina el backend
   * donde ocurrió la acción, no los roles que tenga.
   *
   * Se llena una sola de las dos columnas, como pide la nota de la tabla en
   * ARCA_database_schema.dbml.
   */
  private resolverActor(accion: AccionAuditable): {
    tipoActor: TipoActorAuditoria;
    actorCiudadanoId: string | null;
    actorAdministradorId: string | null;
  } {
    if (accion.tipoActor === TipoActorAuditoria.SISTEMA || !accion.actor) {
      return {
        tipoActor: TipoActorAuditoria.SISTEMA,
        actorCiudadanoId: null,
        actorAdministradorId: null,
      };
    }

    if (accion.tipoActor === TipoActorAuditoria.ADMINISTRADOR) {
      // Si el backend municipal pide registrar como administrador pero la
      // identidad no tiene extensión de administrador, algo se conectó mal:
      // guardarlo como ciudadano falsearía el registro. Se degrada a sistema y
      // queda el aviso, porque una fila de auditoría con el actor equivocado es
      // peor que una sin actor.
      if (!accion.actor.administradorId) {
        this.logger.warn(
          `Acción marcada como administrador sin administradorId ` +
            `(ciudadano ${accion.actor.ciudadanoId}); se registra como sistema.`,
        );

        return {
          tipoActor: TipoActorAuditoria.SISTEMA,
          actorCiudadanoId: null,
          actorAdministradorId: null,
        };
      }

      return {
        tipoActor: TipoActorAuditoria.ADMINISTRADOR,
        actorCiudadanoId: null,
        actorAdministradorId: accion.actor.administradorId,
      };
    }

    return {
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actorCiudadanoId: accion.actor.ciudadanoId,
      actorAdministradorId: null,
    };
  }
}
