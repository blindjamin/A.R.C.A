import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  AccionAuditoria,
  AuditoriaService,
  type AuthUser,
  BloqueoCiudadano,
  Denuncia,
  type OrigenPeticion,
  SesionCiudadano,
  TipoActorAuditoria,
  UsuarioAdministrador,
  UsuarioCiudadano,
} from '../core';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { puedeBloquear } from './permisos-bloqueo';

export interface EstadoBloqueo {
  bloqueado: boolean;
  motivo: string | null;
  fecha: Date | null;
  /** Si quien consulta puede bloquear o desbloquear (ROLES_BLOQUEO). */
  puedeBloquear: boolean;
}

/**
 * Bloqueo de vecinos en el Marketplace (HU-18). Solo dentro de A.R.C.A.: no
 * toca ClaveÚnica ni las solicitudes de retiro.
 */
@Injectable()
export class BloqueosService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** El bloqueo vigente del vecino: la última fila, si es un `bloqueo`. */
  async vigente(
    ciudadanoId: string,
    em: EntityManager = this.dataSource.manager,
  ): Promise<BloqueoCiudadano | null> {
    const ultima = await em.findOne(BloqueoCiudadano, {
      where: { usuarioCiudadanoId: ciudadanoId },
      order: { id: 'DESC' },
    });
    return ultima?.accion === 'bloqueo' ? ultima : null;
  }

  async estadoPorDenuncia(
    denunciaId: number,
    user: AuthUser,
  ): Promise<EstadoBloqueo> {
    const em = this.dataSource.manager;
    const denuncia = await this.denunciaPara(em, denunciaId, user);
    const b = await this.vigente(denuncia.usuarioDenunciadoId, em);
    return {
      bloqueado: !!b,
      motivo: b?.motivo ?? null,
      fecha: b?.createdAt ?? null,
      puedeBloquear: puedeBloquear(user),
    };
  }

  bloquear(
    denunciaId: number,
    motivo: string,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<EstadoBloqueo> {
    return this.cambiar('bloqueo', denunciaId, motivo, user, origen);
  }

  desbloquear(
    denunciaId: number,
    motivo: string,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<EstadoBloqueo> {
    return this.cambiar('desbloqueo', denunciaId, motivo, user, origen);
  }

  private async cambiar(
    accion: 'bloqueo' | 'desbloqueo',
    denunciaId: number,
    motivo: string,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<EstadoBloqueo> {
    // Defensa en profundidad: el controlador ya filtra con ROLES_BLOQUEO.
    if (!puedeBloquear(user) || !user.administradorId) {
      throw new ForbiddenException('Solo un administrador puede bloquear');
    }
    const administradorId = user.administradorId;

    // Con la fila del vecino bloqueada: dos administradores no pueden
    // bloquearlo (o desbloquearlo) a la vez.
    const { fila, vecinoId } = await this.dataSource.transaction(async (em) => {
      const denuncia = await this.denunciaPara(em, denunciaId, user);
      const vecinoId = denuncia.usuarioDenunciadoId;
      await em.findOne(UsuarioCiudadano, {
        where: { id: vecinoId },
        lock: { mode: 'pessimistic_write' },
      });

      if (accion === 'bloqueo') {
        const esFuncionario = await em.findOne(UsuarioAdministrador, {
          where: { usuarioCiudadanoId: vecinoId },
          select: { id: true },
        });
        if (esFuncionario) {
          throw new ConflictException(
            'A un funcionario no se le bloquea: TI le quita el rol',
          );
        }
      }
      const yaBloqueado = !!(await this.vigente(vecinoId, em));
      if (accion === 'bloqueo' && yaBloqueado) {
        throw new ConflictException('El vecino ya está bloqueado');
      }
      if (accion === 'desbloqueo' && !yaBloqueado) {
        throw new ConflictException('El vecino no está bloqueado');
      }

      const fila = await em.save(
        em.create(BloqueoCiudadano, {
          usuarioCiudadanoId: vecinoId,
          accion,
          motivo,
          administradorId,
          denunciaId,
        }),
      );
      if (accion === 'bloqueo') {
        await em.update(
          SesionCiudadano,
          { usuarioCiudadanoId: vecinoId, activa: true },
          { activa: false },
        );
      }
      return { fila, vecinoId };
    });

    // Fuera de la transacción, como el resto: un fallo al auditar no la deshace.
    // Sin el motivo ni el id del vecino: el motivo lo ve él, no la auditoría.
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'bloqueos_ciudadano',
      entidadId: fila.id,
      accion: AccionAuditoria.CREATE,
      datosNuevos: { accion, denunciaId },
      origen,
    });
    // Genérico: el motivo se ve en la pantalla del Marketplace, no en el aviso.
    void this.notificaciones.notificar(vecinoId, {
      tipo: 'bloqueo',
      titulo: 'Marketplace',
      cuerpo:
        accion === 'bloqueo'
          ? 'Tu cuenta fue bloqueada en el Marketplace'
          : 'Tu cuenta ya puede volver a usar el Marketplace',
      url: '/marketplace',
    });

    return this.estadoPorDenuncia(denunciaId, user);
  }

  /** Misma regla que las denuncias: el denunciado y lo inexistente son 404. */
  private async denunciaPara(
    em: EntityManager,
    denunciaId: number,
    user: AuthUser,
  ): Promise<Denuncia> {
    const denuncia = await em.findOne(Denuncia, { where: { id: denunciaId } });
    if (!denuncia || denuncia.usuarioDenunciadoId === user.ciudadanoId) {
      throw new NotFoundException(`Denuncia ${denunciaId} no encontrada`);
    }
    if (denuncia.usuarioDenuncianteId === user.ciudadanoId) {
      throw new ForbiddenException(
        'No puedes bloquear por una denuncia que hiciste tú',
      );
    }
    return denuncia;
  }
}
