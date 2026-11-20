import { useEffect, useState } from 'react';
import { mensajeDeError } from '../api/admin';
import { cambiarBloqueo, obtenerBloqueo, type EstadoBloqueo } from '../api/denuncias';
import { formatoFechaHora } from '../fechas';
import { IconShield } from '../../components/ui/Icons';

const MOTIVO_MAX = 500;

/** Estado de bloqueo del denunciado y, para el administrador, bloquear o desbloquear (HU-18). */
export default function BloqueoDenunciado({ denunciaId }: { denunciaId: number }) {
  const [estado, setEstado] = useState<EstadoBloqueo | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerBloqueo(denunciaId)
      .then((r) => !cancelado && setEstado(r))
      .catch((e: unknown) => !cancelado && setError(mensajeDeError(e)));
    return () => {
      cancelado = true;
    };
  }, [denunciaId]);

  const confirmar = async () => {
    if (!estado) return;
    if (!motivo.trim()) {
      setError('Escribe el motivo antes de continuar.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      setEstado(
        await cambiarBloqueo(
          denunciaId,
          estado.bloqueado ? 'desbloqueo' : 'bloqueo',
          motivo.trim(),
        ),
      );
      setAbierto(false);
      setMotivo('');
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => {
    setAbierto(false);
    setMotivo('');
    setError(null);
  };

  return (
    <section className="card space-y-3 p-5" aria-labelledby="bloqueo-titulo">
      <div className="flex items-start justify-between gap-2">
        <h2 id="bloqueo-titulo" className="flex items-center gap-2 font-bold">
          <IconShield className="h-5 w-5" aria-hidden="true" />
          Bloqueo del denunciado
        </h2>
        {estado && (
          <span
            className={`pill ${
              estado.bloqueado ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {estado.bloqueado ? 'Bloqueado' : 'Sin bloqueo'}
          </span>
        )}
      </div>

      {estado?.bloqueado && (
        <p className="text-sm text-ink">
          Bloqueado el {estado.fecha ? formatoFechaHora(estado.fecha) : '—'}. Motivo:{' '}
          <span className="break-words">{estado.motivo}</span>
        </p>
      )}

      {estado && !estado.puedeBloquear && (
        <p className="text-xs text-slate-2">Solo un administrador puede bloquear.</p>
      )}

      {estado?.puedeBloquear && !abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className={`pill min-h-[44px] border px-4 py-2 text-sm ${
            estado.bloqueado
              ? 'border-green-700 text-green-700 hover:bg-green-50'
              : 'border-rose-300 bg-rose-50 text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white'
          }`}
        >
          {estado.bloqueado ? 'Desbloquear' : 'Bloquear vecino'}
        </button>
      )}

      {estado?.puedeBloquear && abierto && (
        <div className="space-y-2">
          <label htmlFor="motivo-bloqueo" className="block text-sm font-semibold">
            Motivo{' '}
            <span className="font-normal text-slate">
              (obligatorio; lo ve el vecino y queda en el historial)
            </span>
          </label>
          <textarea
            id="motivo-bloqueo"
            rows={3}
            maxLength={MOTIVO_MAX}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="field w-full text-sm"
          />
          <p className="text-right text-xs text-slate-2">
            {motivo.length}/{MOTIVO_MAX}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={confirmar}
              className="pill min-h-[44px] border border-green-700 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
            >
              {guardando
                ? 'Guardando…'
                : estado.bloqueado
                  ? 'Confirmar desbloqueo'
                  : 'Confirmar bloqueo'}
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={cancelar}
              className="pill min-h-[44px] border border-line px-4 py-2 text-sm text-slate hover:bg-canvas"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p role="alert" aria-live="polite" className="text-sm text-rose-600">
        {error}
      </p>
    </section>
  );
}
