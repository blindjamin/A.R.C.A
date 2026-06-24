import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchMisSolicitudes,
  formatearPrecio,
  precioReferencial,
  type EstadoSolicitud,
  type SolicitudRetiro,
} from '../api/arca';
import { useSession } from '../auth/SessionContext';

const ESTADO_META: Record<EstadoSolicitud, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-gold-100 text-gold-600' },
  asignada: { label: 'Asignada', cls: 'bg-sky-100 text-sky-600' },
  en_proceso: { label: 'En ruta', cls: 'bg-green-100 text-green-700' },
  completada: { label: 'Completada', cls: 'bg-green-600 text-white' },
  cancelada: { label: 'Cancelada', cls: 'bg-line-2 text-slate' },
};

export default function MisSolicitudes() {
  const { usuarioCiudadanoId } = useSession();
  const [items, setItems] = useState<SolicitudRetiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuarioCiudadanoId) return;
    fetchMisSolicitudes(usuarioCiudadanoId)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [usuarioCiudadanoId]);

  if (loading) return <p className="text-slate">Cargando solicitudes…</p>;
  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-extrabold">Mis solicitudes</h1>
        <p className="text-sm text-slate">Sigue el estado de tus retiros.</p>
      </header>

      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
            📋
          </div>
          <p className="text-sm text-slate">Aún no tienes solicitudes.</p>
          <Link to="/solicitar" className="btn-primary mt-4 inline-flex">
            Solicitar un retiro
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => {
            const meta = ESTADO_META[s.estado];
            const categoria = s.residuoCatalogo?.categoria;
            return (
              <li key={s.id} className="card flex items-center gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-green-50 text-xl">
                  ♻️
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-bold">
                      {s.residuoCatalogo?.nombre ?? `Residuo #${s.residuoCatalogoId}`}
                    </p>
                    <span className={`pill ${meta.cls}`}>{meta.label}</span>
                  </div>
                  <p className="truncate text-sm text-slate">
                    {categoria ? `${categoria} · ` : ''}
                    {categoria ? formatearPrecio(precioReferencial(categoria)) : ''}
                    {s.descripcion ? ` · ${s.descripcion}` : ''}
                  </p>
                  <p className="text-xs text-slate-2">
                    {new Date(s.fechaSolicitud).toLocaleDateString('es-CL', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
