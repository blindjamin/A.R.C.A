import { useEffect, useState } from 'react';
import { mensajeDeError } from '../api/admin';
import {
  cambiarEstadoDenuncia,
  etiquetaMotivo,
  listarDenuncias,
  obtenerDenuncia,
  type DenunciaDetalle,
  type DenunciaResumen,
  type EstadoDenuncia,
} from '../api/denuncias';
import { BackButton, EmptyState } from '../components/ui';
import { formatoFechaHora } from '../fechas';
import { IconFlag, IconCheck, IconX } from '../../components/ui/Icons';

const PESTANAS: { id: string; label: string; estados: EstadoDenuncia[] }[] = [
  { id: 'abiertas', label: 'Abiertas', estados: ['abierta'] },
  { id: 'investigacion', label: 'En investigación', estados: ['investigacion'] },
  { id: 'cerradas', label: 'Cerradas', estados: ['resuelta', 'rechazada'] },
];

const ESTADO: Record<EstadoDenuncia, { label: string; cls: string }> = {
  abierta: { label: 'Abierta', cls: 'bg-amber-100 text-amber-800' },
  investigacion: { label: 'En investigación', cls: 'bg-sky-100 text-sky-800' },
  resuelta: { label: 'Resuelta', cls: 'bg-emerald-100 text-emerald-800' },
  rechazada: { label: 'Rechazada', cls: 'bg-rose-100 text-rose-700' },
};

const ORIGEN: Record<DenunciaResumen['origen'], string> = {
  articulo: 'Artículo',
  perfil: 'Perfil',
  chat: 'Chat',
};

const cuentaDenuncias = (n: number) => `${n} ${n === 1 ? 'denuncia' : 'denuncias'}`;

function EstadoDenunciaPill({ estado }: { estado: EstadoDenuncia }) {
  return <span className={`pill ${ESTADO[estado].cls}`}>{ESTADO[estado].label}</span>;
}

export default function Denuncias() {
  const [pestana, setPestana] = useState(PESTANAS[0]);
  const [items, setItems] = useState<DenunciaResumen[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = () => {
    setLoading(true);
    setError(null);
    listarDenuncias(pestana.estados)
      .then(setItems)
      .catch((e: unknown) => setError(mensajeDeError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelado = false;
    Promise.resolve().then(() => {
      if (!cancelado) cargar();
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana]);

  if (seleccionId !== null) {
    return (
      <DetalleDenuncia
        id={seleccionId}
        onVolver={() => {
          setSeleccionId(null);
          cargar();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Denuncias</h1>
        <p className="text-sm text-slate">
          Revisa las denuncias de vecinos del Marketplace y resuélvelas.
        </p>
      </header>

      <div role="tablist" aria-label="Estado de las denuncias" className="flex flex-wrap gap-2">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana.id === p.id}
            onClick={() => setPestana(p)}
            className={`pill min-h-[44px] shrink-0 border px-4 ${
              pestana.id === p.id
                ? 'border-transparent bg-green-700 text-white'
                : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate">Cargando denuncias…</p>
      ) : error ? (
        <p className="text-rose-600">{error}</p>
      ) : items.length === 0 ? (
        <EmptyState message="No hay denuncias en este estado." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">Denuncias: {pestana.label}</caption>
            <thead className="border-b border-line text-xs uppercase tracking-wide text-slate-2">
              <tr>
                <th scope="col" className="p-3">Fecha</th>
                <th scope="col" className="p-3">Motivo</th>
                <th scope="col" className="p-3">Origen</th>
                <th scope="col" className="p-3">Denunciante</th>
                <th scope="col" className="p-3">Denunciado</th>
                <th scope="col" className="p-3">Artículo</th>
                <th scope="col" className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="whitespace-nowrap p-3">
                    <button
                      type="button"
                      onClick={() => setSeleccionId(d.id)}
                      className="min-h-[44px] font-semibold text-green-700 underline-offset-2 hover:underline"
                      aria-label={`Abrir denuncia ${d.id} del ${formatoFechaHora(d.fecha)}`}
                    >
                      {formatoFechaHora(d.fecha)}
                    </button>
                  </td>
                  <td className="p-3">{etiquetaMotivo(d.motivo)}</td>
                  <td className="p-3">{ORIGEN[d.origen]}</td>
                  <td className="p-3">{d.denuncianteNombre}</td>
                  <td className="p-3">
                    {d.denunciadoNombre}{' '}
                    <span
                      className={
                        d.denunciasDelDenunciado > 1
                          ? 'pill bg-rose-100 text-rose-700 text-[10px] font-bold'
                          : 'text-xs text-slate'
                      }
                    >
                      {cuentaDenuncias(d.denunciasDelDenunciado)}
                    </span>
                  </td>
                  <td className="p-3">{d.articuloTitulo ?? '—'}</td>
                  <td className="p-3">
                    <EstadoDenunciaPill estado={d.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Detalle + acciones -----------------------------------------------------

function DetalleDenuncia({ id, onVolver }: { id: number; onVolver: () => void }) {
  const [d, setD] = useState<DenunciaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [resolucion, setResolucion] = useState('');
  const [errorResolucion, setErrorResolucion] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerDenuncia(id)
      .then((r) => !cancelado && setD(r))
      .catch((e: unknown) => !cancelado && setError(mensajeDeError(e)))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [id]);

  const cambiar = async (estado: 'investigacion' | 'resuelta' | 'rechazada') => {
    if (estado !== 'investigacion' && !resolucion.trim()) {
      setErrorResolucion('Escribe la resolución antes de continuar.');
      return;
    }
    setGuardando(true);
    setError(null);
    setErrorResolucion(null);
    try {
      await cambiarEstadoDenuncia(id, {
        estado,
        resolucion: resolucion.trim() || undefined,
      });
      // Vuelve a la lista, que se refresca en onVolver.
      onVolver();
    } catch (e) {
      setError(mensajeDeError(e));
      setGuardando(false);
    }
  };

  if (!d) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <BackButton onClick={onVolver}>← Volver al listado</BackButton>
        {error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : cargando ? (
          <p className="text-slate">Cargando denuncia…</p>
        ) : (
          <p className="text-slate">No se encontró la denuncia.</p>
        )}
      </div>
    );
  }

  const cerrada = d.estado === 'resuelta' || d.estado === 'rechazada';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <BackButton onClick={onVolver}>← Volver al listado</BackButton>

      <div className="card space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold">
              <IconFlag className="h-5 w-5 text-rose-600" aria-hidden="true" />
              Denuncia #{d.id}
            </h1>
            <p className="text-sm text-slate">{etiquetaMotivo(d.motivo)}</p>
          </div>
          <EstadoDenunciaPill estado={d.estado} />
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Dato label="Fecha" valor={formatoFechaHora(d.fecha)} />
          <Dato label="Origen" valor={ORIGEN[d.origen]} />
          <Dato label="Denunciante" valor={d.denuncianteNombre} />
          <Dato
            label="Denunciado"
            valor={`${d.denunciadoNombre} · ${cuentaDenuncias(d.denunciasDelDenunciado)}`}
            alerta={d.denunciasDelDenunciado > 1}
          />
          <Dato label="Artículo" valor={d.articuloTitulo} />
          <Dato label="Descripción" valor={d.descripcion} full />
          {cerrada && (
            <>
              <Dato label="Resolución" valor={d.resolucion} full />
              <Dato
                label="Cierre"
                valor={d.fechaResolucion ? formatoFechaHora(d.fechaResolucion) : null}
              />
            </>
          )}
        </dl>
      </div>

      {d.mensajes.length > 0 && (
        <section className="card space-y-3 p-5" aria-labelledby="conv-titulo">
          <h2 id="conv-titulo" className="font-bold">Mensajes adjuntos</h2>
          <ul className="space-y-2">
            {d.mensajes.map((m, i) => {
              const denunciante = m.deQuien === 'denunciante';
              return (
                <li key={i} className={`flex ${denunciante ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      denunciante ? 'bg-canvas text-ink' : 'bg-rose-50 text-rose-900'
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide">
                      {denunciante ? 'Denunciante' : 'Denunciado'}
                    </p>
                    <p className="break-words">{m.contenido}</p>
                    <p className="mt-0.5 text-[10px] text-slate-2">{formatoFechaHora(m.fecha)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-2">
            Copia de los mensajes que marcó el denunciante, no la conversación completa.
          </p>
        </section>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!cerrada && (
        <div className="card space-y-3 p-5">
          <h2 className="font-bold">Acciones</h2>
          <div>
            <label htmlFor="resolucion" className="block text-sm font-semibold">
              Resolución{' '}
              <span className="font-normal text-slate">(obligatoria para aprobar o rechazar)</span>
            </label>
            <textarea
              id="resolucion"
              rows={3}
              maxLength={500}
              value={resolucion}
              onChange={(e) => setResolucion(e.target.value)}
              aria-invalid={errorResolucion !== null}
              aria-describedby={errorResolucion ? 'resolucion-error' : undefined}
              className="field mt-1 w-full text-sm"
            />
            {errorResolucion && (
              <p id="resolucion-error" role="alert" className="mt-1 text-xs text-rose-600">
                {errorResolucion}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {d.estado === 'abierta' && (
              <button
                type="button"
                disabled={guardando}
                onClick={() => cambiar('investigacion')}
                className="pill min-h-[44px] border border-sky-600 px-4 py-2 text-sm text-sky-700 hover:bg-sky-50"
              >
                En investigación
              </button>
            )}
            <button
              type="button"
              disabled={guardando}
              onClick={() => cambiar('resuelta')}
              className="pill flex min-h-[44px] items-center gap-1.5 border border-green-700 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
            >
              <IconCheck className="h-4 w-4" aria-hidden="true" /> Aprobar
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => cambiar('rechazada')}
              className="pill flex min-h-[44px] items-center gap-1.5 border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white"
            >
              <IconX className="h-4 w-4" aria-hidden="true" /> Rechazar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function Dato({
  label,
  valor,
  full,
  alerta,
}: {
  label: string;
  valor?: string | null;
  full?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-xs uppercase tracking-wide text-slate-2">{label}</dt>
      <dd className={`break-words ${alerta ? 'font-bold text-rose-700' : 'text-ink'}`}>
        {valor || '—'}
      </dd>
    </div>
  );
}
