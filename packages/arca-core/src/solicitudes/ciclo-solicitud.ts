import { EstadoPagoSolicitud } from '../entities/estado-pago-solicitud.enum';
import { EstadoSolicitudRetiro } from '../entities/estado-solicitud-retiro.enum';
import type { SolicitudRetiro } from '../entities/solicitud-retiro.entity';

/**
 * Reglas del ciclo de vida de una solicitud de retiro
 * (docs/specs/SPEC-ciclo-solicitud.md §2).
 *
 * Son funciones puras, sin Nest ni base de datos, porque las usan los dos
 * backends y no pueden divergir. Ningún service debe asignar `estado`
 * directamente: se pasa por `aplicarTransicion`.
 *
 * Lo que el core no sabe —si el vecino es dueño de la solicitud, si viene un
 * motivo o el checklist— lo valida el endpoint que llama.
 */

/** Con qué sombrero actúa la persona, igual que en auditoría. */
export type ActorCiclo = 'vecino' | 'funcionario' | 'admin';

export interface ContextoTransicion {
  actor: ActorCiclo;
  estadoPago: EstadoPagoSolicitud;
}

/**
 * `actor` se traduce a 403 en los backends; `estado` y `pago`, a 400.
 */
export type MotivoTransicionInvalida = 'estado' | 'actor' | 'pago';

export class TransicionInvalidaError extends Error {
  constructor(
    readonly motivo: MotivoTransicionInvalida,
    readonly desde: EstadoSolicitudRetiro,
    readonly hacia: EstadoSolicitudRetiro,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'TransicionInvalidaError';
  }
}

const {
  EN_REVISION,
  REQUIERE_MODIFICACION,
  APROBADA,
  RECHAZADA,
  DERIVADA,
  RETIRADA,
  NO_REALIZADA,
  CANCELADA,
} = EstadoSolicitudRetiro;

interface Transicion {
  desde: EstadoSolicitudRetiro;
  hacia: EstadoSolicitudRetiro;
  /**
   * `vecino` es exacto: el admin no actúa en nombre del vecino.
   * `funcionario` lo cumplen funcionario y admin. `admin`, solo admin.
   */
  actorMinimo: ActorCiclo;
  condicionPago?: {
    cumple: (estadoPago: EstadoPagoSolicitud) => boolean;
    mensaje: string;
  };
}

const PAGO_RESUELTO = {
  cumple: (pago: EstadoPagoSolicitud) => pago !== EstadoPagoSolicitud.PENDIENTE,
  mensaje: 'No se puede derivar una solicitud con el pago pendiente',
};

const SIN_PAGO_REALIZADO = {
  cumple: (pago: EstadoPagoSolicitud) => pago !== EstadoPagoSolicitud.PAGADO,
  mensaje: 'No se puede cancelar una solicitud que ya fue pagada',
};

// El orden de las filas es el orden en que el panel muestra las acciones.
const TRANSICIONES: readonly Transicion[] = [
  { desde: EN_REVISION, hacia: APROBADA, actorMinimo: 'funcionario' },
  {
    desde: EN_REVISION,
    hacia: REQUIERE_MODIFICACION,
    actorMinimo: 'funcionario',
  },
  { desde: EN_REVISION, hacia: RECHAZADA, actorMinimo: 'funcionario' },
  { desde: REQUIERE_MODIFICACION, hacia: EN_REVISION, actorMinimo: 'vecino' },
  {
    desde: APROBADA,
    hacia: DERIVADA,
    actorMinimo: 'funcionario',
    condicionPago: PAGO_RESUELTO,
  },
  { desde: DERIVADA, hacia: RETIRADA, actorMinimo: 'funcionario' },
  { desde: DERIVADA, hacia: NO_REALIZADA, actorMinimo: 'funcionario' },
  { desde: NO_REALIZADA, hacia: APROBADA, actorMinimo: 'funcionario' },
  { desde: RECHAZADA, hacia: EN_REVISION, actorMinimo: 'admin' },
  { desde: RETIRADA, hacia: EN_REVISION, actorMinimo: 'admin' },
  ...[EN_REVISION, REQUIERE_MODIFICACION, APROBADA].map(
    (desde): Transicion => ({
      desde,
      hacia: CANCELADA,
      actorMinimo: 'vecino',
      condicionPago: SIN_PAGO_REALIZADO,
    }),
  ),
];

/** Estados en que el vecino puede cancelar (sin pago realizado). */
export const ESTADOS_CANCELABLES_POR_VECINO: readonly EstadoSolicitudRetiro[] =
  TRANSICIONES.filter((t) => t.hacia === CANCELADA).map((t) => t.desde);

/** Estados que cierran el flujo normal. `rechazada` y `retirada` solo las reabre un admin. */
export const ESTADOS_FINALES: readonly EstadoSolicitudRetiro[] = [
  RECHAZADA,
  RETIRADA,
  CANCELADA,
];

const actorCumple = (actor: ActorCiclo, minimo: ActorCiclo): boolean => {
  if (minimo === 'vecino') return actor === 'vecino';
  if (minimo === 'funcionario')
    return actor === 'funcionario' || actor === 'admin';
  return actor === 'admin';
};

/** Lanza `TransicionInvalidaError` si el cambio no está permitido. */
export function validarTransicion(
  desde: EstadoSolicitudRetiro,
  hacia: EstadoSolicitudRetiro,
  contexto: ContextoTransicion,
): void {
  const fila = TRANSICIONES.find((t) => t.desde === desde && t.hacia === hacia);

  if (!fila) {
    throw new TransicionInvalidaError(
      'estado',
      desde,
      hacia,
      `No se puede pasar una solicitud de "${desde}" a "${hacia}"`,
    );
  }

  if (!actorCumple(contexto.actor, fila.actorMinimo)) {
    throw new TransicionInvalidaError(
      'actor',
      desde,
      hacia,
      `El perfil "${contexto.actor}" no puede pasar una solicitud de "${desde}" a "${hacia}"`,
    );
  }

  if (fila.condicionPago && !fila.condicionPago.cumple(contexto.estadoPago)) {
    throw new TransicionInvalidaError(
      'pago',
      desde,
      hacia,
      fila.condicionPago.mensaje,
    );
  }
}

/** Destinos válidos desde `desde` para ese contexto, en el orden de la tabla. */
export function transicionesDisponibles(
  desde: EstadoSolicitudRetiro,
  contexto: ContextoTransicion,
): EstadoSolicitudRetiro[] {
  return TRANSICIONES.filter(
    (t) =>
      t.desde === desde &&
      actorCumple(contexto.actor, t.actorMinimo) &&
      (!t.condicionPago || t.condicionPago.cumple(contexto.estadoPago)),
  ).map((t) => t.hacia);
}

/** Campos de la solicitud que el ciclo lee o modifica. */
export type SolicitudEnCiclo = Pick<
  SolicitudRetiro,
  | 'estado'
  | 'estadoPago'
  | 'monto'
  | 'fechaRevision'
  | 'revisadoPorId'
  | 'fechaCierre'
>;

export interface DatosTransicion {
  actor: ActorCiclo;
  /** `usuarios_administradores.id` de quien decide. No aplica al vecino. */
  administradorId?: string | null;
  /** Precio vigente del catálogo. Obligatorio al aprobar una solicitud en revisión sin pagar. */
  precioCatalogo?: number | null;
  ahora: Date;
}

const DECISIONES_DE_REVISION: readonly EstadoSolicitudRetiro[] = [
  APROBADA,
  REQUIERE_MODIFICACION,
  RECHAZADA,
];

/**
 * Valida la transición y aplica sus efectos sobre la solicitud (spec §2.2).
 * Si algo es inválido lanza antes de modificar nada.
 */
export function aplicarTransicion(
  solicitud: SolicitudEnCiclo,
  hacia: EstadoSolicitudRetiro,
  datos: DatosTransicion,
): void {
  const desde = solicitud.estado;

  validarTransicion(desde, hacia, {
    actor: datos.actor,
    estadoPago: solicitud.estadoPago,
  });

  // Una solicitud reabierta que ya se pagó conserva su cobro: aprobarla de
  // nuevo no puede pedirle al vecino que pague otra vez.
  const congelaMonto =
    desde === EN_REVISION &&
    hacia === APROBADA &&
    solicitud.estadoPago !== EstadoPagoSolicitud.PAGADO;

  if (
    congelaMonto &&
    (datos.precioCatalogo === undefined || datos.precioCatalogo === null)
  ) {
    throw new Error('precioCatalogo es obligatorio al aprobar una solicitud');
  }

  if (congelaMonto) {
    const monto = datos.precioCatalogo as number;
    solicitud.monto = monto;
    solicitud.estadoPago =
      monto > 0 ? EstadoPagoSolicitud.PENDIENTE : EstadoPagoSolicitud.NO_APLICA;
  }

  if (desde === EN_REVISION && DECISIONES_DE_REVISION.includes(hacia)) {
    solicitud.fechaRevision = datos.ahora;
    solicitud.revisadoPorId = datos.administradorId ?? null;
  }

  if (hacia === RETIRADA || hacia === NO_REALIZADA) {
    solicitud.fechaCierre = datos.ahora;
  }

  if (hacia === EN_REVISION) {
    solicitud.fechaCierre = null;
  }

  solicitud.estado = hacia;
}
