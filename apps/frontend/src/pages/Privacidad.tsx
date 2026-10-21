import { useNavigate } from 'react-router-dom';
import { BarraAccesibilidad } from '../accesibilidad/BarraAccesibilidad';

// Pública: se lee sin iniciar sesión (HU-12, Ley 21.719). Cada afirmación
// describe lo que hace el código hoy; si cambia el tratamiento de un dato,
// se actualiza este texto y sube la versión.
// Las medidas de seguridad se describen en términos generales: el detalle
// técnico va en docs/SEGURIDAD_ARQUITECTURA.md, no aquí.
// <PorConfirmar> marca lo que debe definir la Municipalidad antes de producción.
export const VERSION_POLITICA = '1.1';
const FECHA_POLITICA = '21 de octubre de 2026';

function PorConfirmar({ children }: { children: string }) {
  return (
    <span className="mt-1 block rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
      Por confirmar con la Municipalidad: {children}
    </span>
  );
}

interface DatoTratado {
  dato: string;
  paraQue: string;
  cuantoTiempo: string;
  quienLoVe: string;
  porConfirmar?: string;
}

const DATOS: DatoTratado[] = [
  {
    dato: 'RUN',
    paraQue:
      'Reconocerte cada vez que entras con ClaveÚnica. A.R.C.A. no guarda tu RUN: guarda un código que se calcula a partir de él con una clave secreta de la Municipalidad y que no permite reconstruirlo.',
    cuantoTiempo: 'El código dura lo mismo que tu cuenta.',
    quienLoVe: 'Nadie. Tu RUN no aparece en ninguna pantalla.',
  },
  {
    dato: 'Nombre',
    paraQue: 'Saludarte y saber a nombre de quién está una solicitud. Viene de ClaveÚnica y no se edita.',
    cuantoTiempo: 'Se guarda con tu sesión de ingreso; no se copia a tu cuenta.',
    quienLoVe:
      'Tú y los funcionarios municipales. Si publicas en el Marketplace, los demás vecinos ven tu nombre junto a tu publicación.',
  },
  {
    dato: 'Correo electrónico',
    paraQue: 'Avisarte de los cambios en tus solicitudes. Lo verificas con un código antes de usarlo.',
    cuantoTiempo: 'Mientras uses el servicio.',
    quienLoVe: 'Tú y los funcionarios municipales.',
  },
  {
    dato: 'Teléfono y dirección de contacto',
    paraQue: 'Que la Municipalidad pueda coordinar el retiro contigo. Son opcionales.',
    cuantoTiempo: 'Mientras tengas tu cuenta. Puedes borrarlos desde tu perfil cuando quieras.',
    quienLoVe: 'Tú y los funcionarios municipales.',
  },
  {
    dato: 'Dirección de retiro',
    paraQue:
      'Saber dónde retirar el objeto. Puede ser otra dirección que la tuya, por ejemplo la de un familiar.',
    cuantoTiempo:
      'Mientras la solicitud está abierta. Se borra al cancelarla, o 30 días después de que se cierre.',
    quienLoVe:
      'Tú, los funcionarios municipales y la empresa que hace el retiro. Nunca aparece en el Marketplace.',
  },
  {
    dato: 'Fotos de tus solicitudes y publicaciones',
    paraQue: 'Que la Municipalidad vea qué hay que retirar y que otros vecinos vean lo que ofreces.',
    cuantoTiempo: 'Mientras exista la solicitud o la publicación.',
    quienLoVe:
      'Las de una solicitud: tú y los funcionarios. Las del Marketplace: los vecinos que usan la app. Se guardan sin la ubicación (GPS) que el teléfono agrega a la foto.',
  },
  {
    dato: 'Ubicación aproximada',
    paraQue:
      'Mostrar a qué distancia está un artículo del Marketplace, solo si das permiso de ubicación.',
    cuantoTiempo: 'La de tus publicaciones, mientras estén publicadas. La tuya al consultar no se guarda.',
    quienLoVe:
      'Nadie ve tu ubicación exacta. Los demás vecinos solo ven un rango de distancia, como «1 a 5 km».',
  },
  {
    dato: 'Registro de actividad',
    paraQue:
      'Que la Municipalidad pueda responder por cada decisión: quién hizo qué y cuándo, con la dirección IP y el navegador.',
    cuantoTiempo:
      'Se conserva para que sirva de respaldo. Guarda solo qué cambió, nunca el contenido de tus datos.',
    quienLoVe: 'Solo los administradores municipales.',
    porConfirmar: 'el plazo de conservación del registro de actividad.',
  },
];

const DERECHOS: { nombre: string; detalle: string }[] = [
  { nombre: 'Acceso', detalle: 'Saber qué datos tuyos tiene A.R.C.A.' },
  { nombre: 'Rectificación', detalle: 'Corregir un dato que esté mal. Tu contacto lo corriges tú mismo en el perfil.' },
  { nombre: 'Supresión', detalle: 'Pedir que se borren tus datos cuando ya no se necesitan para el servicio.' },
  { nombre: 'Oposición', detalle: 'Pedir que no se usen tus datos para un fin determinado.' },
  { nombre: 'Portabilidad', detalle: 'Recibir tus datos en un formato que puedas llevar a otro servicio.' },
];

export default function Privacidad() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="brand-gradient px-4 py-3 text-white sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-pill px-3 py-1 text-sm hover:bg-white/15"
          >
            ← Volver
          </button>
          <BarraAccesibilidad />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="flex items-center gap-4">
          <img src="/isotipo.svg" alt="" className="h-14 w-14 shrink-0" />
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Política de privacidad</h1>
            <p className="text-sm text-ink-2">
              Versión {VERSION_POLITICA} · {FECHA_POLITICA}
            </p>
          </div>
        </section>

        <section className="card space-y-2 p-5 text-sm leading-relaxed text-ink-2">
          <p>
            La <strong className="text-ink">Municipalidad de Santo Domingo</strong> es la
            responsable de los datos personales que se tratan en A.R.C.A. Esta página
            explica qué datos usamos, para qué, cuánto tiempo los guardamos, quién los ve y
            cómo puedes ejercer tus derechos, según la Ley 21.719 de protección de datos
            personales.
          </p>
          <p>
            La regla de fondo es simple: <strong className="text-ink">pedimos solo lo que el
            trámite necesita</strong> y lo borramos cuando deja de servir.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Por qué podemos tratar tus datos</h2>
          <div className="card space-y-2 p-5 text-sm leading-relaxed text-ink-2">
            <p>
              El retiro de residuos voluminosos es parte de las funciones de aseo de la
              Municipalidad. Para prestar ese servicio puede tratar tus datos sin pedirte un
              consentimiento aparte, siempre dentro de lo que dice esta política.
            </p>
            <p>
              El Marketplace y los Circular Credits son voluntarios: sus datos se usan solo si
              decides participar.
            </p>
            <PorConfirmar>
              la norma exacta que habilita el tratamiento y la base para el Marketplace y los créditos.
            </PorConfirmar>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Qué datos usamos</h2>
          <ul className="space-y-3">
            {DATOS.map((d) => (
              <li key={d.dato} className="card p-4">
                <h3 className="font-bold text-ink">{d.dato}</h3>
                <dl className="mt-2 space-y-2 text-sm leading-relaxed">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-green-700">Para qué</dt>
                    <dd className="text-ink-2">{d.paraQue}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-green-700">Cuánto tiempo</dt>
                    <dd className="text-ink-2">
                      {d.cuantoTiempo}
                      {d.porConfirmar && <PorConfirmar>{d.porConfirmar}</PorConfirmar>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-green-700">Quién lo ve</dt>
                    <dd className="text-ink-2">{d.quienLoVe}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Con quién se comparten</h2>
          <ul className="card list-disc space-y-2 p-5 pl-9 text-sm leading-relaxed text-ink-2">
            <li>
              <strong className="text-ink">ClaveÚnica (Gobierno de Chile):</strong> confirma tu
              identidad al entrar y nos entrega tu RUN y tu nombre.
            </li>
            <li>
              <strong className="text-ink">La empresa que hace el retiro:</strong> recibe solo lo
              necesario para retirar: el objeto, su descripción, la dirección de retiro y una
              ubicación aproximada. Nunca tu RUN ni tus datos de contacto.
            </li>
            <li>
              <strong className="text-ink">El pago:</strong> se hace en el sitio de Transbank
              (Webpay). A.R.C.A. nunca recibe ni guarda los datos de tu tarjeta.
            </li>
            <li>
              <strong className="text-ink">Proveedores que trabajan por encargo de la
              Municipalidad</strong>, como el alojamiento del sistema y el envío de correos: solo
              pueden usar tus datos para prestar ese servicio.
              <PorConfirmar>
                los proveedores de alojamiento y de correo, y si alguno guarda datos fuera de Chile.
              </PorConfirmar>
            </li>
          </ul>
          <p className="text-sm text-ink-2">
            No vendemos tus datos ni los usamos para publicidad.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Cómo los protegemos</h2>
          <div className="card space-y-2 p-5 text-sm leading-relaxed text-ink-2">
            <p>
              La Municipalidad aplica medidas técnicas y organizativas para proteger tus datos de
              accesos no autorizados, pérdidas o cambios indebidos. Entre ellas: entras con
              ClaveÚnica, por lo que A.R.C.A. no maneja contraseñas; cada funcionario accede solo
              a lo que necesita para su trabajo, y sus acciones quedan registradas.
            </p>
            <p>
              En tu dispositivo solo se guardan preferencias de uso, como el tamaño de letra.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Decisiones automatizadas</h2>
          <p className="card p-5 text-sm leading-relaxed text-ink-2">
            A.R.C.A. no toma decisiones automatizadas sobre ti ni elabora perfiles. Cada solicitud
            de retiro la revisa una persona de la Municipalidad.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Tus derechos</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {DERECHOS.map((d) => (
              <li key={d.nombre} className="card p-4">
                <p className="font-bold text-ink">{d.nombre}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{d.detalle}</p>
              </li>
            ))}
          </ul>
          <div className="card space-y-2 p-5 text-sm leading-relaxed text-ink-2">
            <p>
              Para ejercerlos, escribe a la Municipalidad de Santo Domingo por sus canales
              oficiales de atención, indicando que tu solicitud es sobre A.R.C.A. La Municipalidad
              debe responderte dentro de 30 días corridos, plazo que puede extender una vez.
            </p>
            <PorConfirmar>el canal oficial (correo o formulario) para ejercer estos derechos.</PorConfirmar>
            <p>
              Si no te responden a tiempo o no estás de acuerdo con la respuesta, desde el 1 de
              diciembre de 2026 puedes reclamar ante la Agencia de Protección de Datos Personales.
            </p>
            <p>
              <strong className="text-ink">Darte de baja no es lo mismo que borrar tus datos.</strong>{' '}
              La baja desactiva tu cuenta y oculta tus publicaciones, y puedes volver después.
              Si además quieres que se borren tus datos, pídelo como solicitud de supresión.
            </p>
          </div>
        </section>

        <section className="space-y-3 pb-4">
          <h2 className="text-lg font-bold text-ink">Cambios a esta política</h2>
          <div className="card space-y-2 p-5 text-sm leading-relaxed text-ink-2">
            <p>
              Revisamos esta política al menos una vez al año y cada vez que cambia la forma en
              que tratamos tus datos. Cada versión queda con su número y su fecha; si el cambio es
              importante, te lo informaremos en la aplicación.
            </p>
            <PorConfirmar>quién revisa y aprueba cada versión de la política.</PorConfirmar>
          </div>
        </section>
      </main>
    </div>
  );
}
