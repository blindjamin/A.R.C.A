import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccionAuditoria,
  Auditoria,
  RolAdministrador,
  TipoActorAuditoria,
} from '@arca/core';

/**
 * Fila de auditoría como la consume el panel municipal.
 *
 * El shape lo definió la pantalla (apps/admin-web/src/pages/Auditoria.tsx): el
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

/** Tope por defecto y máximo de filas devueltas: la tabla crece sin límite. */
const LIMITE_POR_DEFECTO = 100;
const LIMITE_MAXIMO = 500;

const ETIQUETA_ROL: Record<RolAdministrador, string> = {
  [RolAdministrador.ADMIN]: 'Administrador',
  [RolAdministrador.OPERADOR]: 'Operador',
  [RolAdministrador.PATROCINADOR]: 'Patrocinador',
};

const ETIQUETA_ENTIDAD: Record<string, string> = {
  solicitudes_retiro: 'Solicitud',
  residuos_catalogo: 'Residuo',
  usuarios_ciudadanos: 'Vecino',
  usuarios_administradores: 'Funcionario',
  auditoria: 'Registro de auditoría',
};

@Injectable()
export class AuditoriaAdminService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepository: Repository<Auditoria>,
  ) {}

  async findAll(limite?: number): Promise<AuditoriaLog[]> {
    const take = Math.min(limite ?? LIMITE_POR_DEFECTO, LIMITE_MAXIMO);

    const filas = await this.auditoriaRepository.find({
      relations: { actorAdministrador: true },
      order: { fechaAccion: 'DESC', id: 'DESC' },
      take,
    });

    return filas.map((fila) => this.aLog(fila));
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
      return 'Acceso al registro de auditoría';
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
