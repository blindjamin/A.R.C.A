import { useEffect, useState } from 'react';
import {
  corregirCategoria,
  crearNota,
  ETIQUETA_MOTIVO,
  fetchNotas,
  fetchResiduos,
  fetchRevisiones,
  mensajeDeError,
  ITEMS_CHECKLIST_APROBACION,
  MOTIVOS_POR_DECISION,
  revisarSolicitud,
  type MotivoRevision,
  type NotaSolicitud,
  type ResiduoResumen,
  type RevisionHistorial,
  type SolicitudDetalle,
} from '../api/admin';

// Tarjeta «Revisión», historial y notas internas del detalle de una solicitud
// (docs/specs/SPEC-revision-solicitudes.md §2.4).

type DecisionConFormulario = keyof typeof MOTIVOS_POR_DECISION;

const ETIQUETA_DECISION: Record<RevisionHistorial['decision'], string> = {
  aprobada: 'Aprobada',
  requiere_modificacion: 'Modificación pedida',
  rechazada: 'Rechazada',
};

const formatoFecha = (iso: string): string =>
  new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export function TarjetaRevision({
  solicitud,
  soloLectura,
  onCambio,
}: {
  solicitud: SolicitudDetalle;
  /** Otro funcionario tiene la toma: se ve, pero no se decide. */
  soloLectura: boolean;
  onCambio: () => void;
}) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [formulario, setFormulario] = useState<DecisionConFormulario | null>(
    null,
  );
  const [motivo, setMotivo] = useState<MotivoRevision | ''>('');
  const [comentario, setComentario] = useState('');
  const [montoFinal, setMontoFinal] = useState<number | ''>(
    solicitud.monto ?? solicitud.residuoCatalogo?.precio ?? '',
  );
  const [residuos, setResiduos] = useState<ResiduoResumen[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetchResiduos()
      .then((r) => {
        if (!cancelado) setResiduos(r);
      })
      .catch(() => {
        // Sin catálogo solo se pierde el selector; la revisión sigue.
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const checklistCompleto = ITEMS_CHECKLIST_APROBACION.every(
    (i) => checklist[i.id],
  );
  const requiereMontoManual = !solicitud.residuoCatalogoId;
  const faltaMontoObligatorio =
    requiereMontoManual && (montoFinal === '' || Number(montoFinal) <= 0);
  const exigeComentario =
    formulario === 'requiere_modificacion' || motivo === 'otro';
  const formularioValido =
    !!motivo && (!exigeComentario || comentario.trim().length > 0);

  const ejecutar = async (accion: () => Promise<unknown>) => {
    setGuardando(true);
    setError(null);
    try {
      await accion();
      onCambio();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const aprobar = () =>
    ejecutar(() =>
      revisarSolicitud(solicitud.id, {
        decision: 'aprobada',
        checklist,
        montoFinal: montoFinal === '' ? undefined : Number(montoFinal),
      }),
    );

  const enviarFormulario = () => {
    if (!formulario || !motivo) return;
    return ejecutar(() =>
      revisarSolicitud(solicitud.id, {
        decision: formulario,
        motivo,
        comentario: comentario.trim() || undefined,
      }),
    );
  };

  const abrirFormulario = (decision: DecisionConFormulario) => {
    setFormulario(decision);
    setMotivo('');
    setComentario('');
    setError(null);
  };

  const deshabilitado = soloLectura || guardando;

  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-bold">Revisión</h2>

      {solicitud.nombreResiduoOtro && !solicitud.residuoCatalogoId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="font-semibold">Residuo fuera de catálogo:</span> el vecino ingresó «{solicitud.nombreResiduoOtro}». Puedes clasificarlo en el catálogo a continuación si corresponde, o dejarlo y fijar su tarifa.
        </div>
      )}

      <label className="block space-y-1 text-sm">
        <span className="text-xs uppercase tracking-wide text-slate-2">
          Categoría del residuo
        </span>
        <select
          className="field w-full"
          value={solicitud.residuoCatalogoId ?? ''}
          disabled={deshabilitado || residuos.length === 0}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val > 0) {
              ejecutar(() => corregirCategoria(solicitud.id, val));
            }
          }}
        >
          {solicitud.nombreResiduoOtro && !solicitud.residuoCatalogoId && (
            <option value="">(Sin catalogar · {solicitud.nombreResiduoOtro})</option>
          )}
          {residuos.length === 0 && (
            <option value={solicitud.residuoCatalogoId ?? ''}>
              {solicitud.residuoCatalogo?.nombre ?? 'Cargando catálogo…'}
            </option>
          )}
          {residuos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.categoria} · {r.nombre}
            </option>
          ))}
        </select>
      </label>

      {formulario ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold">
            {formulario === 'rechazada'
              ? 'Rechazar solicitud'
              : 'Pedir modificación al vecino'}
          </p>
          <label className="block space-y-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-2">
              Motivo
            </span>
            <select
              className="field w-full"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoRevision)}
            >
              <option value="">Elige un motivo</option>
              {MOTIVOS_POR_DECISION[formulario].map((m) => (
                <option key={m} value={m}>
                  {ETIQUETA_MOTIVO[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-xs uppercase tracking-wide text-slate-2">
              Comentario para el vecino{exigeComentario ? '' : ' (opcional)'}
            </span>
            <textarea
              className="field min-h-24 w-full"
              maxLength={1000}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!formularioValido || guardando}
              onClick={enviarFormulario}
            >
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              className="btn-ghost text-black hover:text-green-800"
              disabled={guardando}
              onClick={() => setFormulario(null)}
            >
              Volver
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-line bg-canvas p-3.5 space-y-1.5">
            <label className="block text-xs uppercase tracking-wide text-slate-2 font-bold">
              Presupuesto / Valor a cobrar al vecino ($ CLP)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate">$</span>
              <input
                type="number"
                min="1"
                max="5000000"
                step="500"
                className="field flex-1"
                placeholder={
                  solicitud.residuoCatalogo?.precio !== undefined
                    ? String(solicitud.residuoCatalogo.precio)
                    : 'Ej: 5000'
                }
                value={montoFinal}
                disabled={deshabilitado}
                onChange={(e) =>
                  setMontoFinal(
                    e.target.value === '' ? '' : Math.max(1, Number(e.target.value)),
                  )
                }
              />
            </div>
            <p className="text-[11px] text-slate">
              {requiereMontoManual
                ? '⚠️ Residuo no tipificado en catálogo: es obligatorio fijar un valor definitivo (> $0) para el vecino antes de aprobar.'
                : `Precio sugerido por catálogo: $${(solicitud.residuoCatalogo?.precio ?? 0).toLocaleString('es-CL')}. Puedes modificarlo antes de aprobar.`}
            </p>
          </div>

          <fieldset className="space-y-2" disabled={deshabilitado}>
            <legend className="mb-1 text-xs uppercase tracking-wide text-slate-2">
              Lista de verificación para aprobar
            </legend>
            {ITEMS_CHECKLIST_APROBACION.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!checklist[item.id]}
                  onChange={(e) =>
                    setChecklist((c) => ({ ...c, [item.id]: e.target.checked }))
                  }
                />
                {item.label}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={deshabilitado || !checklistCompleto || faltaMontoObligatorio}
              onClick={aprobar}
              title={
                faltaMontoObligatorio
                  ? 'Debes fijar un presupuesto (> $0) para aprobar un residuo fuera de catálogo'
                  : undefined
              }
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={deshabilitado}
              onClick={() => abrirFormulario('requiere_modificacion')}
              className="pill border border-green-700 px-4 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Pedir modificación
            </button>
            <button
              type="button"
              disabled={deshabilitado}
              onClick={() => abrirFormulario('rechazada')}
              className="pill border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function HistorialYNotas({
  solicitudId,
  version,
}: {
  solicitudId: number;
  /** Cambia cuando la solicitud se actualizó y hay que recargar. */
  version: number;
}) {
  const [revisiones, setRevisiones] = useState<RevisionHistorial[]>([]);
  const [notas, setNotas] = useState<NotaSolicitud[]>([]);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = () =>
    Promise.all([fetchRevisiones(solicitudId), fetchNotas(solicitudId)])
      .then(([r, n]) => {
        setRevisiones(r);
        setNotas(n);
      })
      .catch((e) => setError(mensajeDeError(e)));

  useEffect(() => {
    let cancelado = false;
    Promise.all([fetchRevisiones(solicitudId), fetchNotas(solicitudId)])
      .then(([r, n]) => {
        if (cancelado) return;
        setRevisiones(r);
        setNotas(n);
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, [solicitudId, version]);

  const agregarNota = async () => {
    setGuardando(true);
    setError(null);
    try {
      await crearNota(solicitudId, texto.trim());
      setTexto('');
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card space-y-3 p-5">
        <h2 className="font-bold">Historial de revisiones</h2>
        {revisiones.length === 0 ? (
          <p className="text-sm text-slate">Todavía no hay revisiones.</p>
        ) : (
          <ul className="space-y-3">
            {revisiones.map((r) => (
              <li key={r.id} className="text-sm">
                <p className="font-semibold">
                  {ETIQUETA_DECISION[r.decision]}
                  {r.motivo && ` · ${ETIQUETA_MOTIVO[r.motivo]}`}
                </p>
                {r.comentario && <p className="text-ink">«{r.comentario}»</p>}
                <p className="text-xs text-slate-2">
                  {r.revisor} · {formatoFecha(r.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-bold">Notas internas</h2>
        <p className="text-xs text-slate-2">
          Solo las ve el equipo municipal; el vecino no.
        </p>
        <textarea
          className="field min-h-20 w-full text-sm"
          maxLength={2000}
          placeholder="Agregar una nota"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={guardando || texto.trim().length === 0}
          onClick={agregarNota}
        >
          {guardando ? 'Guardando…' : 'Agregar nota'}
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <ul className="space-y-3">
          {notas.map((n) => (
            <li key={n.id} className="text-sm">
              <p className="whitespace-pre-wrap text-ink">{n.texto}</p>
              <p className="text-xs text-slate-2">
                {n.autor} · {formatoFecha(n.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
