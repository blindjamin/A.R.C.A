import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../auth/SessionContext';
import { BotonClaveUnica, IconLeaf } from '../components/ui';

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
      className="flex min-h-screen w-full items-center justify-center text-white"
      style={{
        backgroundImage: 'linear-gradient(165deg,#0f6b45,#138a57,#1bb46f)',
      }}
    >
      <div className="relative mx-auto flex min-h-screen w-full flex-col justify-between overflow-hidden px-7 py-12 md:min-h-0 md:h-auto md:flex-row md:items-center md:justify-between md:max-w-5xl md:px-16 md:py-20 md:gap-16">
        {/* Hero */}
        <div className="mt-16 md:mt-0 text-center md:text-left md:max-w-lg">
          <div className="mx-auto md:mx-0 mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <IconLeaf className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tight">
            A.R.C.A.
          </h1>
          <p className="mx-auto md:mx-0 mt-6 max-w-xs md:max-w-md text-green-50/90 text-sm md:text-base leading-relaxed">
            Tus voluminosos tienen una segunda vida. Gestión de residuos para
            Santo Domingo.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-3 w-full max-w-md md:shrink-0 md:bg-white/10 md:backdrop-blur-md md:p-8 md:rounded-2xl md:border md:border-white/20">
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

              <p className="pt-2 text-center text-xs text-green-100/70">
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
