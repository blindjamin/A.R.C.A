import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ETIQUETA_ESTADO_DENUNCIA,
  fetchMisDenuncias,
  MOTIVOS_DENUNCIA,
  type DenunciaPropia,
  type EstadoDenuncia,
} from '../api/denuncias';
import { BackButton, EmptyState, ScreenHeader } from '../components/ui';
import { haceCuanto } from '../features/marketplace/formato';

const CLASE_ESTADO: Record<EstadoDenuncia, string> = {
  abierta: 'bg-amber-100 text-amber-800',
  investigacion: 'bg-sky-100 text-sky-800',
  resuelta: 'bg-green-100 text-green-800',
  rechazada: 'bg-stone-200 text-stone-700',
};

const etiquetaMotivo = (valor: string): string =>
  MOTIVOS_DENUNCIA.find((m) => m.valor === valor)?.etiqueta ?? valor;

/** Estado de las denuncias propias (HU-16). No muestra al denunciado. */
export default function MisDenuncias() {
  const navigate = useNavigate();
  const [denuncias, setDenuncias] = useState<DenunciaPropia[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchMisDenuncias()
      .then(setDenuncias)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <BackButton onClick={() => navigate('/perfil')} />
      <ScreenHeader
        title="Mis denuncias"
        subtitle="Las revisa un funcionario municipal. El vecino denunciado no sabe quién lo denunció."
      />

      {error && <p className="text-sm text-rose-700">No pudimos cargar tus denuncias.</p>}
      {!error && denuncias === null && <p className="text-slate">Cargando…</p>}
      {denuncias?.length === 0 && (
        <EmptyState message="No has hecho denuncias. Si un intercambio no se cumple, puedes denunciarlo desde el artículo o el chat." />
      )}

      {denuncias && denuncias.length > 0 && (
        <ul className="space-y-2">
          {denuncias.map((d) => (
            <li key={d.id} className="card space-y-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{etiquetaMotivo(d.motivo)}</p>
                <span className={`pill shrink-0 text-xs font-semibold ${CLASE_ESTADO[d.estado]}`}>
                  {ETIQUETA_ESTADO_DENUNCIA[d.estado]}
                </span>
              </div>
              <p className="text-xs text-slate">
                {d.articuloId && d.articuloTitulo ? (
                  <Link to={`/marketplace/${d.articuloId}`} className="underline">
                    {d.articuloTitulo}
                  </Link>
                ) : (
                  'Artículo eliminado'
                )}{' '}
                · enviada {haceCuanto(d.fechaDenuncia)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
