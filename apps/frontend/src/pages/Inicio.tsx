import { useNavigate } from 'react-router-dom';
import { MODULOS, type Modulo, type ModuloIconKey } from '../config/modulos';
import {
  IconBadge,
  IconCamera,
  IconClipboard,
  IconMarketplace,
  IconCircularCredits,
  IconChart,
  IconChevronRight,
  IconLeaf,
} from '../components/ui';
import { useSession } from '../auth/SessionContext';

function renderModuloIcon(key: ModuloIconKey) {
  switch (key) {
    case 'camara':
      return <IconCamera className="h-5 w-5 text-green-700" />;
    case 'solicitudes':
      return <IconClipboard className="h-5 w-5 text-green-700" />;
    case 'marketplace':
      return <IconMarketplace className="h-5 w-5 text-green-700" />;
    case 'creditos':
      return <IconCircularCredits className="h-5 w-5 text-gold-600" />;
    case 'admin':
      return <IconChart className="h-5 w-5 text-green-700" />;
    default:
      return <IconMarketplace className="h-5 w-5 text-green-700" />;
  }
}

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
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex w-full items-start justify-between">
        <IconBadge
          icon={renderModuloIcon(modulo.icono)}
          className={`h-11 w-11 ${modulo.icono === 'creditos' ? 'bg-gold-50' : 'bg-green-50'}`}
        />
        {!modulo.activo && (
          <span className="pill bg-line-2 text-slate font-medium">Pronto</span>
        )}
      </div>
      <h3 className="mt-3 text-base font-bold text-ink">{modulo.titulo}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate">{modulo.descripcion}</p>
    </button>
  );
}

export default function Inicio() {
  const { sesion } = useSession();
  const navigate = useNavigate();

  // Activos primero, luego "próximamente". El orden se resuelve aquí, no en el config.
  const modulos = [...MODULOS].sort(
    (a, b) => Number(b.activo) - Number(a.activo),
  );

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-green-700">
          <IconLeaf className="h-3.5 w-3.5" />
          <span>Comuna de Santo Domingo</span>
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
          {sesion?.nombre ? `Bienvenido, ${sesion.nombre}` : 'Bienvenido, Vecino'}
        </h1>
        <p className="mt-0.5 text-sm text-slate">
          Gestión circular de residuos y aportes a la comunidad.
        </p>
      </header>

      {/* Tarjeta de impacto / Circular Credits */}
      <section
        onClick={() => navigate('/circular-credits')}
        className="card cursor-pointer relative overflow-hidden rounded-lg border-green-800/30 p-5 text-white shadow-green transition-all hover:shadow-lg hover:border-green-700"
        style={{ backgroundImage: 'linear-gradient(140deg, #156f4a 0%, #0f6b45 50%, #0a4f37 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white">
              <IconCircularCredits className="h-3.5 w-3.5 text-gold-400" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-100">
              Circular Credits Acumulados
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-green-100/90 hover:text-white">
            Canjear premios
            <IconChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-display text-4xl font-extrabold tracking-tight">120</p>
          <span className="text-xs font-medium text-green-200">créditos disponibles</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-3.5 text-xs sm:grid-cols-3">
          <div>
            <p className="font-display text-base font-bold">312 kg</p>
            <p className="text-green-100/80">CO₂ evitado</p>
          </div>
          <div>
            <p className="font-display text-base font-bold">8 ítems</p>
            <p className="text-green-100/80">Reutilizados</p>
          </div>
          <div className="hidden sm:block">
            <p className="font-display text-base font-bold">Nivel 2</p>
            <p className="text-green-100/80">Vecino Circular</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate">
          Servicios y Operaciones
        </h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {modulos.map((modulo) => (
            <ModuloCard key={modulo.id} modulo={modulo} />
          ))}
        </div>
      </section>
    </div>
  );
}
