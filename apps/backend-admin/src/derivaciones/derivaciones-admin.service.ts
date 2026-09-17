import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AccionAuditoria,
  aplicarTransicion,
  AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  LoteDerivacion,
  type OrigenPeticion,
  SolicitudRetiro,
  TipoActorAuditoria,
} from '@arca/core';
import {
  actorDe,
  comoHttp,
  diferencias,
  fotografiar,
} from '../solicitudes/auditoria-solicitud';
import { generarExcelLote } from './excel-lote';

/** Pagos con los que una solicitud aprobada ya se puede derivar. */
const PAGOS_RESUELTOS = [
  EstadoPagoSolicitud.NO_APLICA,
  EstadoPagoSolicitud.PAGADO,
];

export interface ResumenDerivacion {
  listas: number;
  bloqueadasPorPago: number;
}

export interface LoteHistorial {
  id: number;
  cantidad: number;
  generadoPor: string;
  createdAt: Date;
}

export interface ArchivoLote {
  nombre: string;
  contenido: Buffer;
}

/** Derivación de solicitudes a la empresa operadora (spec `derivacion-excel`). */
@Injectable()
export class DerivacionesAdminService {
  constructor(
    @InjectRepository(SolicitudRetiro)
    private readonly solicitudRetiroRepository: Repository<SolicitudRetiro>,
    @InjectRepository(LoteDerivacion)
    private readonly loteRepository: Repository<LoteDerivacion>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async resumen(): Promise<ResumenDerivacion> {
    const [listas, bloqueadasPorPago] = await Promise.all([
      this.solicitudRetiroRepository.count({
        where: {
          estado: EstadoSolicitudRetiro.APROBADA,
          estadoPago: In(PAGOS_RESUELTOS),
        },
      }),
      this.solicitudRetiroRepository.count({
        where: {
          estado: EstadoSolicitudRetiro.APROBADA,
          estadoPago: EstadoPagoSolicitud.PENDIENTE,
        },
      }),
    ]);

    return { listas, bloqueadasPorPago };
  }

  async crearLote(
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<LoteDerivacion> {
    const ahora = new Date();

    // Una transacción con bloqueo de filas: si dos funcionarios generan un lote
    // a la vez, una solicitud no puede salir en los dos.
    const { lote, cambios } =
      await this.solicitudRetiroRepository.manager.transaction(async (m) => {
        const solicitudes = await m.find(SolicitudRetiro, {
          where: {
            estado: EstadoSolicitudRetiro.APROBADA,
            estadoPago: In(PAGOS_RESUELTOS),
          },
          order: { fechaSolicitud: 'ASC', id: 'ASC' },
          lock: { mode: 'pessimistic_write' },
        });

        if (solicitudes.length === 0) {
          throw new BadRequestException(
            'No hay solicitudes aprobadas listas para derivar',
          );
        }

        const antes = solicitudes.map(fotografiar);

        for (const solicitud of solicitudes) {
          try {
            aplicarTransicion(solicitud, EstadoSolicitudRetiro.DERIVADA, {
              actor: actorDe(user),
              administradorId: user.administradorId,
              ahora,
            });
          } catch (error) {
            throw comoHttp(error);
          }
        }

        const lote = await m.save(LoteDerivacion, {
          generadoPorId: user.administradorId as string,
          cantidad: solicitudes.length,
        });

        for (const solicitud of solicitudes) {
          solicitud.loteDerivacionId = lote.id;
        }
        await m.save(SolicitudRetiro, solicitudes);

        return {
          lote,
          cambios: solicitudes.map((s, i) => ({
            id: s.id,
            ...diferencias(antes[i], fotografiar(s)),
          })),
        };
      });

    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'lotes_derivacion',
      entidadId: lote.id,
      accion: AccionAuditoria.CREATE,
      datosNuevos: { cantidad: lote.cantidad },
      origen,
    });

    for (const cambio of cambios) {
      await this.auditoriaService.registrar({
        tipoActor: TipoActorAuditoria.ADMINISTRADOR,
        actor: user,
        entidad: 'solicitudes_retiro',
        entidadId: cambio.id,
        accion: AccionAuditoria.UPDATE,
        datosAnteriores: cambio.anteriores,
        datosNuevos: { ...cambio.nuevos, loteDerivacionId: lote.id },
        origen,
      });
    }

    return lote;
  }

  async listar(): Promise<LoteHistorial[]> {
    const lotes = await this.loteRepository.find({
      relations: { generadoPor: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });

    return lotes.map((l) => ({
      id: l.id,
      cantidad: l.cantidad,
      generadoPor: l.generadoPor
        ? `${l.generadoPor.nombre} ${l.generadoPor.apellido}`
        : 'Funcionario',
      createdAt: l.createdAt,
    }));
  }

  /**
   * Arma el Excel del lote. Cada descarga se audita como `ACCESO`: es una
   * salida masiva de datos del vecino, aunque quien la pide ya esté dentro.
   */
  async excel(
    id: number,
    user: AuthUser,
    origen?: OrigenPeticion,
  ): Promise<ArchivoLote> {
    const lote = await this.loteRepository.findOne({ where: { id } });
    if (!lote) {
      throw new NotFoundException(`Lote de derivación ${id} no encontrado`);
    }

    const solicitudes = await this.solicitudRetiroRepository.find({
      where: { loteDerivacionId: id },
      relations: { residuoCatalogo: true },
      order: { fechaSolicitud: 'ASC', id: 'ASC' },
    });

    const contenido = await generarExcelLote(lote, solicitudes);

    await this.auditoriaService.registrar({
      tipoActor: TipoActorAuditoria.ADMINISTRADOR,
      actor: user,
      entidad: 'lotes_derivacion',
      entidadId: id,
      accion: AccionAuditoria.ACCESO,
      datosNuevos: { filas: solicitudes.length },
      origen,
    });

    const fecha = new Date(lote.createdAt).toISOString().slice(0, 10);
    return { nombre: `arca-lote-${id}-${fecha}.xlsx`, contenido };
  }
}
