import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not } from 'typeorm';
import {
  AccionAuditoria,
  aplicarTransicion,
  ArticuloMarketplace,
  AuditoriaService,
  type AuthUser,
  ContactoCiudadano,
  ESPERA_VUELTA_MS,
  EstadoArticuloMarketplace,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  ESTADOS_CANCELABLES_POR_VECINO,
  ESTADOS_FINALES,
  type OrigenPeticion,
  SesionCiudadano,
  SolicitudRetiro,
  SuscripcionPush,
  TipoActorAuditoria,
  UsuarioCiudadano,
} from '../core';

/** Lo que el vecino ve antes de confirmar la baja. */
export interface EstadoBaja {
  puedeDarseDeBaja: boolean;
  /** Solicitudes pagadas o en retiro: impiden la baja hasta que se cierren. */
  solicitudesQueBloquean: number[];
  /** Intercambios reservados (como quien publica o quien recibe): hay que entregarlos o liberarlos. */
  articulosQueBloquean: number[];
  /** Solicitudes abiertas sin pagar que la baja cancela. */
  solicitudesQueSeCancelan: number[];
  horasParaVolver: number;
}

export interface BajaRealizada {
  fechaBaja: string;
  puedeVolverDesde: string;
  solicitudesCanceladas: number[];
}

const MOTIVO_CANCELACION = 'Cancelada al darse de baja';

/** Abierta, sin pagar y en un estado que el vecino puede cancelar. */
function seCancelaConLaBaja(s: SolicitudRetiro): boolean {
  return (
    ESTADOS_CANCELABLES_POR_VECINO.includes(s.estado) &&
    s.estadoPago !== EstadoPagoSolicitud.PAGADO
  );
}

/**
 * Darse de baja (HU-38, decisión 011).
 *
 * La baja desactiva la cuenta y no borra el historial: si el vecino vuelve
 * pasadas 48 h, sus solicitudes y publicaciones reaparecen. Lo que sí borra es
 * el contacto (decisión 016) y las suscripciones push, que existen solo para
 * hablarle a una cuenta activa. Borrar todos los datos es la supresión de la
 * Ley 21.719, que va por solicitud a la Municipalidad.
 */
@Injectable()
export class BajaService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /** Reloj reemplazable en las pruebas. */
  ahora = (): Date => new Date();

  estado(user: AuthUser): Promise<EstadoBaja> {
    return this.revisar(this.dataSource.manager, user);
  }

  async darseDeBaja(
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<BajaRealizada> {
    if (user.esAdministrador) {
      // Su cuenta de vecino es la que le da acceso al panel: lo da de baja TI
      // quitándole el rol (DEPLOY_CPANEL §7), no un botón de la app.
      throw new ForbiddenException(
        'Un funcionario no puede darse de baja desde la aplicación.',
      );
    }
    const ahora = this.ahora();

    const canceladas = await this.dataSource.transaction(async (em) => {
      const revision = await this.revisar(em, user);
      if (!revision.puedeDarseDeBaja) {
        throw new ConflictException({
          message:
            'Antes de darte de baja tienes que cerrar tus solicitudes pagadas y tus intercambios reservados.',
          solicitudesQueBloquean: revision.solicitudesQueBloquean,
          articulosQueBloquean: revision.articulosQueBloquean,
        });
      }

      const solicitudes = await em.find(SolicitudRetiro, {
        where: { id: In(revision.solicitudesQueSeCancelan) },
      });
      for (const solicitud of solicitudes) {
        aplicarTransicion(solicitud, EstadoSolicitudRetiro.CANCELADA, {
          actor: 'vecino',
          ahora,
        });
        solicitud.razonRechazo ??= MOTIVO_CANCELACION;
        // Una cancelada no se reabre: la dirección de retiro se borra ya (decisión 016).
        solicitud.direccionRetiro = null;
        solicitud.direccionAnonimizada = null;
      }
      await em.save(SolicitudRetiro, solicitudes);

      await em.delete(ContactoCiudadano, {
        usuarioCiudadanoId: user.ciudadanoId,
      });
      await em.delete(SuscripcionPush, {
        usuarioCiudadanoId: user.ciudadanoId,
      });
      await em.update(
        UsuarioCiudadano,
        { id: user.ciudadanoId },
        { activo: false, fechaBaja: ahora },
      );
      await em.update(
        SesionCiudadano,
        { usuarioCiudadanoId: user.ciudadanoId, activa: true },
        { activa: false },
      );

      return solicitudes.map((s) => s.id);
    });

    // Fuera de la transacción, como el resto del código: un fallo al auditar no
    // deshace la baja. Ninguna fila lleva el contacto que se borró.
    for (const id of canceladas) {
      await this.auditoriaService.registrar({
        tipoActor: TipoActorAuditoria.CIUDADANO,
        actor: user,
        entidad: 'solicitudes_retiro',
        entidadId: id,
        accion: AccionAuditoria.UPDATE,
        datosNuevos: {
          estado: EstadoSolicitudRetiro.CANCELADA,
          motivo: 'baja',
        },
        origen,
      });
    }
    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: user,
      entidad: 'usuarios_ciudadanos',
      accion: AccionAuditoria.UPDATE,
      datosAnteriores: { activo: true },
      datosNuevos: { activo: false, motivo: 'baja_voluntaria' },
      origen,
    });

    return {
      fechaBaja: ahora.toISOString(),
      puedeVolverDesde: new Date(
        ahora.getTime() + ESPERA_VUELTA_MS,
      ).toISOString(),
      solicitudesCanceladas: canceladas,
    };
  }

  private async revisar(
    em: EntityManager,
    user: AuthUser,
  ): Promise<EstadoBaja> {
    const abiertas = await em.find(SolicitudRetiro, {
      where: {
        usuarioCiudadanoId: user.ciudadanoId,
        estado: Not(In([...ESTADOS_FINALES])),
      },
      select: { id: true, estado: true, estadoPago: true },
      order: { id: 'ASC' },
    });
    const reservados = await em.find(ArticuloMarketplace, {
      where: [
        {
          usuarioPublicadorId: user.ciudadanoId,
          estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        },
        {
          usuarioCompradorId: user.ciudadanoId,
          estado: EstadoArticuloMarketplace.EN_NEGOCIACION,
        },
      ],
      select: { id: true },
      order: { id: 'ASC' },
    });

    const solicitudesQueBloquean = abiertas
      .filter((s) => !seCancelaConLaBaja(s))
      .map((s) => s.id);
    const articulosQueBloquean = reservados.map((a) => a.id);

    return {
      puedeDarseDeBaja:
        solicitudesQueBloquean.length === 0 &&
        articulosQueBloquean.length === 0,
      solicitudesQueBloquean,
      articulosQueBloquean,
      solicitudesQueSeCancelan: abiertas
        .filter(seCancelaConLaBaja)
        .map((s) => s.id),
      horasParaVolver: ESPERA_VUELTA_MS / (60 * 60 * 1000),
    };
  }
}
