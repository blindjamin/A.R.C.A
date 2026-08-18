import { useNavigate } from 'react-router-dom';
import { MODULOS, type Modulo } from '../config/modulos';
import { IconBadge } from '../components/ui';

function ModuloCard({ modulo }: { modulo: Modulo }) {
  const navigate = useNavigate();
  const clickable = modulo.activo && modulo.ruta;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && navigate(modulo.ruta!)}
      className={`card flex flex-col items-start p-4 text-left transition-all ${
        clickable
          ? 'hover:-translate-y-0.5 hover:shadow-md hover:border-green-300'
          : 'opacity-60'
      }`}
    >
      <div className="flex w-full items-start justify-between">
        <IconBadge icon={modulo.icono} className="h-11 w-11 text-2xl" />
        {!modulo.activo && (
          <span className="pill bg-line-2 text-slate">Pronto</span>
        )}
      </div>
      <h3 className="mt-3 text-base font-bold">{modulo.titulo}</h3>
      <p className="mt-1 text-sm leading-snug text-slate">{modulo.descripcion}</p>
    </button>
  );
}

export default function Inicio() {
  // Activos primero, luego "próximamente". El orden se resuelve aquí, no en el config.
  const modulos = [...MODULOS].sort(
    (a, b) => Number(b.activo) - Number(a.activo),
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-slate">Hola de nuevo,</p>
        <h1 className="text-2xl font-extrabold">Camila 👋</h1>
      </header>

      {/* Tarjeta de impacto / Circular Credits (datos demo) */}
      <section
        className="rounded-lg p-5 text-white shadow-green"
        style={{ backgroundImage: 'linear-gradient(140deg,#156f4a,#0f6b45,#0a4f37)' }}
      >
        <p className="text-xs font-medium uppercase tracking-widest text-green-100">
          Circular Credits
        </p>
        <p className="mt-1 font-display text-4xl font-extrabold">120</p>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <p className="font-bold">312 kg</p>
            <p className="text-green-100/80">CO₂ evitado</p>
          </div>
          <div>
            <p className="font-bold">8</p>
            <p className="text-green-100/80">Reutilizados</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate">
          ¿Qué quieres hacer hoy?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {modulos.map((modulo) => (
            <ModuloCard key={modulo.id} modulo={modulo} />
          ))}
        </div>
      </section>
    </div>
  );
}
