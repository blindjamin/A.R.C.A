import { useNavigate } from 'react-router-dom';
import { BarraAccesibilidad } from '../accesibilidad/BarraAccesibilidad';

// Pública: se lee sin iniciar sesión (HU-12, Ley 21.719). Cada afirmación
// describe lo que hace el código hoy; si cambia el tratamiento de un dato,
// se actualiza este texto y sube la versión.
export const VERSION_POLITICA = '1.0';
const FECHA_POLITICA = '20 de octubre de 2026';

interface DatoTratado {
  dato: string;
  paraQue: string;
  cuantoTiempo: string;
  quienLoVe: string;
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
      'Nadie ve tu punto exacto: se lleva a una cuadrícula de 250 m y los demás vecinos solo ven un rango, como «1 a 5 km».',
  },
  {
    dato: 'Registro de actividad',
    paraQue:
      'Que la Municipalidad pueda responder por cada decisión: quién hizo qué y cuándo, con la dirección IP y el navegador.',
    cuantoTiempo:
      'Se conserva, porque un registro que se puede borrar no sirve de respaldo. Por eso guarda solo qué cambió, nunca el contenido de tus datos.',
    quienLoVe: 'Solo los administradores municipales.',
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
                    <dd className="text-ink-2">{d.cuantoTiempo}</dd>
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
              <strong className="text-ink">El servicio de correo:</strong> envía los avisos a tu
              correo.
            </li>
            <li>
              <strong className="text-ink">El pago:</strong> se hace en el sitio de Transbank
              (Webpay). A.R.C.A. nunca recibe ni guarda los datos de tu tarjeta.
            </li>
          </ul>
          <p className="text-sm text-ink-2">
            No vendemos tus datos ni los usamos para publicidad.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Cómo los protegemos</h2>
          <ul className="card list-disc space-y-2 p-5 pl-9 text-sm leading-relaxed text-ink-2">
            <li>Entras con ClaveÚnica; A.R.C.A. no maneja contraseñas.</li>
            <li>
              Tu sesión se guarda en una cookie que el código de la página no puede leer, y se
              cierra sola cuando vence.
            </li>
            <li>
              Cada funcionario ve solo lo que su rol permite, y todo lo que hace queda
              registrado.
            </li>
            <li>
              En tu dispositivo solo se guardan preferencias de uso, como el tamaño de letra.
            </li>
          </ul>
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
              oficiales de atención, indicando que tu solicitud es sobre A.R.C.A.
            </p>
            <p>
              <strong className="text-ink">Darte de baja no es lo mismo que borrar tus datos.</strong>{' '}
              La baja desactiva tu cuenta y oculta tus publicaciones, y puedes volver después.
              Si además quieres que se borren tus datos, pídelo como solicitud de supresión.
            </p>
          </div>
        </section>

        <p className="pb-4 text-xs text-slate">
          Si cambiamos cómo tratamos tus datos, actualizaremos esta página y su versión.
        </p>
      </main>
    </div>
  );
}
