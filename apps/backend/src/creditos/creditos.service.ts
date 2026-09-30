import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, In, MoreThanOrEqual, Repository } from 'typeorm';
import {
  type ArticuloMarketplace,
  OrigenMovimientoCreditos,
  TipoMovimientoCreditos,
  TransaccionCircularCredits,
  UsuarioCiudadano,
} from '../core';
import {
  aplicarTopes,
  bonoPorEstrellas,
  creditosPorEntrega,
  creditosPorRetirada,
  inicioDeMesEnChile,
  type TopeAlcanzado,
} from './reglas-creditos';

export interface MovimientoCreditos {
  id: number;
  monto: number;
  origen: OrigenMovimientoCreditos;
  motivo: string | null;
  saldoAnterior: number;
  saldoNuevo: number;
  fecha: Date;
}

export interface ResumenCreditos {
  saldo: number;
  movimientos: MovimientoCreditos[];
}

type ArticuloIntercambiado = Pick<
  ArticuloMarketplace,
  'id' | 'titulo' | 'usuarioPublicadorId' | 'usuarioCompradorId'
>;

interface Otorgamiento {
  ciudadanoId: string;
  monto: number;
  origen: OrigenMovimientoCreditos;
  motivo: string;
  articuloId?: number;
  solicitudRetiroId?: number;
  /** El otro vecino del intercambio; sin él no aplica el tope por pareja. */
  contraparteId?: string;
}

const TEXTO_TOPE: Record<TopeAlcanzado, string> = {
  mensual: 'se alcanzó el tope mensual',
  pareja: 'se alcanzó el tope por pareja',
};

const ORIGENES_INTERCAMBIO = [
  OrigenMovimientoCreditos.ENTREGA,
  OrigenMovimientoCreditos.ESTRELLAS,
];

/**
 * Circular Credits (spec `marketplace` §7). El saldo nunca se edita: cada
 * otorgamiento agrega un movimiento con el saldo anterior y el nuevo.
 */
@Injectable()
export class CreditosService {
  constructor(
    @InjectRepository(TransaccionCircularCredits)
    private readonly transaccionRepository: Repository<TransaccionCircularCredits>,
  ) {}

  /** Saldo y movimientos de la sesión, más recientes primero. */
  async resumen(ciudadanoId: string): Promise<ResumenCreditos> {
    const transacciones = await this.transaccionRepository.find({
      where: { usuarioCiudadanoId: ciudadanoId },
      order: { id: 'DESC' },
    });
    return {
      saldo: transacciones[0]?.saldoNuevo ?? 0,
      movimientos: transacciones.map((t) => ({
        id: t.id,
        monto: t.montoCreditos,
        origen: t.origen,
        motivo: t.razon,
        saldoAnterior: t.saldoAnterior,
        saldoNuevo: t.saldoNuevo,
        fecha: t.fechaTransaccion,
      })),
    };
  }

  /** Créditos de la entrega, para quien regaló. */
  otorgarPorEntrega(
    manager: EntityManager,
    articulo: ArticuloIntercambiado,
  ): Promise<TransaccionCircularCredits> {
    return this.otorgar(manager, {
      ciudadanoId: articulo.usuarioPublicadorId,
      monto: creditosPorEntrega(),
      origen: OrigenMovimientoCreditos.ENTREGA,
      motivo: `Entrega de «${articulo.titulo}»`,
      articuloId: articulo.id,
      contraparteId: articulo.usuarioCompradorId ?? undefined,
    });
  }

  /** Bono por 4 o 5 estrellas, para quien regaló. Con 3 o menos no hay movimiento. */
  async otorgarPorEstrellas(
    manager: EntityManager,
    articulo: ArticuloIntercambiado,
    puntuacion: number,
  ): Promise<TransaccionCircularCredits | null> {
    const bono = bonoPorEstrellas(puntuacion);
    if (bono === 0) return null;
    return this.otorgar(manager, {
      ciudadanoId: articulo.usuarioPublicadorId,
      monto: bono,
      origen: OrigenMovimientoCreditos.ESTRELLAS,
      motivo: `${puntuacion} estrellas por «${articulo.titulo}»`,
      articuloId: articulo.id,
      contraparteId: articulo.usuarioCompradorId ?? undefined,
    });
  }

  /**
   * 50 % para quien pidió un retiro que llegó a `retirada`, solo con el tope
   * mensual. Sin disparador todavía: lo conecta el panel municipal (spec §7.3).
   */
  otorgarPorRetirada(
    manager: EntityManager,
    solicitudRetiroId: number,
    ciudadanoId: string,
  ): Promise<TransaccionCircularCredits> {
    return this.otorgar(manager, {
      ciudadanoId,
      monto: creditosPorRetirada(),
      origen: OrigenMovimientoCreditos.RETIRADA,
      motivo: `Retiro municipal de la solicitud #${solicitudRetiroId}`,
      solicitudRetiroId,
    });
  }

  /**
   * Debe correr dentro de una transacción. Bloquea las filas de los vecinos
   * involucrados, en orden de id para que dos otorgamientos cruzados no se
   * traben, antes de leer el saldo y los topes: así dos otorgamientos
   * simultáneos no leen el mismo saldo.
   */
  private async otorgar(
    manager: EntityManager,
    datos: Otorgamiento,
  ): Promise<TransaccionCircularCredits> {
    const involucrados = [datos.ciudadanoId, datos.contraparteId]
      .filter((id): id is string => Boolean(id))
      .sort();
    await manager.find(UsuarioCiudadano, {
      where: { id: In(involucrados) },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });

    const ahora = new Date();
    const inicioMes = inicioDeMesEnChile(ahora);

    const ultimo = await manager.findOne(TransaccionCircularCredits, {
      where: { usuarioCiudadanoId: datos.ciudadanoId },
      order: { id: 'DESC' },
    });
    const saldoAnterior = ultimo?.saldoNuevo ?? 0;

    const ganadoMes = Number(
      (await manager.sum(TransaccionCircularCredits, 'montoCreditos', {
        usuarioCiudadanoId: datos.ciudadanoId,
        fechaTransaccion: MoreThanOrEqual(inicioMes),
      })) ?? 0,
    );
    const generadoPareja = datos.contraparteId
      ? await this.generadoEntre(
          manager,
          datos.ciudadanoId,
          datos.contraparteId,
          inicioMes,
        )
      : null;

    const { monto, tope } = aplicarTopes(
      datos.monto,
      ganadoMes,
      generadoPareja,
    );

    return manager.save(
      manager.create(TransaccionCircularCredits, {
        usuarioCiudadanoId: datos.ciudadanoId,
        articuloId: datos.articuloId ?? null,
        solicitudRetiroId: datos.solicitudRetiroId ?? null,
        montoCreditos: monto,
        tipo: TipoMovimientoCreditos.BONIFICACION,
        origen: datos.origen,
        razon: tope ? `${datos.motivo} (${TEXTO_TOPE[tope]})` : datos.motivo,
        otorgadoPorAdministradorId: null,
        saldoAnterior,
        saldoNuevo: saldoAnterior + monto,
        fechaTransaccion: ahora,
      }),
    );
  }

  /** Lo generado en el mes por intercambios entre los dos vecinos, en cualquier dirección. */
  private async generadoEntre(
    manager: EntityManager,
    vecinoA: string,
    vecinoB: string,
    desde: Date,
  ): Promise<number> {
    const base = {
      origen: In(ORIGENES_INTERCAMBIO),
      fechaTransaccion: MoreThanOrEqual(desde),
    };
    const suma = await manager.sum(
      TransaccionCircularCredits,
      'montoCreditos',
      [
        {
          ...base,
          articulo: {
            usuarioPublicadorId: vecinoA,
            usuarioCompradorId: vecinoB,
          },
        },
        {
          ...base,
          articulo: {
            usuarioPublicadorId: vecinoB,
            usuarioCompradorId: vecinoA,
          },
        },
      ],
    );
    return Number(suma ?? 0);
  }
}
