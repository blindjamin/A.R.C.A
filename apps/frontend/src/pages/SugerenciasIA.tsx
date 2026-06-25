import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCatalogo,
  formatearPrecio,
  iconoPorCategoria,
  precioReferencial,
  type ResiduoCatalogo,
} from '../api/arca';
import { useSolicitudFlow } from '../flow/SolicitudFlow';

// Confianza simulada — la IA real (TensorFlow.js) llega en una fase posterior.
const CONFIANZA_MOCK = 92;

export default function SugerenciasIA() {
  const navigate = useNavigate();
  const { fotoPreview } = useSolicitudFlow();
  const [sugerencia, setSugerencia] = useState<ResiduoCatalogo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // "Detección" mock: tomamos un residuo reutilizable real del catálogo.
    fetchCatalogo()
      .then((items) => {
        setSugerencia(items.find((i) => i.puedeReutilizarse) ?? items[0] ?? null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!sugerencia) return <p className="text-slate">Procesando resultado…</p>;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold">Resultado</h1>
        <p className="text-sm text-slate">Esto detectamos en tu foto.</p>
      </header>

      {/* Tarjeta de detección */}
      <div className="card overflow-hidden">
        {fotoPreview ? (
          <img src={fotoPreview} alt="Residuo" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-green-50 text-6xl">
            {iconoPorCategoria(sugerencia.categoria)}
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="pill bg-green-100 text-green-700">
              IA · {CONFIANZA_MOCK}% confianza
            </span>
            {sugerencia.puedeReutilizarse && (
              <span className="pill bg-gold-100 text-gold-600">Reutilizable</span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-extrabold">{sugerencia.nombre}</h2>
          <p className="text-sm text-slate">
            {sugerencia.categoria} ·{' '}
            {formatearPrecio(precioReferencial(sugerencia.categoria))}
          </p>
          {/* Barra de confianza */}
          <div className="mt-3 h-2 overflow-hidden rounded-pill bg-line-2">
            <div
              className="h-full rounded-pill bg-green-500"
              style={{ width: `${CONFIANZA_MOCK}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-slate">
        ¿Es correcto? Continúa con la sugerencia o ingrésalo a mano.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => navigate(`/nueva-solicitud?residuo=${sugerencia.id}`)}
          className="btn-primary w-full py-3.5"
        >
          Usar sugerencia del catálogo
        </button>
        <button
          onClick={() => navigate('/nueva-solicitud')}
          className="btn-outline w-full"
        >
          Ingresar detalles manualmente
        </button>
        <button onClick={() => navigate('/solicitar')} className="btn-ghost w-full">
          Repetir foto
        </button>
      </div>
    </div>
  );
}
