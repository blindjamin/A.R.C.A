import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import {
  cancelarSolicitud,
  fetchSolicitud,
  formatearPrecio,
  resumenObjetos,
  type SolicitudRetiro,
} from '../api/arca';
import {
  BackButton,
  IconBuilding,
  IconCheck,
  IconCreditCard,
  IconShield,
  IconX,
  ScreenHeader,
} from '../components/ui';
import {
  estaSolicitudPagada,
  marcarSolicitudPagada,
  obtenerComprobantePago,
  type DatosComprobante,
} from '../features/pago/pagosStorage';

type EstadoFlujoPago = 'formulario' | 'procesando' | 'aprobado' | 'anulado';

export default function PantallaPago() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { sesion } = useSession();

  const solicitudId = Number(id);
  const solicitudInicial = (location.state as { solicitud?: SolicitudRetiro } | undefined)
    ?.solicitud;

  const [solicitud, setSolicitud] = useState<SolicitudRetiro | null>(
    solicitudInicial ?? null,
  );

  const [errorCarga, setErrorCarga] = useState<string | null>(() => {
    if (!solicitudInicial && (!solicitudId || Number.isNaN(solicitudId))) {
      return 'Identificador de solicitud no válido';
    }
    return null;
  });

  const [cargando, setCargando] = useState(() => {
    if (solicitudInicial) return false;
    if (!solicitudId || Number.isNaN(solicitudId)) return false;
    return true;
  });

  const [comprobante, setComprobante] = useState<DatosComprobante | null>(() => {
    if (solicitudInicial) {
      return obtenerComprobantePago(solicitudInicial.id);
    }
    if (solicitudId && !Number.isNaN(solicitudId)) {
      return obtenerComprobantePago(solicitudId);
    }
    return null;
  });

  const [estadoFlujo, setEstadoFlujo] = useState<EstadoFlujoPago>(() => {
    if (
      solicitudInicial &&
      (solicitudInicial.estadoPago === 'pagado' || estaSolicitudPagada(solicitudInicial.id))
    ) {
      return 'aprobado';
    }
    if (solicitudId && !Number.isNaN(solicitudId) && estaSolicitudPagada(solicitudId)) {
      return 'aprobado';
    }
    return 'formulario';
  });

  const [traspasando, setTraspasando] = useState(false);

  // Cargar solicitud si no viene por location.state
  useEffect(() => {
    if (solicitud || !solicitudId || Number.isNaN(solicitudId)) return;

    fetchSolicitud(solicitudId)
      .then((res) => {
        setSolicitud(res);
        if (res.estadoPago === 'pagado' || estaSolicitudPagada(res.id)) {
          const comp = obtenerComprobantePago(res.id);
          if (comp) setComprobante(comp);
          setEstadoFlujo('aprobado');
        }
      })
      .catch((err) => {
        setErrorCarga((err as Error).message);
      })
      .finally(() => {
        setCargando(false);
      });
  }, [solicitud, solicitudId]);

  if (cargando) {
    return (
      <div className="mx-auto w-full max-w-xl py-12 text-center">
        <p className="text-sm text-slate animate-pulse">Cargando datos de la orden de pago…</p>
      </div>
    );
  }

  if (errorCarga || !solicitud) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <BackButton onClick={() => navigate('/mis-solicitudes')} />
        <div className="card p-6 text-center space-y-3">
          <p className="text-rose-600 font-semibold text-sm">
            {errorCarga ?? 'No se pudo cargar la información de la solicitud.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/mis-solicitudes')}
            className="btn-outline text-xs px-4 py-2"
          >
            Volver a Mis solicitudes
          </button>
        </div>
      </div>
    );
  }

  const monto =
    solicitud.monto && solicitud.monto > 0
      ? solicitud.monto
      : solicitud.residuoCatalogo?.precio && solicitud.residuoCatalogo.precio > 0
      ? solicitud.residuoCatalogo.precio
      : 5000;

  const simularAprobado = () => {
    setEstadoFlujo('procesando');
    setTimeout(() => {
      const ahora = new Date();
      const nuevoComprobante: DatosComprobante = {
        solicitudId: solicitud.id,
        ordenCompra: `SD-${solicitud.id}-${Date.now().toString().slice(-4)}`,
        codigoAutorizacion: `TBK-${Math.floor(100000 + Math.random() * 900000)}`,
        monto,
        fecha: ahora.toLocaleString('es-CL', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        metodoPago: 'Webpay Plus — Débito (•••• 4242)',
      };

      marcarSolicitudPagada(solicitud.id, nuevoComprobante);
      setComprobante(nuevoComprobante);
      setEstadoFlujo('aprobado');
    }, 1200);
  };

  const simularAnulado = () => {
    setEstadoFlujo('procesando');
    setTimeout(() => {
      setEstadoFlujo('anulado');
    }, 800);
  };

  const handleTraspasoMarketplace = async () => {
    if (!solicitud) return;
    const confirmar = window.confirm(
      'Al publicar este residuo en el Marketplace, tu solicitud de retiro municipal será cancelada. ¿Deseas continuar?',
    );
    if (!confirmar) return;

    setTraspasando(true);
    try {
      const usuarioId = sesion?.ciudadanoId ?? 'anonimo';
      await cancelarSolicitud(
        solicitud.id,
        usuarioId,
        'Cancelada por traspaso a Marketplace',
      );
      navigate('/marketplace/subir', {
        state: {
          importarSolicitud: {
            solicitudId: solicitud.id,
            titulo:
              solicitud.nombreResiduoOtro ||
              solicitud.residuoCatalogo?.nombre ||
              '',
            descripcion: solicitud.descripcion ?? '',
            residuoCatalogoId: solicitud.residuoCatalogoId,
            nombreResiduoOtro: solicitud.nombreResiduoOtro,
            fotoUrl: solicitud.fotoUrl,
          },
        },
      });
    } catch (err) {
      alert(
        'No se pudo cancelar la solicitud para el traspaso: ' +
          (err as Error).message,
      );
      setTraspasando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PANTALLA PROCESANDO
  // ---------------------------------------------------------------------------
  if (estadoFlujo === 'procesando') {
    return (
      <div className="mx-auto w-full max-w-md py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-700 animate-spin">
          <IconCreditCard className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-ink">Conectando con Transbank Webpay…</h2>
          <p className="text-xs text-slate">Verificando transacción de forma segura</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PANTALLA RESULTADO: APROBADO (COMPACTO / SIN SCROLL)
  // ---------------------------------------------------------------------------
  if (estadoFlujo === 'aprobado') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col justify-between space-y-4 py-1">
        {/* Membrete institucional compacto */}
        <div className="flex items-center justify-between text-[11px] text-slate border-b border-line pb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <IconBuilding className="h-3.5 w-3.5 text-forest-700" />
            <span>I. Municipalidad de Santo Domingo</span>
          </span>
          <span className="font-semibold text-forest-700">Tesorería</span>
        </div>

        {/* Encabezado minimalista horizontal */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 ring-2 ring-emerald-50">
            <IconCheck className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-ink leading-tight">
                Pago acreditado
              </h1>
              <span className="pill bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold py-0.5 px-2">
                Aprobado
              </span>
            </div>
            <p className="text-xs text-slate truncate">
              Derechos municipales registrados en rentas comunales.
            </p>
          </div>
        </div>

        {/* Ticket digital compacto (Grid de datos con monto destacado) */}
        <section className="card p-4 space-y-3 border border-line bg-white shadow-xs">
          <div className="flex items-baseline justify-between border-b border-line/60 pb-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Total acreditado
              </span>
              <p className="text-xl font-extrabold text-forest-700 mt-0.5">
                {formatearPrecio(monto)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Comprobante
              </span>
              <p className="font-mono text-xs font-semibold text-ink mt-0.5">
                ING-SD-{solicitud.id}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Solicitud
              </span>
              <p className="font-bold text-ink truncate mt-0.5">#{solicitud.id}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Residuo
              </span>
              <p className="font-medium text-ink truncate mt-0.5">
                {resumenObjetos(solicitud)}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Autorización TBK
              </span>
              <p className="font-mono text-xs text-ink mt-0.5">
                {comprobante?.codigoAutorizacion ?? 'TBK-481920'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Medio
              </span>
              <p className="font-medium text-ink truncate mt-0.5">
                Webpay Plus Débito
              </p>
            </div>
          </div>

          <div className="rounded-md bg-emerald-50/70 p-2.5 text-[11px] text-emerald-900 border border-emerald-200/60 leading-snug">
            ✓ Solicitud habilitada para coordinación y programación de cuadrilla municipal.
          </div>
        </section>

        {/* Acciones principales visibles sin scroll */}
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => navigate('/mis-solicitudes')}
            className="btn-primary w-full py-3 text-sm font-bold shadow-sm"
          >
            Ver seguimiento en Mis solicitudes
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full text-center py-1 text-xs text-slate hover:text-ink transition-colors font-medium"
          >
            Imprimir o guardar comprobante
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // PANTALLA RESULTADO: ANULADO (COMPACTO / SIN SCROLL)
  // ---------------------------------------------------------------------------
  if (estadoFlujo === 'anulado') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col justify-between space-y-4 py-1">
        {/* Membrete institucional compacto */}
        <div className="flex items-center justify-between text-[11px] text-slate border-b border-line pb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <IconBuilding className="h-3.5 w-3.5 text-slate" />
            <span>I. Municipalidad de Santo Domingo</span>
          </span>
          <span className="font-semibold text-slate">Webpay</span>
        </div>

        {/* Encabezado minimalista horizontal */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 ring-2 ring-amber-50">
            <IconX className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-ink leading-tight">
                Pago no completado
              </h1>
              <span className="pill bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold py-0.5 px-2">
                Sin cobro
              </span>
            </div>
            <p className="text-xs text-slate truncate">
              La operación fue cancelada por el usuario.
            </p>
          </div>
        </div>

        {/* Tarjeta informativa compacta */}
        <section className="card p-4 space-y-3 border border-line bg-white shadow-xs">
          <div className="space-y-1.5 text-xs text-slate leading-relaxed">
            <p>
              <strong className="text-ink">No se ha realizado ningún cobro</strong> ni cargo a tu
              cuenta bancaria.
            </p>
            <p>
              Tu solicitud <strong className="text-ink">#{solicitud.id}</strong> sigue reservada en
              estado <span className="font-semibold text-amber-800">«Pago pendiente»</span>. Puedes
              completar el pago cuando lo desees para coordinar el retiro.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md bg-canvas px-3 py-2 text-xs border border-line/60">
            <span className="text-slate">Monto por pagar:</span>
            <span className="font-bold text-ink">{formatearPrecio(monto)}</span>
          </div>
        </section>

        {/* Alternativa: Enviar a Marketplace sin costo */}
        <section className="rounded-xl border border-gold-300 bg-gold-50/90 p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center gap-2 text-ink">
            <span className="text-lg">🛍️</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold-950">
              ¿No te acomoda el valor del presupuesto?
            </h3>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Puedes ofrecer este artículo <strong>gratis a tus vecinos en el Marketplace</strong>. Reutilizaremos automáticamente la foto y los datos ingresados para que no tengas que escribirlos de nuevo.
          </p>
          <button
            type="button"
            onClick={handleTraspasoMarketplace}
            disabled={traspasando}
            className="btn-gold w-full py-2.5 text-xs font-bold shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>
              {traspasando
                ? 'Cancelando solicitud y traspasando…'
                : 'Publicar gratis en el Marketplace'}
            </span>
            {!traspasando && <span>→</span>}
          </button>
        </section>

        {/* Acciones principales visibles sin scroll */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setEstadoFlujo('formulario')}
            className="btn-primary w-full py-3 text-sm font-bold shadow-sm"
          >
            Reintentar pago
          </button>
          <button
            type="button"
            onClick={() => navigate('/mis-solicitudes')}
            className="w-full text-center py-1.5 text-xs text-slate hover:text-ink transition-colors font-medium"
          >
            Volver a Mis solicitudes
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // FORMULARIO DE PAGO / PASARELA
  // ---------------------------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <BackButton onClick={() => navigate('/mis-solicitudes')} />

      <ScreenHeader
        title="Pago de derechos municipales"
        subtitle="Portal de Pagos · I. Municipalidad de Santo Domingo"
      />

      {/* Resumen del cobro */}
      <section className="card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate">
              Orden de cobro
            </span>
            <p className="text-sm font-bold text-ink">Solicitud #{solicitud.id}</p>
          </div>
          <span className="pill bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold">
            Pago pendiente
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1">
            <span className="text-slate">Servicio:</span>
            <span className="font-semibold text-ink text-right">
              Extracción de residuos voluminosos
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-slate">Ítem:</span>
            <span className="font-semibold text-ink">
              {resumenObjetos(solicitud)}
            </span>
          </div>

          {solicitud.direccionRetiro && (
            <div className="flex justify-between py-1">
              <span className="text-slate">Dirección retiro:</span>
              <span className="font-semibold text-ink text-right max-w-[220px] truncate">
                {solicitud.direccionRetiro}
              </span>
            </div>
          )}

          <div className="flex justify-between py-1">
            <span className="text-slate">Vecino contribuyente:</span>
            <span className="font-semibold text-ink">{sesion?.nombre ?? 'Vecino'}</span>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-2.5 mt-1">
            <span className="text-sm font-bold text-ink">Total a pagar:</span>
            <span className="text-xl font-extrabold text-forest-700">
              {formatearPrecio(monto)}
            </span>
          </div>
        </div>
      </section>

      {/* Medios de pago */}
      <section className="card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Medio de pago</h2>
          <div className="flex items-center gap-1 text-[11px] text-slate font-medium">
            <IconShield className="h-3.5 w-3.5 text-forest-700" />
            <span>Pago seguro Webpay</span>
          </div>
        </div>

        <div className="rounded-lg border-2 border-forest-600 bg-forest-50/40 p-3 flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-forest-800 shrink-0">
            <IconCreditCard className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-bold text-ink">Webpay Plus (Transbank)</p>
            <p className="text-[11px] text-slate mt-0.5">
              Tarjetas de Débito Redcompra y Crédito (Visa, Mastercard, American Express).
            </p>
          </div>
          <span className="text-xs font-bold text-forest-700">✓ Activo</span>
        </div>

        {/* Simulador de demo: botones requeridos para evaluar resultados */}
        <div className="pt-2 space-y-2.5">
          <button
            type="button"
            onClick={simularAprobado}
            className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
          >
            <IconCheck className="h-4 w-4" />
            <span>Simular pago aprobado ({formatearPrecio(monto)})</span>
          </button>

          <button
            type="button"
            onClick={simularAnulado}
            className="w-full rounded-pill border border-line bg-canvas py-2 text-xs font-medium text-slate transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
          >
            Simular pago anulado / cancelado
          </button>
        </div>
      </section>
    </div>
  );
}
