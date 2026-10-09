import type { ComponentType } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BarraAccesibilidad } from '../accesibilidad/BarraAccesibilidad';
import { useSession } from '../auth/SessionContext';
import {
  BotonClaveUnica,
  IconCamera,
  IconCircularCredits,
  IconLeaf,
  IconRepeat,
  type IconProps,
} from '../components/ui';

// UUIDs sembrados por la migración de seed del backend, solo para los accesos
// de desarrollo (criterio 6: ocultos fuera de import.meta.env.DEV).
const IDENTIDADES_DEV = {
  vecino: '00000000-0000-4000-8000-000000000001',
  funcionario: '00000000-0000-4000-8000-000000000002',
  admin: '00000000-0000-4000-8000-000000000003',
} as const;

// Con este `?error=` vuelve el backend cuando el ingreso con ClaveÚnica no se
// completó (cierre implícito). No trae el motivo, a propósito.
const ERROR_INGRESO_CLAVE_UNICA = 'clave-unica';

// Cómo se usa la app, en tres pasos (pedido del patrocinador, 08-10-2026).
const PASOS: { titulo: string; texto: string; Icon: ComponentType<IconProps> }[] = [
  {
    titulo: 'Fotografía',
    texto: 'Saca una foto a tu residuo voluminoso y pide el retiro municipal.',
    Icon: IconCamera,
  },
  {
    titulo: 'Comparte',
    texto: 'Si aún sirve, regálalo o intercámbialo con tus vecinos. Si ya no sirve, agenda el retiro municipal.',
    Icon: IconRepeat,
  },
  {
    titulo: 'Canjea',
    texto: 'Suma Circular Credits y cámbialos por beneficios en la comuna.',
    Icon: IconCircularCredits,
  },
];

export default function Login() {
  const { entrarDev } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ingresoFallido =
    searchParams.get('error') === ERROR_INGRESO_CLAVE_UNICA;

  const entrar = (ciudadanoId: string) => {
    entrarDev(ciudadanoId)
      // El gate de "/" decide a dónde ir según el rol de la sesión.
      .then(() => navigate('/'))
      .catch((e: Error) => window.alert(e.message));
  };

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center text-white"
      style={{
        backgroundImage: 'linear-gradient(165deg,#0f6b45,#138a57,#1bb46f)',
      }}
    >
      <div className="relative mx-auto flex h-dvh w-full flex-col justify-between overflow-hidden px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] md:h-auto md:flex-row md:items-center md:justify-between md:max-w-5xl md:px-16 md:py-20 md:gap-16">
        <div className="absolute right-4 top-4 md:right-6 md:top-6">
          <BarraAccesibilidad />
        </div>

        {/* Hero */}
        {/* En celular la pantalla no se desliza: si el texto no cabe (letra grande,
            pasos nuevos), solo esta parte se desplaza y se desvanece detrás de
            los botones, que quedan siempre a la vista. */}
        <div className="-mx-6 mt-12 min-h-0 flex-1 overflow-y-auto px-6 pb-6 [scrollbar-width:none] text-center [mask-image:linear-gradient(to_bottom,transparent,black_1rem,black_calc(100%-1.5rem),transparent)] pt-4 md:pt-0 md:mx-0 md:mt-0 md:max-w-lg md:flex-none md:overflow-visible md:px-0 md:pb-0 md:text-left md:[mask-image:none]">
          <div className="mx-auto md:mx-0 mb-4 md:mb-6 flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <IconLeaf className="h-8 w-8 md:h-10 md:w-10 text-white" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            A.R.C.A.
          </h1>
          <p className="mx-auto md:mx-0 mt-3 md:mt-6 max-w-xs md:max-w-md text-green-50/90 text-sm md:text-base leading-relaxed">
            Tus voluminosos tienen una segunda vida. Gestión de residuos para
            Santo Domingo.
          </p>

          <ol aria-label="Cómo funciona" className="mt-6 md:mt-8 grid gap-2.5 text-left sm:grid-cols-3">
            {PASOS.map(({ titulo, texto, Icon }, i) => (
              <li
                key={titulo}
                className="flex items-start gap-3 rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur sm:flex-col sm:gap-2"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/15">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="text-sm font-bold">
                    {i + 1}. {titulo}
                  </p>
                  <p className="text-xs leading-snug text-green-50/90">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* CTAs */}
        <div className="shrink-0 pt-2 md:pt-0 space-y-3 w-full max-w-md md:shrink-0 md:bg-white/10 md:backdrop-blur-md md:p-8 md:rounded-2xl md:border md:border-white/20">
          {/* Botón oficial de ClaveÚnica. No reemplazar por uno propio ni
              cambiarle los estilos: la certificación exige este botón tal cual. */}
          {ingresoFallido && (
            <p
              role="alert"
              className="rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-center text-sm text-white"
            >
              No pudimos completar tu ingreso con ClaveÚnica. Inténtalo de
              nuevo y, si el problema sigue, contacta a la Municipalidad.
            </p>
          )}
          <div className="flex justify-center">
            <BotonClaveUnica />
          </div>
          <p className="text-center">
            <Link
              to="/acerca-de"
              className="text-xs text-white/85 underline underline-offset-2 hover:text-white"
            >
              Acerca de A.R.C.A.
            </Link>
          </p>

          {/* Accesos de desarrollo: solo en `npm run dev` (criterio 6). Simulan
              las tres identidades de ClaveÚnica para probar el control de
              acceso por rol sin depender del municipio. */}
          {import.meta.env.DEV && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => entrar(IDENTIDADES_DEV.vecino)}
                  className="rounded-pill border border-white/30 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  Vecino (dev)
                </button>
                <button
                  onClick={() => entrar(IDENTIDADES_DEV.funcionario)}
                  className="rounded-pill border border-white/30 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  Funcionario (dev)
                </button>
                <button
                  onClick={() => entrar(IDENTIDADES_DEV.admin)}
                  className="rounded-pill border border-white/30 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  Admin (dev)
                </button>
              </div>

              <p className="hidden pt-2 text-center text-xs text-green-100/70 md:block">
                En local el botón de ClaveÚnica no funciona (no acepta
                localhost): se entra por los accesos de desarrollo. Tras
                autenticar, si la persona es funcionaria o
                admin podrá elegir App ciudadana o Panel municipal.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
