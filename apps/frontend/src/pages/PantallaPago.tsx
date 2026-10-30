import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import {
  cancelarSolicitud,
  fetchSolicitud,
  formatearPrecio,
  resumenObjetos,
  type SolicitudRetiro,
} from '../api/arca';
import {
  fetchComprobante,
  iniciarPago,
  irAWebpay,
  type ComprobantePago,
  type ResultadoPago,
} from '../api/pagos';
import {
  BackButton,
  IconBuilding,
  IconCheck,
  IconCreditCard,
  IconShield,
  IconX,
  ScreenHeader,
} from '../components/ui';
import { mensajeDeError } from '../features/marketplace/formato';

// HU-44: el cobro real va por Webpay Plus. Esta pantalla inicia el pago y, a la
// vuelta (`?resultado=`), muestra lo que confirmó el backend, nunca lo que dice
// la URL: el resultado de la query solo elige el texto si el pago no quedó.

const MOTIVO_NO_PAGADO: Record<Exclude<ResultadoPago, 'aprobado'>, string> = {
  anulado: 'Cancelaste el pago en Webpay.',
  agotado: 'Se agotó el tiempo para completar el pago.',
  rechazado: 'Webpay no autorizó el pago.',
};

const esResultado = (valor: string | null): valor is ResultadoPago =>
  valor === 'aprobado' || valor === 'anulado' || valor === 'agotado' || valor === 'rechazado';

export default function PantallaPago() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { sesion } = useSession();

  const solicitudId = Number(id);
  const idValido = Number.isInteger(solicitudId) && solicitudId > 0;
  const solicitudInicial = (location.state as { solicitud?: SolicitudRetiro } | undefined)
    ?.solicitud;
  const resultadoVuelta = params.get('resultado');

  const [solicitud, setSolicitud] = useState<SolicitudRetiro | null>(solicitudInicial ?? null);
  const [comprobante, setComprobante] = useState<ComprobantePago | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(
    idValido ? null : 'Identificador de solicitud no válido',
  );
  const [cargando, setCargando] = useState(idValido);
  const [redirigiendo, setRedirigiendo] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [reintentar, setReintentar] = useState(false);
  const [traspasando, setTraspasando] = useState(false);

  useEffect(() => {
    if (!idValido) return;
    let vigente = true;
    Promise.all([
      solicitudInicial ? Promise.resolve(solicitudInicial) : fetchSolicitud(solicitudId),
      fetchComprobante(solicitudId),
    ])
      .then(([s, c]) => {
        if (!vigente) return;
        setSolicitud(s);
        setComprobante(c);
      })
      .catch((err: Error) => vigente && setErrorCarga(mensajeDeError(err)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [idValido, solicitudId, solicitudInicial]);

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

  const monto = comprobante?.monto ?? solicitud.monto ?? 0;
  const pagado = comprobante?.estadoPago === 'pagado';
  const noPagado =
    !pagado && !reintentar && esResultado(resultadoVuelta) && resultadoVuelta !== 'aprobado'
      ? resultadoVuelta
      : null;

  const pagar = async () => {
    setRedirigiendo(true);
    setErrorPago(null);
    try {
      irAWebpay(await iniciarPago(solicitud.id));
    } catch (err) {
      setErrorPago(mensajeDeError(err));
      setRedirigiendo(false);
    }
  };

  const handleTraspasoMarketplace = async () => {
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
  // PANTALLA RESULTADO: PAGADO
  // ---------------------------------------------------------------------------
  if (pagado) {
    const fecha = comprobante?.fecha
      ? new Date(comprobante.fecha).toLocaleString('es-CL', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '—';
    return (
      <div className="mx-auto flex w-full max-w-md flex-col justify-between space-y-4 py-1">
        <div className="flex items-center justify-between text-[11px] text-slate border-b border-line pb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <IconBuilding className="h-3.5 w-3.5 text-forest-700" />
            <span>I. Municipalidad de Santo Domingo</span>
          </span>
          <span className="font-semibold text-forest-700">Webpay Plus</span>
        </div>

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
              Transbank autorizó el pago de tu solicitud.
            </p>
          </div>
        </div>

        <section className="card p-4 space-y-3 border border-line bg-white shadow-xs">
          <div className="flex items-baseline justify-between border-b border-line/60 pb-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Total pagado
              </span>
              <p className="text-xl font-extrabold text-forest-700 mt-0.5">
                {formatearPrecio(monto)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Orden de compra
              </span>
              <p className="font-mono text-xs font-semibold text-ink mt-0.5">
                {comprobante?.orden ?? '—'}
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
                Código de autorización
              </span>
              <p className="font-mono text-xs text-ink mt-0.5">
                {comprobante?.codigoAutorizacion ?? '—'}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate">
                Fecha
              </span>
              <p className="font-medium text-ink truncate mt-0.5">{fecha}</p>
            </div>
          </div>

          <div className="rounded-md bg-emerald-50/70 p-2.5 text-[11px] text-emerald-900 border border-emerald-200/60 leading-snug">
            ✓ Tu solicitud pasa a coordinación con la empresa de retiro.
          </div>
        </section>

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
  // PANTALLA RESULTADO: NO PAGADO (anulado, agotado o rechazado)
  // ---------------------------------------------------------------------------
  if (noPagado) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col justify-between space-y-4 py-1">
        <div className="flex items-center justify-between text-[11px] text-slate border-b border-line pb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <IconBuilding className="h-3.5 w-3.5 text-slate" />
            <span>I. Municipalidad de Santo Domingo</span>
          </span>
          <span className="font-semibold text-slate">Webpay</span>
        </div>

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
            <p className="text-xs text-slate truncate">{MOTIVO_NO_PAGADO[noPagado]}</p>
          </div>
        </div>

        <section className="card p-4 space-y-3 border border-line bg-white shadow-xs">
          <div className="space-y-1.5 text-xs text-slate leading-relaxed">
            <p>
              <strong className="text-ink">No se hizo ningún cobro</strong> a tu tarjeta.
            </p>
            <p>
              Tu solicitud <strong className="text-ink">#{solicitud.id}</strong> sigue aprobada y
              con el pago pendiente. Puedes pagar cuando quieras para coordinar el retiro.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md bg-canvas px-3 py-2 text-xs border border-line/60">
            <span className="text-slate">Monto por pagar:</span>
            <span className="font-bold text-ink">{formatearPrecio(monto)}</span>
          </div>
        </section>

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
            onClick={() => void handleTraspasoMarketplace()}
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

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setReintentar(true)}
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
  // INICIO DEL PAGO
  // ---------------------------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <BackButton onClick={() => navigate('/mis-solicitudes')} />

      <ScreenHeader
        title="Pago de derechos municipales"
        subtitle="Portal de Pagos · I. Municipalidad de Santo Domingo"
      />

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

          <div className="flex items-center justify-between border-t border-line pt-2.5 mt-1">
            <span className="text-sm font-bold text-ink">Total a pagar:</span>
            <span className="text-xl font-extrabold text-forest-700">
              {formatearPrecio(monto)}
            </span>
          </div>
        </div>
      </section>

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
              Tarjetas de débito y crédito. Te llevaremos al sitio de Webpay y volverás aquí al
              terminar.
            </p>
          </div>
        </div>

        {errorPago && (
          <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorPago}
          </p>
        )}

        <button
          type="button"
          onClick={() => void pagar()}
          disabled={redirigiendo}
          className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
        >
          <IconCreditCard className="h-4 w-4" />
          <span>
            {redirigiendo
              ? 'Conectando con Webpay…'
              : `Pagar ${formatearPrecio(monto)} con Webpay`}
          </span>
        </button>
      </section>
    </div>
  );
}
