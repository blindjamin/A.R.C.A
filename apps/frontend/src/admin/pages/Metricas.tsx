import { useEffect, useState } from 'react';
import {
  ETIQUETA_MOTIVO,
  fetchMetricas,
  formatearPrecio,
  mensajeDeError,
  type Metricas as DatosMetricas,
  type RangoMetricas,
} from '../api/admin';

// Indicadores agregados de la gestión (docs/specs/SPEC-dashboard-metricas.md).
// Barras hechas con CSS: no se agrega una librería de gráficos para esto.

const RANGOS: { dias: RangoMetricas; label: string }[] = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
];

const ETIQUETA_DECISION = {
  aprobada: 'Aprobadas',
  requiere_modificacion: 'Modificación pedida',
  rechazada: 'Rechazadas',
} as const;

const formatoDia = (fecha: string): string => {
  const [, mes, dia] = fecha.split('-');
  return `${dia}/${mes}`;
};

const formatoHoras = (horas: number | null): string => {
  if (horas === null) return '—';
  if (horas < 48) return `${horas} h`;
  return `${Math.round((horas / 24) * 10) / 10} días`;
};

export default function Metricas() {
  const [dias, setDias] = useState<RangoMetricas>(30);
  const [datos, setDatos] = useState<DatosMetricas | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetchMetricas(dias)
      .then((m) => {
        if (!cancelado) {
          setDatos(m);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDeError(e));
      });
    return () => {
      cancelado = true;
    };
  }, [dias]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Métricas</h1>
          <p className="text-sm text-slate">
            {datos
              ? `Del ${formatoDia(datos.desde)} al ${formatoDia(datos.hasta)}.`
              : 'Cómo va la gestión de solicitudes.'}
          </p>
        </div>
        <div className="flex gap-2">
          {RANGOS.map((r) => (
            <button
              key={r.dias}
              type="button"
              onClick={() => setDias(r.dias)}
              className={`pill ${
                dias === r.dias
                  ? 'bg-green-700 text-white'
                  : 'bg-line-2 text-slate'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!datos ? (
        !error && <p className="text-slate">Cargando métricas…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta valor={datos.recibidas} etiqueta="solicitudes recibidas" />
            <Tarjeta
              valor={datos.cola.enRevision}
              etiqueta="en revisión ahora"
              detalle={
                datos.cola.atrasadas > 0
                  ? `${datos.cola.atrasadas} con más de 48 h`
                  : undefined
              }
              alerta={datos.cola.atrasadas > 0}
            />
            <Tarjeta
              valor={formatoHoras(datos.horasPromedioRevision)}
              etiqueta="espera promedio hasta la primera revisión"
            />
            <Tarjeta
              valor={formatearPrecio(datos.recaudacion)}
              etiqueta="pagos registrados (maqueta)"
            />
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-bold">Solicitudes recibidas por día</h2>
            <SerieDiaria serie={datos.serieDiaria} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card space-y-3 p-5">
              <h2 className="font-bold">Decisiones de revisión</h2>
              <Barras
                filas={Object.entries(ETIQUETA_DECISION).map(
                  ([clave, label]) => ({
                    label,
                    total:
                      datos.decisiones[clave as keyof typeof ETIQUETA_DECISION] ??
                      0,
                  }),
                )}
              />
              <h3 className="pt-2 text-sm font-semibold">Motivos más usados</h3>
              <Barras
                filas={datos.motivos.map((m) => ({
                  label: ETIQUETA_MOTIVO[m.motivo] ?? m.motivo,
                  total: m.total,
                }))}
                vacio="Sin motivos registrados en el rango."
              />
            </div>

            <div className="card space-y-3 p-5">
              <h2 className="font-bold">Por categoría de residuo</h2>
              <Barras
                filas={datos.porCategoria.map((c) => ({
                  label: c.categoria,
                  total: c.total,
                }))}
                vacio="Sin solicitudes en el rango."
              />
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <h2 className="font-bold">Derivación a la empresa</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tarjeta valor={datos.derivacion.lotes} etiqueta="lotes generados" />
              <Tarjeta
                valor={datos.derivacion.derivadas}
                etiqueta="solicitudes derivadas"
              />
              <Tarjeta
                valor={datos.derivacion.retiradas}
                etiqueta="retiradas"
              />
              <Tarjeta
                valor={datos.derivacion.noRealizadas}
                etiqueta="no realizadas"
                alerta={datos.derivacion.noRealizadas > 0}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Tarjeta({
  valor,
  etiqueta,
  detalle,
  alerta,
}: {
  valor: number | string;
  etiqueta: string;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-3xl font-extrabold text-ink">{valor}</p>
      <p className="text-xs text-slate">{etiqueta}</p>
      {detalle && (
        <p
          className={`mt-1 text-xs font-semibold ${
            alerta ? 'text-rose-600' : 'text-slate-2'
          }`}
        >
          {detalle}
        </p>
      )}
    </div>
  );
}

function Barras({
  filas,
  vacio = 'Sin datos en el rango.',
}: {
  filas: { label: string; total: number }[];
  vacio?: string;
}) {
  const maximo = Math.max(0, ...filas.map((f) => f.total));
  if (filas.length === 0 || maximo === 0) {
    return <p className="text-sm text-slate">{vacio}</p>;
  }

  return (
    <ul className="space-y-2">
      {filas.map((f) => (
        <li key={f.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-ink">{f.label}</span>
            <span className="font-semibold">{f.total}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-line-2">
            <div
              className="h-2 rounded-full bg-green-700"
              style={{ width: `${(f.total / maximo) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SerieDiaria({ serie }: { serie: { fecha: string; total: number }[] }) {
  const maximo = Math.max(1, ...serie.map((p) => p.total));

  return (
    <div>
      <div className="flex h-32 items-end gap-px">
        {serie.map((p) => (
          <div
            key={p.fecha}
            title={`${formatoDia(p.fecha)}: ${p.total}`}
            className="flex-1 rounded-t bg-green-700/80"
            style={{
              height: `${(p.total / maximo) * 100}%`,
              minHeight: p.total > 0 ? '4px' : '1px',
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-2">
        <span>{formatoDia(serie[0]?.fecha ?? '')}</span>
        <span>{formatoDia(serie.at(-1)?.fecha ?? '')}</span>
      </div>
    </div>
  );
}
