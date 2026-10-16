import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  type FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  AccionAuditoria,
  Auditoria,
  RolAdministrador,
  TipoActorAuditoria,
  UsuarioAdministrador,
} from '../../core';
import {
  ACTOR_SISTEMA,
  ACTOR_VECINOS,
  type FiltroAuditoriaDto,
} from './dto/filtro-auditoria.dto';

/**
 * Fila de auditoría como la consume el panel municipal.
 *
 * El shape lo definió la pantalla (apps/frontend/src/admin/pages/Auditoria.tsx): el
 * backend se adapta a ella y no al revés, porque la pantalla ya estaba hecha
 * cuando se implementó HU-14.
 */
export interface AuditoriaLog {
  id: number;
  usuario: string;
  rol: string;
  accion: string;
  objetoAfectado: string;
  ip: string;
  createdAt: string;
}

/**
 * Tope de filas que devuelve la vista. La tabla guarda todos los registros sin
 * límite; esto solo acota cuántos se muestran (los más recientes primero).
 * 100 se quedaba corto para revisar la actividad de un día de uso.
 */
export const LIMITE_POR_DEFECTO = 1000;
const LIMITE_MAXIMO = 1000;

/**
 * Tope de la exportación. Es más alto que el de la vista porque el archivo se
 * revisa fuera del panel, pero no infinito: con el rango máximo de un año da
 * margen de sobra y evita armar un archivo que tumbe el proceso.
 */
export const LIMITE_EXPORTACION = 50_000;

/** Rango máximo entre `desde` y `hasta`. */
const RANGO_MAXIMO_DIAS = 366;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Funcionario como opción del filtro por usuario. */
export interface ActorAuditoria {
  id: string;
  nombre: string;
  rol: string;
  activo: boolean;
}

const ETIQUETA_ROL: Record<RolAdministrador, string> = {
  [RolAdministrador.ADMIN]: 'Administrador',
  [RolAdministrador.FUNCIONARIO]: 'Funcionario',
};

const ETIQUETA_ENTIDAD: Record<string, string> = {
  solicitudes_retiro: 'Solicitud',
  residuos_catalogo: 'Residuo',
  usuarios_ciudadanos: 'Vecino',
  usuarios_administradores: 'Funcionario',
  auditoria: 'Registro de auditoría',
  notas_solicitud: 'Nota interna',
  lotes_derivacion: 'Lote de derivación',
};

@Injectable()
export class AuditoriaAdminService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
    @InjectRepository(UsuarioAdministrador)
    private readonly administradorRepository: Repository<UsuarioAdministrador>,
  ) {}

  async findAll(
    filtro: FiltroAuditoriaDto = {},
    limite?: number,
  ): Promise<AuditoriaLog[]> {
    const take = Math.min(limite ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);
    return this.buscar(filtro, take);
  }

  /** Mismos filtros que la vista, con el tope de la exportación. */
  exportar(filtro: FiltroAuditoriaDto): Promise<AuditoriaLog[]> {
    return this.buscar(filtro, LIMITE_EXPORTACION);
  }

  /**
   * Funcionarios para el filtro por usuario, también los inactivos: su
   * historial sigue en la auditoría aunque ya no tengan acceso al panel.
   */
  async actores(): Promise<ActorAuditoria[]> {
    const admins = await this.administradorRepository.find({
      order: { activo: 'DESC', nombre: 'ASC', apellido: 'ASC' },
    });

    return admins.map((a) => ({
      id: a.id,
      nombre: `${a.nombre} ${a.apellido}`,
      rol: ETIQUETA_ROL[a.rol] ?? 'Funcionario',
      activo: a.activo,
    }));
  }

  private async buscar(
    filtro: FiltroAuditoriaDto,
    take: number,
  ): Promise<AuditoriaLog[]> {
    const filas = await this.auditoriaRepository.find({
      where: this.condiciones(filtro),
      relations: { actorAdministrador: true },
      order: { fechaAccion: 'DESC', id: 'DESC' },
      take,
    });

    return filas.map((fila) => this.aLog(fila));
  }

  private condiciones(filtro: FiltroAuditoriaDto): FindOptionsWhere<Auditoria> {
    const where: FindOptionsWhere<Auditoria> = {};
    const desde = filtro.desde ? new Date(filtro.desde) : null;
    const hasta = filtro.hasta ? new Date(filtro.hasta) : null;

    if (desde && hasta) {
      if (desde > hasta) {
        throw new BadRequestException('desde no puede ser posterior a hasta');
      }
      if (hasta.getTime() - desde.getTime() > RANGO_MAXIMO_DIAS * DIA_MS) {
        throw new BadRequestException(
          `El rango no puede superar ${RANGO_MAXIMO_DIAS} días`,
        );
      }
      where.fechaAccion = Between(desde, hasta);
    } else if (desde) {
      where.fechaAccion = MoreThanOrEqual(desde);
    } else if (hasta) {
      where.fechaAccion = LessThanOrEqual(hasta);
    }

    if (filtro.actor === ACTOR_VECINOS) {
      where.tipoActor = TipoActorAuditoria.CIUDADANO;
    } else if (filtro.actor === ACTOR_SISTEMA) {
      where.tipoActor = TipoActorAuditoria.SISTEMA;
    } else if (filtro.actor) {
      where.tipoActor = TipoActorAuditoria.ADMINISTRADOR;
      where.actorAdministradorId = filtro.actor;
    }

    return where;
  }

  private aLog(fila: Auditoria): AuditoriaLog {
    return {
      id: fila.id,
      usuario: this.describirUsuario(fila),
      rol: this.describirRol(fila),
      accion: this.describirAccion(fila),
      objetoAfectado: this.describirObjeto(fila),
      ip: fila.ipOrigen ?? '—',
      createdAt: fila.fechaAccion.toISOString(),
    };
  }

  /**
   * Los funcionarios aparecen con nombre y apellido; los vecinos, con una
   * referencia opaca.
   *
   * No es una limitación técnica: `usuarios_ciudadanos` no guarda el nombre a
   * propósito (ver la decisión de seudonimización del RUN). El nombre real solo
   * existe mientras dura la sesión, en `sesiones_ciudadano`.
   *
   * Y es coherente con el propósito del registro: la auditoría vigila a quien
   * tiene poder sobre los datos —los funcionarios— no a quien los entregó. Para
   * seguir el rastro de un vecino puntual está el identificador, que permite
   * correlacionar sin exponer quién es.
   */
  private describirUsuario(fila: Auditoria): string {
    if (fila.tipoActor === TipoActorAuditoria.ADMINISTRADOR) {
      const admin = fila.actorAdministrador;
      return admin ? `${admin.nombre} ${admin.apellido}` : 'Funcionario';
    }

    if (fila.tipoActor === TipoActorAuditoria.CIUDADANO) {
      const referencia = fila.actorCiudadanoId?.slice(0, 8) ?? '';
      return referencia ? `Vecino · ${referencia}` : 'Vecino';
    }

    return 'Sistema';
  }

  private describirRol(fila: Auditoria): string {
    if (fila.tipoActor === TipoActorAuditoria.ADMINISTRADOR) {
      const rol = fila.actorAdministrador?.rol;
      return rol ? (ETIQUETA_ROL[rol] ?? 'Funcionario') : 'Funcionario';
    }

    return fila.tipoActor === TipoActorAuditoria.CIUDADANO
      ? 'Vecino'
      : 'Sistema';
  }

  /**
   * Texto legible de la acción.
   *
   * Cuando el cambio fue de un solo campo, se muestra el valor nuevo — que es
   * lo que un funcionario quiere leer de un vistazo ("Cambio de estado a:
   * asignada"). Si el campo modificado llegara a ser un dato personal, acá solo
   * se nombra el campo, nunca su contenido.
   */
  private describirAccion(fila: Auditoria): string {
    if (fila.accion === AccionAuditoria.LOGIN) return 'Inicio de sesión';
    if (fila.accion === AccionAuditoria.ACCESO) {
      if (fila.entidad === 'lotes_derivacion') {
        return 'Descarga del Excel de derivación';
      }
      const formato = fila.datosNuevos?.exportacion;
      return typeof formato === 'string'
        ? `Exportación del registro de auditoría (${formato.toUpperCase()})`
        : 'Acceso al registro de auditoría';
    }
    if (fila.accion === AccionAuditoria.CREATE) return 'Creación';
    if (fila.accion === AccionAuditoria.DELETE) return 'Eliminación';

    const campos = Object.keys(fila.datosNuevos ?? {});

    if (campos.length === 1) {
      const campo = campos[0];
      const valor = (fila.datosNuevos as Record<string, unknown>)[campo];
      return `Cambio de ${campo} a: ${String(valor)}`;
    }

    return campos.length > 1
      ? `Actualización de ${campos.join(', ')}`
      : 'Actualización';
  }

  private describirObjeto(fila: Auditoria): string {
    const etiqueta = ETIQUETA_ENTIDAD[fila.entidad] ?? fila.entidad;

    return fila.entidadId ? `${etiqueta} #${fila.entidadId}` : etiqueta;
  }
}
