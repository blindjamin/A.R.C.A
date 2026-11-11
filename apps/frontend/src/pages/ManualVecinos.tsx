import ManualLayout, { type SeccionManual } from '../components/ManualLayout';

// HU-39: manual de uso para vecinos. Capturas con datos ficticios en
// public/manuales/vecinos.
const D = '/manuales/vecinos/';

const SECCIONES: SeccionManual[] = [
  {
    id: 'entrar',
    titulo: 'Entrar a A.R.C.A.',
    bloques: [
      {
        pasos: [
          'Abre A.R.C.A. en tu celular.',
          'Toca «Iniciar sesión».',
          'Identifícate con tu ClaveÚnica.',
          'Llegarás a la pantalla de inicio. Abajo tienes el menú: Inicio, Mercado, Tomar foto, Créditos y Perfil.',
        ],
        figuras: [
          { src: `${D}01-login.jpg`, alt: 'Pantalla de entrada de A.R.C.A. con el botón azul «Iniciar sesión» y los enlaces Acerca de, Ayuda y Política de privacidad.', caption: 'Pantalla de entrada.' },
          { src: `${D}02-inicio.jpg`, alt: 'Pantalla de inicio con el saldo de Circular Credits, los accesos Solicitar retiro, Mis solicitudes, Marketplace y Circular Credits, y el menú inferior.', caption: 'Inicio, con tus créditos y los accesos principales.' },
        ],
      },
    ],
  },
  {
    id: 'pedir-retiro',
    titulo: 'Pedir un retiro',
    bloques: [
      {
        pasos: [
          'Toca «Tomar foto», en el botón verde del centro del menú.',
          'Elige el tipo de residuo de la lista, por ejemplo «Sillón 2 cuerpos». Si hay más de uno, toca «Agregar otro objeto».',
          'Saca una foto del objeto, o elige una de tu galería.',
          'Escribe la dirección donde lo retirarán. Puede ser distinta a la tuya.',
          'Si quieres, agrega una descripción.',
          'Si el objeto aún sirve, puedes marcar «Ofrecer también en el Marketplace comunitario».',
          'Toca «Crear solicitud de retiro».',
          'Verás la confirmación con el número de folio. Toca «Ver seguimiento en Mis solicitudes».',
        ],
        figuras: [
          { src: `${D}03-nueva-solicitud.jpg`, alt: 'Formulario de nueva solicitud con el tipo de residuo Sillón 2 cuerpos, su tarifa referencial, la cantidad y la foto de dos sillones.', caption: 'Elige el objeto y agrega la foto.' },
          { src: `${D}04-nueva-solicitud-envio.jpg`, alt: 'Parte baja del formulario con la dirección de retiro, la descripción, la opción de ofrecer en el Marketplace y el botón «Crear solicitud de retiro».', caption: 'Indica la dirección y envía la solicitud.' },
          { src: `${D}05-solicitud-creada.jpg`, alt: 'Confirmación «Solicitud ingresada» con el folio, el resumen del pedido y el estado inicial En revisión.', caption: 'Tu solicitud quedó ingresada.' },
        ],
      },
    ],
  },
  {
    id: 'seguir-solicitud',
    titulo: 'Seguir tu solicitud',
    bloques: [
      {
        pasos: [
          'Desde el inicio, toca «Mis solicitudes».',
          'Verás todas tus solicitudes con su estado: En revisión, Aprobada, Rechazada u otros.',
          'Toca una solicitud para ver el detalle: foto, dirección y descripción.',
          'Si te piden cambios, corrige lo que te indican y vuelve a enviar.',
          'Si ya no quieres el retiro, usa «Cancelar solicitud» al final del detalle.',
        ],
        figuras: [
          { src: `${D}06-mis-solicitudes.jpg`, alt: 'Lista de Mis solicitudes con tarjetas de distintos objetos y sus estados En revisión, Rechazada y Aprobada.', caption: 'Lista de tus solicitudes y su estado.' },
          { src: `${D}07-detalle-solicitud.jpg`, alt: 'Detalle de una solicitud con la foto de dos sillones, la dirección, la descripción y los botones para publicar en el Marketplace o cancelar.', caption: 'Detalle de una solicitud.' },
        ],
      },
    ],
  },
  {
    id: 'pagar',
    titulo: 'Pagar el retiro',
    bloques: [
      {
        pasos: [
          'Cuando la municipalidad aprueba tu solicitud, aparece un aviso amarillo «Pago de retiro pendiente».',
          'Toca «Pagar retiro».',
          'Revisa el total y toca «Pagar con Webpay».',
          'Paga con tu tarjeta de débito o crédito en el sitio de Webpay. Al terminar, vuelves a A.R.C.A.',
          'Verás el comprobante «Pago acreditado». Puedes imprimirlo o guardarlo.',
          'Tu solicitud pasa a coordinación con la empresa de retiro.',
        ],
        figuras: [
          { src: `${D}08-pago-pendiente.jpg`, alt: 'Detalle de una solicitud aprobada con el aviso amarillo de pago pendiente y el botón verde «Pagar retiro».', caption: 'Aviso de pago pendiente.' },
          { src: `${D}09-pago-webpay.jpg`, alt: 'Pantalla de pago de derechos municipales con el total a pagar y el botón «Pagar con Webpay».', caption: 'Revisa el total y paga con Webpay.' },
          { src: `${D}10-pago-aprobado.jpg`, alt: 'Comprobante «Pago acreditado» con el total pagado, el número de solicitud y la fecha.', caption: 'Comprobante del pago.' },
        ],
      },
    ],
  },
  {
    id: 'avisos',
    titulo: 'Avisos',
    bloques: [
      {
        pasos: [
          'Toca la campana de arriba. El número indica cuántos avisos nuevos tienes.',
          'En «Mensajes» ves las conversaciones del Marketplace con mensajes sin leer.',
          'En «Novedades» ves cambios en tus solicitudes, créditos ganados y calificaciones.',
          'Toca un aviso para ir directo a lo que cambió.',
        ],
        figuras: [
          { src: `${D}11-avisos.jpg`, alt: 'Pantalla de Avisos con dos mensajes de chat sin leer y novedades de Circular Credits y calificaciones.', caption: 'Mensajes y novedades.' },
        ],
      },
    ],
  },
  {
    id: 'marketplace',
    titulo: 'Marketplace: regalar e intercambiar',
    bloques: [
      {
        titulo: 'Publicar un artículo',
        pasos: [
          'Toca «Mercado», en el menú de abajo. Ahí ves lo que ofrecen tus vecinos.',
          'Toca «Publicar».',
          'Si ya pediste un retiro, puedes elegir ese objeto para completar los datos.',
          'Agrega una foto, elige si quieres regalarlo o intercambiarlo y escribe un título.',
          'Indica el tipo de objeto y, si quieres, una descripción.',
          'Toca «Publicar». La Municipalidad la revisa antes de mostrarla.',
        ],
        figuras: [
          { src: `${D}12-marketplace-listado.jpg`, alt: 'Listado del Marketplace con el botón Publicar, las pestañas Explorar, Mis publicaciones y Mensajes, filtros y artículos de vecinos.', caption: 'Listado del Marketplace.' },
          { src: `${D}13-publicar-articulo.jpg`, alt: 'Pantalla Publicar artículo con tus solicitudes de retiro para elegir y el espacio para la foto.', caption: 'Puedes partir desde una solicitud ya hecha.' },
          { src: `${D}14-publicar-formulario.jpg`, alt: 'Formulario de publicación con las opciones Regalarlo e Intercambiarlo, título, tipo de objeto, descripción y el botón Publicar.', caption: 'Completa los datos y publica.' },
        ],
      },
      {
        titulo: 'Interesarte en un artículo y chatear',
        pasos: [
          'Abre el artículo que te interesa.',
          'Toca «Me interesa».',
          'Se abre un chat con quien lo publicó. Salúdalo y ponte de acuerdo con él.',
          'No escribas tu dirección en el chat mientras el artículo no esté reservado.',
        ],
        figuras: [
          { src: `${D}15-detalle-articulo-me-interesa.jpg`, alt: 'Detalle de un estante de madera con su descripción, quién lo publicó, el botón «Me interesa» y el enlace para denunciar la publicación.', caption: 'Detalle del artículo.' },
          { src: `${D}16-chat.jpg`, alt: 'Chat entre dos vecinos que acuerdan el retiro de un estante, con el botón Reservar arriba.', caption: 'Chat con el otro vecino.' },
        ],
      },
      {
        titulo: 'Reservar y entregar con código',
        pasos: [
          'Si publicaste tú el artículo, en el chat toca «Reservar» para elegir a quién se lo das.',
          'Confirma con «Sí, reservar». Los demás chats de ese artículo quedan solo de lectura.',
          'Quien recibe el artículo ve un código de 6 dígitos en su pantalla. Debe mostrarlo solo cuando tenga el artículo en la mano.',
          'Quien entrega le pide el código, lo escribe en «Código de entrega» y toca «Confirmar entrega».',
          'Si algo falla, puedes tocar «Liberar reserva».',
          'Al confirmar, la entrega queda registrada y se suman los créditos.',
        ],
        figuras: [
          { src: `${D}17-reservar-confirmacion.jpg`, alt: 'Chat con la pregunta de confirmación para reservar el artículo y los botones Cancelar y «Sí, reservar».', caption: 'Confirma la reserva.' },
          { src: `${D}19-codigo-entrega-receptor.jpg`, alt: 'Ventana «Tu código de entrega» con un código de 6 dígitos y el aviso de mostrarlo solo con el artículo en la mano.', caption: 'Código que ve quien recibe.' },
          { src: `${D}18-entrega-pendiente-publicador.jpg`, alt: 'Sección «Entrega pendiente» con el espacio para escribir el código de entrega y los botones Confirmar entrega y Liberar reserva.', caption: 'Quien entrega escribe el código.' },
          { src: `${D}20-entrega-confirmada.jpg`, alt: 'Artículo marcado como Completado con el mensaje «Entrega confirmada».', caption: 'Entrega confirmada.' },
        ],
      },
      {
        titulo: 'Calificar el intercambio',
        pasos: [
          'Después de recibir el artículo, verás «¿Cómo estuvo el intercambio?».',
          'Toca de 1 a 5 estrellas.',
          'Si quieres, escribe un comentario.',
          'Toca «Enviar calificación». Con 4 o 5 estrellas, la otra persona recibe un bono de créditos.',
        ],
        figuras: [
          { src: `${D}21-calificar-intercambio.jpg`, alt: 'Formulario para calificar el intercambio con cinco estrellas, un comentario opcional y el botón Enviar calificación.', caption: 'Califica con estrellas.' },
        ],
      },
    ],
  },
  {
    id: 'denunciar',
    titulo: 'Denunciar un problema',
    bloques: [
      {
        pasos: [
          'En el artículo o en el chat, toca «Denunciar».',
          'Elige qué pasó, por ejemplo «No se presentó a la entrega acordada».',
          'Si quieres, cuenta más. No escribas direcciones, teléfonos ni RUN.',
          'Toca «Enviar denuncia». La revisa la Municipalidad y la otra persona no sabrá quién la hizo.',
          'Para ver el estado, entra a Perfil y luego a «Mis denuncias».',
        ],
        figuras: [
          { src: `${D}22-denunciar-modal.jpg`, alt: 'Ventana para denunciar con la lista de motivos, un cuadro para contar más y el botón Enviar denuncia.', caption: 'Elige el motivo.' },
          { src: `${D}23-mis-denuncias.jpg`, alt: 'Lista Mis denuncias con el motivo de cada una y su estado, Recibida o Resuelta.', caption: 'Estado de tus denuncias.' },
        ],
      },
    ],
  },
  {
    id: 'creditos-perfil',
    titulo: 'Circular Credits y perfil',
    bloques: [
      {
        titulo: 'Circular Credits',
        pasos: [
          'Toca «Créditos», en el menú de abajo.',
          'Arriba ves tu saldo y tu nivel.',
          'Más abajo hay premios y beneficios. Elige uno para canjearlo.',
          'En «Mis vales canjeados» ves lo que ya canjeaste.',
        ],
        figuras: [
          { src: `${D}24-circular-credits.jpg`, alt: 'Pantalla de Circular Credits con el saldo disponible, el nivel y la lista de premios canjeables.', caption: 'Tu saldo y los premios.' },
        ],
      },
      {
        titulo: 'Perfil y ayuda',
        pasos: [
          'Toca «Perfil» para ver tus datos, tu saldo de créditos y tus denuncias.',
          'Desde ahí también puedes entrar a «Ayuda» para ver preguntas frecuentes y este manual.',
        ],
        figuras: [
          { src: `${D}25-perfil.jpg`, alt: 'Perfil del vecino con su nombre, el estado de la cuenta y el saldo de Circular Credits.', caption: 'Tu perfil.' },
          { src: `${D}26-ayuda.jpg`, alt: 'Pantalla de Ayuda con las secciones Preguntas frecuentes, Guía paso a paso y Hablar con una persona.', caption: 'Pantalla de Ayuda.' },
        ],
      },
    ],
  },
];

export default function ManualVecinos() {
  return (
    <ManualLayout
      titulo="Manual para vecinos"
      intro="Cómo usar A.R.C.A. paso a paso: pedir un retiro, pagar, regalar o intercambiar objetos y ganar créditos."
      secciones={SECCIONES}
      movil
      nota="Las capturas usan datos de ejemplo. Lo que ves en tu pantalla puede variar un poco."
    />
  );
}
