import { useNavigate } from 'react-router-dom';
import { MODULOS, type Modulo } from '../config/modulos';

function ModuloCard({ modulo }: { modulo: Modulo }) {
  const navigate = useNavigate();
  const clickable = modulo.activo && modulo.ruta;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && navigate(modulo.ruta!)}
      className={`text-left bg-white rounded-2xl border border-gray-100 p-5 transition-all ${
        clickable
          ? 'shadow-sm hover:shadow-md hover:border-arca-green cursor-pointer'
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl">{modulo.icono}</span>
        {!modulo.activo && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            Próximamente
          </span>
        )}
      </div>
      <h3 className="font-semibold mt-3">{modulo.titulo}</h3>
      <p className="text-sm text-gray-500 mt-1">{modulo.descripcion}</p>
      <span className="inline-block text-[10px] text-gray-400 mt-3">
        {modulo.epica}
      </span>
    </button>
  );
}

export default function Inicio() {
  // Activos primero, luego "próximamente". El orden se resuelve aquí, no en el config.
  const modulos = [...MODULOS].sort(
    (a, b) => Number(b.activo) - Number(a.activo),
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-arca-dark">Hola, vecino 🌿</h1>
        <p className="text-gray-500">¿Qué quieres hacer hoy?</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((modulo) => (
          <ModuloCard key={modulo.id} modulo={modulo} />
        ))}
      </div>
    </div>
  );
}
