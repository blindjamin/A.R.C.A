import { useNavigate } from 'react-router-dom';
import { BarraAccesibilidad } from '../accesibilidad/BarraAccesibilidad';

// HU-39: ayuda para vecinos. Pública como «Acerca de»: se llega desde el login
// y desde el perfil. Contenido estático, sin chatbot ni analítica.

/**
 * Teléfono de atención de la Municipalidad. PENDIENTE: completarlo con el
 * número oficial antes de integrar; mientras sea null, la página dice que está
 * por confirmar en vez de mostrar un número inventado.
 */
export const TELEFONO_MUNICIPALIDAD: string | null = null;

interface Pregunta {
  pregunta: string;
  respuesta: string;
}

const PREGUNTAS: { categoria: string; preguntas: Pregunta[] }[] = [
  {
    categoria: 'Solicitud de retiro',
    preguntas: [
      {
        pregunta: '¿Qué puedo pedir que retiren?',
        respuesta:
          'Residuos voluminosos que no caben en la basura domiciliaria: muebles, colchones, electrodomésticos y similares. Al crear la solicitud eliges el objeto de la lista; si no está, puedes describirlo.',
      },
      {
        pregunta: '¿Por qué me piden foto y dirección?',
        respuesta:
          'La foto permite al funcionario revisar el objeto sin ir a tu casa, y la dirección dice dónde retirarlo. La dirección puede ser distinta a la tuya, por ejemplo si pides el retiro para otra persona. Se borra al cancelar la solicitud y 30 días después de cerrarla.',
      },
      {
        pregunta: '¿Qué significa cada estado?',
        respuesta:
          '«En revisión»: un funcionario la está mirando. «Requiere cambios»: te piden corregir algo (la foto, la dirección o la descripción). «Aprobada»: falta el pago. «Retiro en coordinación»: ya pagaste y la empresa de retiro está programando la visita. «Retirada»: listo.',
      },
      {
        pregunta: '¿Cuándo y cómo pago?',
        respuesta:
          'Cuando la solicitud queda aprobada aparece el botón «Pagar retiro» en Mis solicitudes. El pago se hace con Webpay, con tarjeta de débito o crédito.',
      },
      {
        pregunta: '¿Por qué me piden verificar el correo?',
        respuesta:
          'Para avisarte por correo cuando tu solicitud cambie de estado. Te enviamos un código de 6 dígitos para confirmar que el correo es tuyo.',
      },
    ],
  },
  {
    categoria: 'Marketplace',
    preguntas: [
      {
        pregunta: '¿Qué es el Marketplace?',
        respuesta:
          'Un lugar para regalar o intercambiar con tus vecinos lo que todavía sirve, en vez de botarlo. Cada publicación la revisa la Municipalidad antes de mostrarla.',
      },
      {
        pregunta: '¿Cómo pido un artículo?',
        respuesta:
          'Toca «Me interesa» (o «Quiero intercambiar»). Se abre un chat con quien lo publicó para ponerse de acuerdo. Si te elige, el artículo queda reservado para ti y recibes un código de 6 dígitos.',
      },
      {
        pregunta: '¿Para qué sirve el código de entrega?',
        respuesta:
          'Cuando recibes el artículo, le dictas el código a quien lo entrega y él lo ingresa en la app. Así queda registrado que la entrega se hizo y se otorgan los créditos.',
      },
      {
        pregunta: '¿Cuándo comparto mi dirección?',
        respuesta:
          'Solo después de que el artículo quede reservado. Antes de eso, el Marketplace muestra únicamente una distancia aproximada. No escribas tu dirección en el chat mientras no haya reserva.',
      },
      {
        pregunta: '¿Qué hago si alguien no cumple?',
        respuesta:
          'Usa «Denunciar», en el artículo o en el chat. Elige el motivo y, si quieres, adjunta mensajes del chat como prueba. La revisa un funcionario municipal y el otro vecino no sabe quién lo denunció. Puedes ver el estado en Perfil › Mis denuncias.',
      },
    ],
  },
  {
    categoria: 'Circular Credits',
    preguntas: [
      {
        pregunta: '¿Cómo gano créditos?',
        respuesta:
          'Al entregar un artículo a otro vecino por el Marketplace, con un bono si te califica con 4 o 5 estrellas, y al pagar un retiro municipal. Hay un máximo de créditos por mes.',
      },
      {
        pregunta: '¿Dónde veo mi saldo?',
        respuesta: 'En la pestaña «Créditos», con el saldo y los movimientos.',
      },
    ],
  },
  {
    categoria: 'Cuenta y datos',
    preguntas: [
      {
        pregunta: '¿Por qué entro con ClaveÚnica?',
        respuesta:
          'Porque confirma que eres una persona real y vecina de la comuna, sin crear otra contraseña. A.R.C.A. no muestra tu RUN a nadie.',
      },
      {
        pregunta: '¿Puedo darme de baja?',
        respuesta:
          'Sí, desde Perfil › «Darme de baja de A.R.C.A.». Se cancelan las solicitudes que no has pagado. Puedes volver cuando quieras, pasadas 48 horas, entrando de nuevo con ClaveÚnica.',
      },
      {
        pregunta: '¿Qué hacen con mis datos?',
        respuesta:
          'Lo explica la Política de privacidad, que puedes leer desde el inicio de sesión o el perfil.',
      },
    ],
  },
];

const GUIAS: { titulo: string; pasos: string[] }[] = [
  {
    titulo: 'Pedir un retiro municipal',
    pasos: [
      'Toca «Tomar foto», en la barra de abajo.',
      'Elige el objeto, sácale una foto e indica la dirección de retiro.',
      'Confirma tu correo con el código que te llega.',
      'Sigue el estado en «Mis solicitudes». Si te piden cambios, corrige y vuelve a enviar.',
      'Cuando quede aprobada, toca «Pagar retiro» y paga con Webpay.',
      'La empresa de retiro coordina la visita. Te avisamos cuando quede retirada.',
    ],
  },
  {
    titulo: 'Regalar o intercambiar un objeto',
    pasos: [
      'En «Mercado», toca «Publicar» y elige si es regalo o intercambio.',
      'Agrega una foto, un título y una descripción.',
      'Espera la aprobación de la Municipalidad; la verás en «Mis publicaciones».',
      'Cuando un vecino se interese, conversa con él por el chat.',
      'Elige a quién se lo entregas con «Reservar».',
      'Al entregarlo, ingresa el código de 6 dígitos que te dicta el vecino.',
    ],
  },
  {
    titulo: 'Recibir un artículo',
    pasos: [
      'En «Mercado», abre el artículo y toca «Me interesa».',
      'Conversa con quien lo publicó para acordar la entrega.',
      'Si te elige, verás tu código de entrega en el artículo.',
      'Al recibirlo, díctale el código a quien lo entrega.',
      'Califica el intercambio con estrellas.',
    ],
  },
];

export default function Ayuda() {
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

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6">
        <section>
          <h1 className="text-2xl font-extrabold text-ink">Ayuda</h1>
          <p className="text-sm text-ink-2">
            Respuestas rápidas y una guía paso a paso para usar A.R.C.A.
          </p>
          <nav aria-label="Secciones de la ayuda" className="mt-3 flex flex-wrap gap-2 text-sm">
            <a href="#preguntas" className="pill bg-green-50 font-semibold text-green-800">
              Preguntas frecuentes
            </a>
            <a href="#guia" className="pill bg-green-50 font-semibold text-green-800">
              Guía paso a paso
            </a>
            <a href="#contacto" className="pill bg-green-50 font-semibold text-green-800">
              Hablar con una persona
            </a>
          </nav>
        </section>

        <section id="preguntas" className="space-y-5">
          <h2 className="text-lg font-bold text-ink">Preguntas frecuentes</h2>
          {PREGUNTAS.map((grupo) => (
            <div key={grupo.categoria} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate">
                {grupo.categoria}
              </h3>
              <div className="card divide-y divide-line">
                {grupo.preguntas.map((p) => (
                  <details key={p.pregunta} className="group px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
                      {p.pregunta}
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-slate-2 transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{p.respuesta}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section id="guia" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Guía paso a paso</h2>
            <p className="text-sm text-ink-2">Los trámites más comunes, en orden.</p>
          </div>
          {GUIAS.map((guia) => (
            <div key={guia.titulo} className="card space-y-3 p-5">
              <h3 className="font-bold text-ink">{guia.titulo}</h3>
              <ol className="space-y-2">
                {guia.pasos.map((paso, i) => (
                  <li key={paso} className="flex gap-3 text-sm text-ink-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{paso}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>

        <section id="contacto" className="card space-y-2 border-green-200 bg-green-50 p-5">
          <h2 className="text-lg font-bold text-ink">¿Necesitas hablar con una persona?</h2>
          <p className="text-sm text-ink-2">
            Si no encontraste tu respuesta, llama a la Municipalidad de Santo Domingo.
          </p>
          {TELEFONO_MUNICIPALIDAD ? (
            <a
              href={`tel:${TELEFONO_MUNICIPALIDAD.replace(/\s/g, '')}`}
              className="btn-primary inline-flex items-center gap-2 px-5 py-3"
            >
              Llamar al {TELEFONO_MUNICIPALIDAD}
            </a>
          ) : (
            <p className="text-sm font-semibold text-ink">Número de contacto por confirmar.</p>
          )}
        </section>
      </main>
    </div>
  );
}
