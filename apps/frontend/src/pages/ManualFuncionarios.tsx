import ManualLayout, { type SeccionManual } from '../components/ManualLayout';

// HU-39: manual de uso para funcionarios municipales. Capturas con datos
// ficticios en public/manuales/funcionarios.
const D = '/manuales/funcionarios/';

const SECCIONES: SeccionManual[] = [
  {
    id: 'entrar',
    titulo: 'Entrar y elegir el panel',
    bloques: [
      {
        pasos: [
          'Entra a A.R.C.A. con tu ClaveÚnica.',
          'Como tu cuenta es municipal, verás dos opciones: «Modo vecino» y «Modo funcionario».',
          'Elige «Modo funcionario» para abrir el panel municipal.',
          'A la izquierda tienes el menú: Solicitudes, Marketplace, Denuncias, Métricas, Derivación, Pagadas y Mapa de calor. El administrador también ve Auditoría.',
        ],
        figuras: [
          { src: `${D}01-seleccion-inicio.jpg`, alt: 'Pantalla de bienvenida con las opciones «Modo vecino» y «Modo funcionario».', caption: 'Elige el modo funcionario.' },
        ],
      },
    ],
  },
  {
    id: 'solicitudes',
    titulo: 'Revisar solicitudes de retiro',
    bloques: [
      {
        titulo: 'Abrir una solicitud',
        pasos: [
          'En el menú, entra a «Solicitudes».',
          'Usa los filtros de arriba para ver las que están En revisión, Aprobadas, Rechazadas u otras.',
          'Las que llevan más de 48 horas sin revisar aparecen marcadas en rojo. Atiéndelas primero.',
          'Toca una solicitud para abrirla. Verás la foto, la categoría, la dirección y la descripción.',
        ],
        figuras: [
          { src: `${D}02-bandeja-solicitudes.jpg`, alt: 'Bandeja de solicitudes de retiro con filtros por estado y tarjetas que muestran el folio, el objeto y las horas sin revisar.', caption: 'Bandeja de solicitudes.' },
          { src: `${D}03-detalle-solicitud.jpg`, alt: 'Detalle de una solicitud con la foto del objeto, la categoría, la fecha, la dirección y la descripción.', caption: 'Detalle de una solicitud.' },
        ],
      },
      {
        titulo: 'Aprobar o rechazar',
        pasos: [
          'Baja hasta el cuadro «Revisión».',
          'Confirma el objeto y la categoría del residuo. Corrígelos si hace falta.',
          'Revisa el valor a cobrar. Viene sugerido por el catálogo y puedes modificarlo antes de aprobar.',
          'Marca la lista de verificación: foto clara, categoría correcta, volumen razonable, dirección dentro de la comuna y sin duplicados.',
          'Toca «Aprobar» para que el vecino pueda pagar, o «Rechazar» si no corresponde.',
        ],
        figuras: [
          { src: `${D}04-revision-aprobar-rechazar.jpg`, alt: 'Cuadro de Revisión con el objeto, la categoría, el valor a cobrar, la lista de verificación y los botones Aprobar, Pedir modificación y Rechazar.', caption: 'Cuadro de revisión.' },
        ],
      },
      {
        titulo: 'Pedir una modificación',
        pasos: [
          'En el cuadro «Revisión», toca «Pedir modificación».',
          'Elige el motivo, por ejemplo «La foto no permite ver el residuo».',
          'Escribe un comentario claro para el vecino.',
          'Toca «Confirmar». La solicitud queda en «Modificación pedida» y el vecino recibe el aviso.',
        ],
        figuras: [
          { src: `${D}05-pedir-modificacion.jpg`, alt: 'Formulario para pedir modificación con el motivo, el comentario para el vecino y el botón Confirmar.', caption: 'Pide un cambio al vecino.' },
        ],
      },
    ],
  },
  {
    id: 'marketplace',
    titulo: 'Moderar el Marketplace',
    bloques: [
      {
        pasos: [
          'En el menú, entra a «Marketplace».',
          'Abre una publicación pendiente.',
          'Revisa la foto, el título y la descripción. Verifica que sea un objeto en buen estado y que no pida dinero ni datos personales.',
          'Si cumple, pulsa «Aprobar y tasar». Indica cuántos Circular Credits recibirá el vecino que publica cuando complete la entrega con el código, y pulsa «Confirmar».',
          'Recházala si no cumple, indicando el motivo.',
        ],
      },
    ],
  },
  {
    id: 'denuncias',
    titulo: 'Revisar denuncias',
    bloques: [
      {
        pasos: [
          'En el menú, entra a «Denuncias».',
          'Usa las pestañas Abiertas, En investigación y Cerradas.',
          'Fíjate en cuántas denuncias acumula la persona denunciada: se muestra junto a su nombre.',
          'Toca una denuncia para ver el detalle y los mensajes adjuntos, si hay.',
          'Escribe la resolución. Es obligatoria para resolver o rechazar.',
          'Toca «En investigación», «Resolver» o «Rechazar», según corresponda.',
        ],
        figuras: [
          { src: `${D}08-denuncias-lista.jpg`, alt: 'Lista de denuncias con fecha, motivo, origen, denunciante, denunciado, artículo y estado.', caption: 'Lista de denuncias.' },
          { src: `${D}09-denuncia-detalle-acciones.jpg`, alt: 'Detalle de una denuncia con sus datos, el cuadro de resolución y los botones En investigación, Resolver y Rechazar.', caption: 'Detalle y acciones.' },
          { src: `${D}10-denuncia-mensajes-adjuntos.jpg`, alt: 'Denuncia resuelta con la resolución escrita y los mensajes del chat que el denunciante adjuntó como prueba.', caption: 'Mensajes adjuntos como prueba.' },
        ],
      },
    ],
  },
  {
    id: 'pagadas-derivacion',
    titulo: 'Solicitudes pagadas y derivación',
    bloques: [
      {
        titulo: 'Pagadas',
        pasos: [
          'En el menú, entra a «Pagadas».',
          'Filtra por estado, fechas o sector.',
          'Arriba ves la cantidad de solicitudes y el total pagado.',
          'Si necesitas el listado, toca «Descargar CSV» o «Descargar Excel».',
        ],
        figuras: [
          { src: `${D}11-pagadas.jpg`, alt: 'Pantalla de solicitudes pagadas con filtros, el total pagado y una tabla con cada solicitud, su sector y su monto.', caption: 'Solicitudes pagadas.' },
        ],
      },
      {
        titulo: 'Derivación a la empresa',
        pasos: [
          'En el menú, entra a «Derivación».',
          'Revisa cuántas solicitudes están listas para derivar y cuántas esperan el pago del vecino.',
          'Toca «Generar lote y descargar Excel». Las solicitudes incluidas pasan a «Derivada».',
          'Envía el Excel a la empresa de retiro. No incluye fotos ni datos que identifiquen al vecino.',
          'Los lotes anteriores quedan en la lista y puedes descargarlos de nuevo.',
        ],
        figuras: [
          { src: `${D}12-derivacion.jpg`, alt: 'Pantalla de derivación con las solicitudes listas para derivar, el botón para generar el lote y la lista de lotes anteriores.', caption: 'Generar un lote.' },
        ],
      },
    ],
  },
  {
    id: 'metricas-mapa',
    titulo: 'Métricas y mapa de calor',
    bloques: [
      {
        titulo: 'Métricas',
        pasos: [
          'En el menú, entra a «Métricas».',
          'Elige el período arriba a la derecha: 7, 30 o 90 días.',
          'Mira las solicitudes recibidas, las que están en revisión y la espera promedio.',
          'Más abajo ves las decisiones de revisión y las categorías de residuo más frecuentes.',
        ],
        figuras: [
          { src: `${D}13-metricas.jpg`, alt: 'Panel de métricas con tarjetas de totales, un gráfico de solicitudes por día y las decisiones de revisión.', caption: 'Panel de métricas.' },
        ],
      },
      {
        titulo: 'Mapa de calor',
        pasos: [
          'En el menú, entra a «Mapa de calor».',
          'El mapa muestra la demanda de cada sector de la comuna. Rojo es demanda alta, naranja media y verde baja.',
          'Cambia entre «Volumen» y «Pendientes» con los botones de arriba.',
          'A la derecha ves el ranking de sectores.',
        ],
        figuras: [
          { src: `${D}14-mapa-calor.jpg`, alt: 'Mapa de la comuna con círculos de colores por sector y el ranking de sectores a la derecha.', caption: 'Mapa de calor por sector.' },
        ],
      },
    ],
  },
  {
    id: 'auditoria',
    titulo: 'Auditoría (solo administrador)',
    bloques: [
      {
        pasos: [
          'Esta opción solo aparece si tu cuenta es de administrador.',
          'En el menú, entra a «Auditoría».',
          'Arriba ves el total de acciones, los inicios de sesión y las acciones críticas.',
          'Filtra por fechas o por usuario, o busca por usuario, acción u objeto.',
          'Para guardar el registro, toca «Descargar CSV» o «Descargar Excel».',
        ],
        figuras: [
          { src: `${D}15-auditoria.jpg`, alt: 'Log de auditoría con totales, filtros y una tabla de acciones con usuario, acción, objeto y hora.', caption: 'Registro de auditoría.' },
        ],
      },
    ],
  },
];

export default function ManualFuncionarios() {
  return (
    <ManualLayout
      titulo="Manual para funcionarios"
      intro="Cómo usar el panel municipal: revisar solicitudes, moderar el Marketplace, atender denuncias y mirar las métricas."
      secciones={SECCIONES}
      movil={false}
      nota="Las capturas usan datos de ejemplo. Lo que ves en tu pantalla puede variar un poco."
    />
  );
}
