import { EstadoPagoSolicitud } from '../entities/estado-pago-solicitud.enum';
import { EstadoSolicitudRetiro } from '../entities/estado-solicitud-retiro.enum';
import {
  type ActorCiclo,
  aplicarTransicion,
  ESTADOS_CANCELABLES_POR_VECINO,
  type SolicitudEnCiclo,
  TransicionInvalidaError,
  transicionesDisponibles,
  validarTransicion,
} from './ciclo-solicitud';

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
const { NO_APLICA, PENDIENTE, PAGADO } = EstadoPagoSolicitud;

const TODOS_LOS_ESTADOS = Object.values(EstadoSolicitudRetiro);

/** Captura el error de una transición inválida para revisar su motivo. */
const errorDe = (fn: () => void): TransicionInvalidaError => {
  try {
    fn();
  } catch (e) {
    if (e instanceof TransicionInvalidaError) return e;
    throw e;
  }
  throw new Error('Se esperaba TransicionInvalidaError');
};

describe('validarTransicion', () => {
  // Tabla §2.1 del spec: cada fila permitida, con el actor mínimo y un pago
  // que cumple la condición.
  const PERMITIDAS: Array<
    [
      EstadoSolicitudRetiro,
      EstadoSolicitudRetiro,
      ActorCiclo,
      EstadoPagoSolicitud,
    ]
  > = [
    [EN_REVISION, APROBADA, 'funcionario', NO_APLICA],
    [EN_REVISION, REQUIERE_MODIFICACION, 'funcionario', NO_APLICA],
    [EN_REVISION, RECHAZADA, 'funcionario', NO_APLICA],
    [REQUIERE_MODIFICACION, EN_REVISION, 'vecino', NO_APLICA],
    [APROBADA, DERIVADA, 'funcionario', NO_APLICA],
    [APROBADA, DERIVADA, 'funcionario', PAGADO],
    [DERIVADA, RETIRADA, 'funcionario', PAGADO],
    [DERIVADA, NO_REALIZADA, 'funcionario', PAGADO],
    [NO_REALIZADA, APROBADA, 'funcionario', PAGADO],
    [RECHAZADA, EN_REVISION, 'admin', NO_APLICA],
    [RETIRADA, EN_REVISION, 'admin', PAGADO],
    [EN_REVISION, CANCELADA, 'vecino', NO_APLICA],
    [REQUIERE_MODIFICACION, CANCELADA, 'vecino', NO_APLICA],
    [APROBADA, CANCELADA, 'vecino', PENDIENTE],
  ];

  it.each(PERMITIDAS)(
    '%s → %s es válida para %s (pago %s)',
    (desde, hacia, actor, estadoPago) => {
      expect(() =>
        validarTransicion(desde, hacia, { actor, estadoPago }),
      ).not.toThrow();
    },
  );

  it('el admin hereda las transiciones del funcionario', () => {
    expect(() =>
      validarTransicion(EN_REVISION, APROBADA, {
        actor: 'admin',
        estadoPago: NO_APLICA,
      }),
    ).not.toThrow();
  });

  it('el admin no hereda las transiciones del vecino', () => {
    const error = errorDe(() =>
      validarTransicion(EN_REVISION, CANCELADA, {
        actor: 'admin',
        estadoPago: NO_APLICA,
      }),
    );
    expect(error.motivo).toBe('actor');
  });

  // Al menos un destino inválido por cada estado de origen.
  it.each([
    [EN_REVISION, DERIVADA],
    [REQUIERE_MODIFICACION, APROBADA],
    [APROBADA, RETIRADA],
    [RECHAZADA, APROBADA],
    [DERIVADA, CANCELADA],
    [RETIRADA, APROBADA],
    [NO_REALIZADA, RETIRADA],
    [CANCELADA, EN_REVISION],
  ])('%s → %s no existe en la tabla (motivo estado)', (desde, hacia) => {
    for (const actor of ['vecino', 'funcionario', 'admin'] as const) {
      const error = errorDe(() =>
        validarTransicion(desde, hacia, { actor, estadoPago: NO_APLICA }),
      );
      expect(error.motivo).toBe('estado');
    }
  });

  it('pasar al mismo estado es inválido', () => {
    const error = errorDe(() =>
      validarTransicion(APROBADA, APROBADA, {
        actor: 'admin',
        estadoPago: NO_APLICA,
      }),
    );
    expect(error.motivo).toBe('estado');
  });

  it('un vecino no puede aprobar (motivo actor)', () => {
    const error = errorDe(() =>
      validarTransicion(EN_REVISION, APROBADA, {
        actor: 'vecino',
        estadoPago: NO_APLICA,
      }),
    );
    expect(error.motivo).toBe('actor');
  });

  it.each([RECHAZADA, RETIRADA])(
    'un funcionario no puede reabrir %s (motivo actor)',
    (desde) => {
      const error = errorDe(() =>
        validarTransicion(desde, EN_REVISION, {
          actor: 'funcionario',
          estadoPago: NO_APLICA,
        }),
      );
      expect(error.motivo).toBe('actor');
    },
  );

  it('derivar con pago pendiente es inválido (motivo pago)', () => {
    const error = errorDe(() =>
      validarTransicion(APROBADA, DERIVADA, {
        actor: 'funcionario',
        estadoPago: PENDIENTE,
      }),
    );
    expect(error.motivo).toBe('pago');
  });

  it('cancelar una solicitud pagada es inválido (motivo pago)', () => {
    const error = errorDe(() =>
      validarTransicion(APROBADA, CANCELADA, {
        actor: 'vecino',
        estadoPago: PAGADO,
      }),
    );
    expect(error.motivo).toBe('pago');
  });

  it('nadie puede reabrir una solicitud cancelada', () => {
    for (const actor of ['vecino', 'funcionario', 'admin'] as const) {
      for (const hacia of TODOS_LOS_ESTADOS) {
        expect(() =>
          validarTransicion(CANCELADA, hacia, { actor, estadoPago: NO_APLICA }),
        ).toThrow(TransicionInvalidaError);
      }
    }
  });
});

describe('transicionesDisponibles', () => {
  it('en revisión, funcionario y admin ven las tres decisiones', () => {
    for (const actor of ['funcionario', 'admin'] as const) {
      expect(
        transicionesDisponibles(EN_REVISION, { actor, estadoPago: NO_APLICA }),
      ).toEqual([APROBADA, REQUIERE_MODIFICACION, RECHAZADA]);
    }
  });

  it('rechazada: el funcionario no ve acciones y el admin puede reabrir', () => {
    expect(
      transicionesDisponibles(RECHAZADA, {
        actor: 'funcionario',
        estadoPago: NO_APLICA,
      }),
    ).toEqual([]);
    expect(
      transicionesDisponibles(RECHAZADA, {
        actor: 'admin',
        estadoPago: NO_APLICA,
      }),
    ).toEqual([EN_REVISION]);
  });

  it('aprobada con pago pendiente no ofrece derivar', () => {
    expect(
      transicionesDisponibles(APROBADA, {
        actor: 'funcionario',
        estadoPago: PENDIENTE,
      }),
    ).toEqual([]);
  });

  it('coincide siempre con validarTransicion', () => {
    for (const desde of TODOS_LOS_ESTADOS) {
      for (const actor of ['vecino', 'funcionario', 'admin'] as const) {
        for (const estadoPago of Object.values(EstadoPagoSolicitud)) {
          const contexto = { actor, estadoPago };
          const disponibles = transicionesDisponibles(desde, contexto);

          for (const hacia of TODOS_LOS_ESTADOS) {
            const valida = (() => {
              try {
                validarTransicion(desde, hacia, contexto);
                return true;
              } catch {
                return false;
              }
            })();
            expect(disponibles.includes(hacia)).toBe(valida);
          }
        }
      }
    }
  });
});

describe('ESTADOS_CANCELABLES_POR_VECINO', () => {
  it('son en revisión, requiere modificación y aprobada', () => {
    expect([...ESTADOS_CANCELABLES_POR_VECINO].sort()).toEqual(
      [EN_REVISION, REQUIERE_MODIFICACION, APROBADA].sort(),
    );
  });
});

describe('aplicarTransicion', () => {
  const AHORA = new Date('2026-09-17T12:00:00.000Z');
  const REVISOR = '00000000-0000-4000-8000-0000000000A3';

  const solicitud = (
    cambios: Partial<SolicitudEnCiclo> = {},
  ): SolicitudEnCiclo => ({
    estado: EN_REVISION,
    estadoPago: NO_APLICA,
    monto: null,
    fechaRevision: null,
    revisadoPorId: null,
    fechaCierre: null,
    ...cambios,
  });

  it('aprobar con precio > 0 congela el monto y deja el pago pendiente', () => {
    const s = solicitud();
    aplicarTransicion(s, APROBADA, {
      actor: 'funcionario',
      administradorId: REVISOR,
      precioCatalogo: 15000,
      ahora: AHORA,
    });
    expect(s).toEqual(
      solicitud({
        estado: APROBADA,
        estadoPago: PENDIENTE,
        monto: 15000,
        fechaRevision: AHORA,
        revisadoPorId: REVISOR,
      }),
    );
  });

  it('aprobar con precio 0 no genera cobro', () => {
    const s = solicitud();
    aplicarTransicion(s, APROBADA, {
      actor: 'funcionario',
      administradorId: REVISOR,
      precioCatalogo: 0,
      ahora: AHORA,
    });
    expect(s.estadoPago).toBe(NO_APLICA);
    expect(s.monto).toBe(0);
  });

  it('aprobar exige el precio del catálogo', () => {
    const s = solicitud();
    expect(() =>
      aplicarTransicion(s, APROBADA, {
        actor: 'funcionario',
        administradorId: REVISOR,
        ahora: AHORA,
      }),
    ).toThrow('precioCatalogo');
    expect(s).toEqual(solicitud());
  });

  it('volver de no realizada a aprobada no toca monto ni pago', () => {
    const s = solicitud({
      estado: NO_REALIZADA,
      estadoPago: PAGADO,
      monto: 15000,
      fechaCierre: AHORA,
    });
    aplicarTransicion(s, APROBADA, {
      actor: 'funcionario',
      administradorId: REVISOR,
      precioCatalogo: 99999,
      ahora: AHORA,
    });
    expect(s.estadoPago).toBe(PAGADO);
    expect(s.monto).toBe(15000);
  });

  it('re-aprobar una solicitud ya pagada (reabierta) no vuelve a cobrar', () => {
    const s = solicitud({ estadoPago: PAGADO, monto: 15000 });
    aplicarTransicion(s, APROBADA, {
      actor: 'admin',
      administradorId: REVISOR,
      precioCatalogo: 20000,
      ahora: AHORA,
    });
    expect(s.estadoPago).toBe(PAGADO);
    expect(s.monto).toBe(15000);
  });

  it.each([REQUIERE_MODIFICACION, RECHAZADA])(
    'decidir %s registra fecha y revisor',
    (hacia) => {
      const s = solicitud();
      aplicarTransicion(s, hacia, {
        actor: 'funcionario',
        administradorId: REVISOR,
        ahora: AHORA,
      });
      expect(s.fechaRevision).toBe(AHORA);
      expect(s.revisadoPorId).toBe(REVISOR);
    },
  );

  it.each([RETIRADA, NO_REALIZADA])(
    'cerrar como %s fija la fecha de cierre',
    (hacia) => {
      const s = solicitud({ estado: DERIVADA });
      aplicarTransicion(s, hacia, {
        actor: 'funcionario',
        administradorId: REVISOR,
        ahora: AHORA,
      });
      expect(s.estado).toBe(hacia);
      expect(s.fechaCierre).toBe(AHORA);
    },
  );

  it('reabrir limpia la fecha de cierre', () => {
    const s = solicitud({ estado: RETIRADA, fechaCierre: AHORA });
    aplicarTransicion(s, EN_REVISION, {
      actor: 'admin',
      administradorId: REVISOR,
      ahora: AHORA,
    });
    expect(s.estado).toBe(EN_REVISION);
    expect(s.fechaCierre).toBeNull();
  });

  it('cancelar como vecino no registra revisor', () => {
    const s = solicitud();
    aplicarTransicion(s, CANCELADA, { actor: 'vecino', ahora: AHORA });
    expect(s).toEqual(solicitud({ estado: CANCELADA }));
  });

  it('una transición inválida no modifica la solicitud', () => {
    const s = solicitud({ estado: DERIVADA });
    expect(() =>
      aplicarTransicion(s, CANCELADA, { actor: 'vecino', ahora: AHORA }),
    ).toThrow(TransicionInvalidaError);
    expect(s).toEqual(solicitud({ estado: DERIVADA }));
  });
});
