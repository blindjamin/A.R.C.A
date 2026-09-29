import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import {
  IconCoins,
  IconLeaf,
  IconShield,
  IconClipboard,
  IconRecycle,
  IconLogout,
  IconChevronRight,
} from '../components/ui/Icons';
import BackButton from '../components/ui/BackButton';

interface MovimientoCredito {
  id: string;
  concepto: string;
  monto: number;
  tipo: 'ingreso' | 'canje';
  origen: string;
  fecha: string;
}

const MOVIMIENTOS_DEMO: MovimientoCredito[] = [
  {
    id: 'm1',
    concepto: 'Entrega confirmada en Marketplace (Sillón 2 cuerpos)',
    monto: 50,
    tipo: 'ingreso',
    origen: 'Marketplace P2P',
    fecha: '28 Sep 2026',
  },
  {
    id: 'm2',
    concepto: 'Calificación vecinal 5 estrellas ★',
    monto: 20,
    tipo: 'ingreso',
    origen: 'Evaluación vecinal',
    fecha: '28 Sep 2026',
  },
  {
    id: 'm3',
    concepto: 'Retiro domiciliario clasificado correctamente',
    monto: 30,
    tipo: 'ingreso',
    origen: 'Recolección municipal',
    fecha: '15 Sep 2026',
  },
  {
    id: 'm4',
    concepto: 'Acreditación vecinal inicial Santo Domingo',
    monto: 20,
    tipo: 'ingreso',
    origen: 'Bono municipal',
    fecha: '01 Sep 2026',
  },
];

export default function Perfil() {
  const { sesion, salir } = useSession();
  const navigate = useNavigate();

  const nombreUsuario = sesion?.nombre || 'Vecino de Santo Domingo';
  const iniciales = nombreUsuario
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  // Identificador acotado y seguro para visualización
  const idMostrable = sesion?.ciudadanoId
    ? `${sesion.ciudadanoId.slice(0, 8)}...${sesion.ciudadanoId.slice(-4)}`
    : 'ARCA-SD-2026';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <BackButton onClick={() => navigate('/inicio')} />
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
              Perfil del Vecino
            </h1>
            <p className="text-sm text-slate">
              Identificación ciudadana y registro de impacto circular en Santo Domingo.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-pill border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800 sm:self-auto">
            <IconShield className="h-3.5 w-3.5 text-green-700" />
            Identidad Verificada
          </span>
        </div>
      </div>

      {/* Tarjeta de Identificación Ciudadana */}
      <section className="card overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-green-700 text-xl font-display font-bold text-white shadow-sm sm:h-20 sm:w-20 sm:text-2xl">
              {iniciales || 'VS'}
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-ink sm:text-2xl">
                {nombreUsuario}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate">
                <span className="font-medium text-ink-2">Vecino Acreditado</span>
                <span>•</span>
                <span>Comuna de Santo Domingo</span>
              </div>
              <p className="text-xs font-mono text-slate-2">
                ID Vecino: <span className="text-ink-2">{idMostrable}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 sm:pt-0 sm:flex-col sm:items-end">
            <span className="pill bg-line-2 text-ink-2 text-xs">
              Rol: <strong className="ml-1 capitalize">{sesion?.rol || 'vecino'}</strong>
            </span>
            <span className="pill bg-green-100 text-green-800 text-xs">
              Cuenta Activa
            </span>
          </div>
        </div>
      </section>

      {/* Billetera de Circular Credits */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate">
            Billetera Ambiental · Circular Credits
          </h2>
          <span className="text-xs text-slate-2">Actualizado en tiempo real</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Tarjeta principal de créditos */}
          <div
            className="card relative overflow-hidden rounded-lg p-6 text-white shadow-green md:col-span-2"
            style={{
              backgroundImage:
                'linear-gradient(140deg, #156f4a 0%, #0f6b45 55%, #0a4f37 100%)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
                  <IconCoins className="h-4 w-4 text-gold-400" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-green-100">
                  Saldo Acumulado
                </span>
              </div>
              <span className="rounded-pill bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                Nivel 2 · Vecino Activo
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-5xl font-extrabold tracking-tight">
                120
              </span>
              <span className="text-sm font-semibold uppercase text-gold-300">
                CC (Circular Credits)
              </span>
            </div>

            <p className="mt-2 text-xs text-green-100/90 leading-relaxed max-w-lg">
              Los créditos son reconocimientos por reducir y reutilizar residuos voluminosos en la comuna. Acumulas entregando objetos en el Marketplace o disponiendo adecuadamente tus retiros.
            </p>

            <div className="mt-5 border-t border-white/20 pt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-green-100/90 font-medium">Progreso a Nivel 3 (Vecino Embajador)</span>
                <span className="font-bold text-white">120 / 200 CC</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-gold-400 transition-all duration-500"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          </div>

          {/* Métricas de Impacto */}
          <div className="card flex flex-col justify-between p-6 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-green-700">
                <IconLeaf className="h-3.5 w-3.5" />
                <span>Impacto en la Comuna</span>
              </div>
              <h3 className="mt-1 text-base font-bold text-ink">
                Aporte Ecológico
              </h3>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-xs text-slate">CO₂ Evitado Estimado</span>
                <span className="font-display text-base font-extrabold text-green-700">
                  312 kg
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-xs text-slate">Objetos Reutilizados</span>
                <span className="font-display text-base font-extrabold text-ink">
                  8 unidades
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate">Reputación Vecinal</span>
                <span className="font-display text-base font-extrabold text-gold-500 flex items-center gap-1">
                  4.9 ★
                </span>
              </div>
            </div>

            <div className="rounded-md bg-canvas p-2.5 text-[11px] text-slate leading-tight">
              Cálculo estimado en base a la caracterización municipal de residuos Santo Domingo.
            </div>
          </div>
        </div>
      </section>

      {/* Historial de Movimientos de Créditos */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconCoins className="h-4 w-4 text-green-700" />
            <h3 className="text-base font-bold text-ink">
              Historial de Transacciones de Créditos
            </h3>
          </div>
          <span className="text-xs text-slate">{MOVIMIENTOS_DEMO.length} registros</span>
        </div>

        <div className="divide-y divide-line">
          {MOVIMIENTOS_DEMO.map((mov) => (
            <div
              key={mov.id}
              className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-ink leading-tight">
                  {mov.concepto}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate">
                  <span>{mov.origen}</span>
                  <span>•</span>
                  <span>{mov.fecha}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-0.5 rounded-pill bg-gold-50 px-2.5 py-1 text-xs font-bold text-gold-600 border border-gold-100">
                  +{mov.monto} CC
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Acciones y Enlaces de Actividad */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate">
          Gestión y Enlaces de Actividad
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/mis-solicitudes"
            className="card flex items-center justify-between p-4 transition-all hover:border-green-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-green-50 text-green-700">
                <IconClipboard className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Mis Solicitudes de Retiro</p>
                <p className="text-xs text-slate">Revisa el estado de tus solicitudes</p>
              </div>
            </div>
            <IconChevronRight className="h-4 w-4 text-slate-2" />
          </Link>

          <Link
            to="/marketplace"
            className="card flex items-center justify-between p-4 transition-all hover:border-green-300 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-green-50 text-green-700">
                <IconRecycle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Marketplace P2P</p>
                <p className="text-xs text-slate">Intercambia o regala con tus vecinos</p>
              </div>
            </div>
            <IconChevronRight className="h-4 w-4 text-slate-2" />
          </Link>
        </div>
      </section>

      {/* Cierre de Sesión y Soporte */}
      <section className="card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-canvas/60">
        <div>
          <p className="text-xs font-semibold text-ink">
            Municipalidad de Santo Domingo · Plataforma A.R.C.A.
          </p>
          <p className="text-xs text-slate">
            ¿Dudas sobre tus solicitudes o créditos? Contacta a la Dirección de Medio Ambiente.
          </p>
        </div>
        <button
          onClick={() => void salir()}
          type="button"
          className="btn-outline flex items-center justify-center gap-2 border-line text-slate hover:text-rose-600 hover:border-rose-300"
        >
          <IconLogout className="h-4 w-4" />
          <span>Cerrar sesión segura</span>
        </button>
      </section>
    </div>
  );
}
