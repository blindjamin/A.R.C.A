import { useEffect, useState } from 'react';
import {
  crearLoteDerivacion,
  descargarExcelLote,
  fetchLotesDerivacion,
  fetchResumenDerivacion,
  mensajeDeError,
  type LoteDerivacion,
  type ResumenDerivacion,
} from '../api/admin';
import { EmptyState } from '../components/ui';

// Entrega de solicitudes a la empresa operadora (docs/specs/SPEC-derivacion-excel.md).

const formatoFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function Derivacion() {
  const [resumen, setResumen] = useState<ResumenDerivacion | null>(null);
  const [lotes, setLotes] = useState<LoteDerivacion[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = () =>
    Promise.all([fetchResumenDerivacion(), fetchLotesDerivacion()])
      .then(([r, l]) => {
        setResumen(r);
        setLotes(l);
      })
      .catch((e) => setError(mensajeDeError(e)));

  useEffect(() => {
    let cancelado = false;
    Promise.all([fetchResumenDerivacion(), fetchLotesDerivacion()])
      .then(([r, l]) => {
        if (cancelado) return;
        setResumen(r);
        setLotes(l);
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const generar = async () => {
    setTrabajando(true);
    setError(null);
    setAviso(null);
    try {
      const lote = await crearLoteDerivacion();
      setConfirmando(false);
      await descargarExcelLote(lote.id);
      setAviso(
        `Lote #${lote.id} generado con ${lote.cantidad} ${lote.cantidad === 1 ? 'solicitud' : 'solicitudes'}. Se descargó el Excel.`,
      );
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
      await cargar();
    } finally {
      setTrabajando(false);
    }
  };

  const descargar = async (id: number) => {
    setError(null);
    try {
      await descargarExcelLote(id);
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  const listas = resumen?.listas ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Derivación a la empresa</h1>
        <p className="text-sm text-slate">
          Genera un Excel con las solicitudes aprobadas para la empresa que
          realiza los retiros. Las solicitudes incluidas pasan a «Derivada».
        </p>
      </header>

      <div className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Indicador
            valor={resumen ? String(listas) : '…'}
            etiqueta="listas para derivar"
          />
          <Indicador
            valor={resumen ? String(resumen.bloqueadasPorPago) : '…'}
            etiqueta="esperan el pago del vecino"
          />
        </div>

        {confirmando ? (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Se crea un lote con{' '}
              <strong>
                {listas} {listas === 1 ? 'solicitud' : 'solicitudes'}
              </strong>
              , que pasan a «Derivada», y se descarga el Excel. La descarga queda
              registrada en la auditoría. ¿Continuar?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={trabajando}
                onClick={generar}
              >
                {trabajando ? 'Generando…' : 'Confirmar'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={trabajando}
                onClick={() => setConfirmando(false)}
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={listas === 0}
            onClick={() => setConfirmando(true)}
          >
            Generar lote y descargar Excel
          </button>
        )}

        {aviso && <p className="text-sm text-green-700">{aviso}</p>}
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <p className="text-xs text-slate-2">
          El Excel no incluye fotos ni datos que identifiquen al vecino.
        </p>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-bold">Lotes generados</h2>
        {lotes.length === 0 ? (
          <EmptyState message="Todavía no se ha generado ningún lote." />
        ) : (
          <ul className="divide-y divide-line-2">
            {lotes.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    Lote #{l.id} · {l.cantidad}{' '}
                    {l.cantidad === 1 ? 'solicitud' : 'solicitudes'}
                  </p>
                  <p className="text-xs text-slate-2">
                    {l.generadoPor} · {formatoFecha(l.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost shrink-0"
                  onClick={() => descargar(l.id)}
                >
                  Descargar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Indicador({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-lg bg-line-2/40 p-4">
      <p className="text-3xl font-extrabold text-ink">{valor}</p>
      <p className="text-xs text-slate">{etiqueta}</p>
    </div>
  );
}
