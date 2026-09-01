import { useState } from 'react';
import type { EstadoSolicitud, SolicitudRetiro } from '../api/admin';

type FranjaHoraria = 'manana' | 'tarde' | 'noche' | 'personalizada';

type OperadorDemo = {
  id: string;
  nombre: string;
  turno: string;
};

const OPERADORES_DEMO: OperadorDemo[] = [
  { id: 'op-01', nombre: 'Carlos Rojas', turno: 'Mañana' },
  { id: 'op-02', nombre: 'María Silva', turno: 'Tarde' },
  { id: 'op-03', nombre: 'Tomás Ortega', turno: 'Noche' },
  { id: 'op-04', nombre: 'Valentina Ruiz', turno: 'Administración' },
];

const FRANJAS: Array<{ value: FranjaHoraria; label: string; hora: string }> = [
  { value: 'manana', label: 'Mañana', hora: '09:00' },
  { value: 'tarde', label: 'Tarde', hora: '14:00' },
  { value: 'noche', label: 'Noche', hora: '18:00' },
  { value: 'personalizada', label: 'Personalizada', hora: '10:00' },
];

export type AsignacionRetiroPayload = {
  operadorId: string;
  fechaProgramada: string;
  franja: FranjaHoraria;
  estado: EstadoSolicitud;
};

interface AsignarRetiroModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitud: SolicitudRetiro;
  onConfirm: (payload: AsignacionRetiroPayload) => Promise<void> | void;
}

export default function AsignarRetiroModal({
  isOpen,
  onClose,
  solicitud,
  onConfirm,
}: AsignarRetiroModalProps) {
  const [fecha, setFecha] = useState(
    solicitud.fechaProgramada ? solicitud.fechaProgramada.slice(0, 10) : '',
  );
  const [franja, setFranja] = useState<FranjaHoraria>('manana');
  const [hora, setHora] = useState('09:00');
  const [operadorId, setOperadorId] = useState(
    solicitud.operadorAsignadoId ?? OPERADORES_DEMO[0]?.id ?? '',
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const construirFechaISO = (): string => {
    if (!fecha) {
      throw new Error('Selecciona una fecha para programar el retiro.');
    }

    const selectedFranja = FRANJAS.find((item) => item.value === franja) ?? FRANJAS[0];
    const horaBase = franja === 'personalizada' ? hora : selectedFranja.hora;
    const [hh, mm] = horaBase.split(':').map(Number);
    const [year, month, day] = fecha.split('-').map(Number);

    const fechaLocal = new Date(year, month - 1, day, hh, mm);
    return fechaLocal.toISOString();
  };

  const handleGuardar = async () => {
    if (!fecha) {
      setError('Selecciona una fecha para programar el retiro.');
      return;
    }

    if (!operadorId) {
      setError('Selecciona un operador para asignar el retiro.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await onConfirm({
        operadorId,
        fechaProgramada: construirFechaISO(),
        franja,
        estado: 'asignada',
      });
      onClose();
    } catch (e) {
      setError((e as Error).message || 'No se pudo programar el retiro.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="card w-full max-w-2xl p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-2">
              Programación
            </p>
            <h2 className="text-xl font-extrabold">Asignar retiro #{solicitud.id}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate hover:text-ink"
          >
            Cerrar
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Fecha de retiro
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="field"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Franja horaria
              </label>
              <div className="flex flex-wrap gap-2">
                {FRANJAS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFranja(item.value)}
                    className={`pill ${
                      franja === item.value
                        ? 'bg-green-700 text-white'
                        : 'border border-line bg-white text-slate'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {franja === 'personalizada' && (
                <div className="mt-3">
                  <label className="mb-2 block text-xs uppercase tracking-wide text-slate-2">
                    Hora personalizada
                  </label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="field"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Operador asignado
              </label>
              <select
                value={operadorId}
                onChange={(e) => setOperadorId(e.target.value)}
                className="field"
              >
                <option value="">Selecciona un operador</option>
                {OPERADORES_DEMO.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nombre} · {op.turno}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-line bg-canvas p-3">
              <p className="text-xs uppercase tracking-wide text-slate-2">
                Resumen
              </p>
              <p className="mt-2 text-sm text-ink">
                {fecha || 'Sin fecha'} · {FRANJAS.find((item) => item.value === franja)?.label ?? 'Mañana'}
              </p>
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="btn-primary"
          >
            {guardando ? 'Guardando…' : 'Guardar programación'}
          </button>
        </div>
      </div>
    </div>
  );
}
