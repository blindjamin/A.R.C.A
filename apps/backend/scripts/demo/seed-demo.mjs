// Las fechas respetan los plazos de conservación del backend (chat 30 d, direcciones 30 d tras el cierre, avisos 90 d).
// Datos de demostración para la Feria de Software: llena ARCA por la API y usa SQL
// solo para lo que no se puede hacer sin navegador (fechas hacia atrás, pagos Webpay).
//
// Uso (desde apps/backend):   node scripts/demo/seed-demo.mjs
// Variables: BASE_URL (http://localhost:3000), ORIGIN (primer FRONTEND_URL),
//            RATE_GENERAL (peticiones/min, 100), CHAT_MS (pausa entre mensajes, 2300),
//            FORCE=1 (permite correr aunque la base ya tenga solicitudes).
// No envía correos: nunca llama a /api/mail ni guarda correos de vecinos.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

const AQUI = dirname(fileURLToPath(import.meta.url));
config({ path: join(AQUI, '..', '..', '.env.local') }); // las variables de entorno ganan

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ORIGIN =
  process.env.ORIGIN ||
  (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
const RATE_GENERAL = Number(process.env.RATE_GENERAL || 100);
const CHAT_MS = Number(process.env.CHAT_MS || 2300);
const RATE_LOGIN = 8;

const VECINO_COMPARTIDO = '00000000-0000-4000-8000-000000000001';
// Funcionarios y admin sembrados por las migraciones (id del ciudadano base).
const REVISORES = [
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000006',
  '00000000-0000-4000-8000-000000000007',
];
const ADMIN = '00000000-0000-4000-8000-000000000003';

const DIA = 864e5;
const AHORA = new Date();
const hace = (dias) => new Date(AHORA.getTime() - dias * DIA);
const despues = (fecha, dias) => new Date(fecha.getTime() + dias * DIA);
const tope = (fecha) => new Date(Math.min(fecha.getTime(), AHORA.getTime() - 600000));
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

// Generador pseudoaleatorio con semilla: la misma corrida da los mismos datos.
let semilla = 20261113;
const azar = () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const entre = (a, b) => a + azar() * (b - a);
const reparte = (a, b, i, n) => (n <= 1 ? a : a + ((b - a) * i) / (n - 1)) + entre(-0.4, 0.4);

// ---------------------------------------------------------------- HTTP con ritmo
const ventana = [];
const ventanaLogin = [];
async function esperarCupo(lista, max) {
  for (;;) {
    const ahora = Date.now();
    while (lista.length && ahora - lista[0] > 60000) lista.shift();
    if (lista.length < max) {
      lista.push(ahora);
      return;
    }
    await dormir(60000 - (ahora - lista[0]) + 50);
  }
}

async function api(sesion, metodo, ruta, { json, form, query, ok = [200, 201, 204] } = {}) {
  const url = new URL(BASE_URL + ruta);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  for (let intento = 0; intento < 8; intento++) {
    await esperarCupo(ventana, RATE_GENERAL);
    if (ruta === '/api/auth/dev/login') await esperarCupo(ventanaLogin, RATE_LOGIN);
    const headers = { Origin: ORIGIN };
    if (sesion?.cookie) headers.Cookie = sesion.cookie;
    let body;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) body = form;
    const res = await fetch(url, { method: metodo, headers, body, redirect: 'manual' });
    if (res.status === 429) {
      log(`  (429 en ${metodo} ${ruta}, espero 20 s)`);
      await dormir(20000);
      continue;
    }
    const texto = await res.text();
    let dato = texto;
    try {
      dato = texto ? JSON.parse(texto) : null;
    } catch {
      /* respuesta no JSON */
    }
    if (!ok.includes(res.status)) {
      throw new Error(`${metodo} ${ruta} -> ${res.status} ${texto.slice(0, 300)}`);
    }
    return { status: res.status, dato, res };
  }
  throw new Error(`${metodo} ${ruta}: demasiados 429`);
}

async function ingresar(ciudadanoId, nombre) {
  const { res } = await api(null, 'POST', '/api/auth/dev/login', {
    json: nombre ? { ciudadanoId, nombre } : { ciudadanoId },
  });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith('arca_sesion='));
  if (!cookie) throw new Error('El login no entregó la cookie arca_sesion');
  const s = { cookie };
  s.id = (await api(s, 'GET', '/api/sesion')).dato.ciudadanoId;
  return s;
}

const foto = (nombre) => {
  const buf = readFileSync(join(AQUI, 'fotos', nombre + '.jpg'));
  return new Blob([buf], { type: 'image/jpeg' });
};
const formulario = (campos, fotoNombre) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) if (v !== undefined && v !== null) f.append(k, String(v));
  if (fotoNombre) f.append('foto', foto(fotoNombre), fotoNombre + '.jpg');
  return f;
};

// ---------------------------------------------------------------- Datos
const NOMBRES = [
  'María José Soto', 'Carlos Muñoz', 'Camila Fuentes', 'Felipe Araya', 'Daniela Rojas',
  'Matías Contreras', 'Francisca Tapia', 'Sebastián Vega', 'Valentina Pizarro',
  'Ignacio Sepúlveda', 'Constanza Núñez', 'Rodrigo Henríquez',
  null, // 12: el vecino compartido del botón «Vecino» (sin nombre de sesión)
];

const SECTORES = {
  centro: { nombre: 'Santo Domingo Centro', lat: -33.6366, lng: -71.6264, calles: ['Av. Santo Domingo', 'Calle Los Alerces', 'Pasaje Las Gaviotas', 'Calle El Roble'] },
  rocas: { nombre: 'Rocas de Santo Domingo', lat: -33.6402, lng: -71.636, calles: ['Av. Las Rocas', 'Camino Los Peumos', 'Calle El Faro', 'Pasaje Los Canelos'] },
  sanenrique: { nombre: 'San Enrique', lat: -33.6534, lng: -71.5905, calles: ['Camino San Enrique', 'Calle Los Almendros', 'Pasaje El Molino', 'Calle Las Parcelas'] },
  bahia: { nombre: 'Bahía', lat: -33.6275, lng: -71.63, calles: ['Av. Costanera', 'Calle La Bahía', 'Pasaje Las Conchas', 'Calle Los Pescadores'] },
  lasbrisas: { nombre: 'Las Brisas', lat: -33.67, lng: -71.645, calles: ['Av. Las Brisas', 'Calle Los Pinos', 'Pasaje Las Dunas', 'Camino Lagunillas'] },
  elconvento: { nombre: 'El Convento', lat: -33.7225, lng: -71.62, calles: ['Camino El Convento', 'Calle Los Quillayes', 'Pasaje Las Violetas', 'Camino a Bucalemu'] },
  litoral: { nombre: 'Litoral Norte', lat: -33.61, lng: -71.64, calles: ['Av. Litoral', 'Calle Los Cormoranes', 'Pasaje Las Gaviotas Norte', 'Calle El Alba'] },
};
const punto = (sec) => {
  const s = SECTORES[sec];
  return {
    lat: (s.lat + entre(-0.0022, 0.0022)).toFixed(6),
    lng: (s.lng + entre(-0.0022, 0.0022)).toFixed(6),
    dir: `${s.calles[Math.floor(azar() * 4)]} ${Math.floor(entre(12, 1480))}, ${s.nombre}, Santo Domingo`,
  };
};

const DESCRIPCIONES = [
  'Está en el antejardín, se puede retirar sin problema.',
  'Pesa bastante, se necesitan dos personas para moverlo.',
  'Lo dejo en la entrada de la casa; hay buen acceso para un camión.',
  'Ya no lo usamos, quedó de una mudanza y no tenemos dónde guardarlo.',
  'Está en buen estado general, solo con el desgaste normal por los años.',
];

// st: rev | reenv | mod | rech | canc | apPend | apPag | ret1 | nor1 | ret2 | nor2 | der2
// o: [idCatalogo, cantidad] u ['otro', nombre, cantidad]; monto: presupuesto si hay objeto fuera del catálogo.
const SOLICITUDES = [
  { v: 0, sec: 'centro', o: [[24, 1]], f: 'sofa-living', st: 'ret1' },
  { v: 1, sec: 'rocas', o: [[6, 1]], f: 'refrigerador-frigidaire', st: 'ret1' },
  { v: 2, sec: 'sanenrique', o: [[8, 1]], f: 'lavadora-carga-superior', st: 'ret1' },
  { v: 3, sec: 'bahia', o: [[17, 1]], f: 'colchon-descartado', st: 'ret1' },
  { v: 4, sec: 'lasbrisas', o: [[21, 1]], f: 'televisor-descartado', st: 'ret1' },
  { v: 5, sec: 'elconvento', o: [['otro', 'Ropero de madera de dos puertas', 1]], f: 'ropero-madera', st: 'ret1', monto: 12000 },
  { v: 6, sec: 'litoral', o: [[19, 1], [18, 1]], f: 'microondas-lg', st: 'ret1' },
  { v: 7, sec: 'centro', o: [[10, 1]], f: 'cocina-a-gas', st: 'ret1' },
  { v: 8, sec: 'rocas', o: [[23, 1]], f: 'sofa-gris', st: 'ret1' },
  { v: 9, sec: 'sanenrique', o: [[12, 1]], f: 'estufa-parafina', st: 'nor1' },
  { v: 10, sec: 'bahia', o: [[27, 1]], f: 'inodoro', st: 'ret2' },
  { v: 11, sec: 'lasbrisas', o: [['otro', 'Mesa de comedor de roble', 1], ['otro', 'Sillas de comedor', 4]], f: 'mesa-comedor', st: 'ret2', monto: 18000 },
  { v: 0, sec: 'elconvento', o: [[16, 1]], f: 'colchon-pillowtop', st: 'nor2' },
  { v: 1, sec: 'litoral', o: [[7, 1]], f: 'lavadora-carga-superior', st: 'der2' },
  { v: 2, sec: 'centro', o: [[22, 2]], f: 'sillon-verde', st: 'der2' },
  { v: 3, sec: 'rocas', o: [['otro', 'Escritorio de madera', 1]], f: 'escritorio', st: 'der2', monto: 9000 },
  { v: 4, sec: 'sanenrique', o: [['otro', 'Sillas de madera tapizadas', 4]], f: 'silla-madera', st: 'der2', monto: 14000 },
  { v: 5, sec: 'bahia', o: [[5, 1]], f: 'refrigerador-panasonic', st: 'apPag' },
  { v: 6, sec: 'lasbrisas', o: [['otro', 'Bicicleta antigua', 1]], f: 'bicicleta-vieja', st: 'apPag', monto: 6000 },
  { v: 7, sec: 'elconvento', o: [[9, 1]], f: 'cocina-a-gas', st: 'apPag' },
  { v: 8, sec: 'litoral', o: [[20, 1], [19, 1]], f: 'microondas-panasonic', st: 'apPend' },
  { v: 9, sec: 'centro', o: [['otro', 'Estante de madera para libros', 1]], f: 'estante-madera', st: 'apPend', monto: 7500 },
  { v: 10, sec: 'rocas', o: [[13, 1]], f: 'estufa-parafina', st: 'apPend' },
  { v: 11, sec: 'sanenrique', o: [[18, 2]], f: 'aspiradora', st: 'apPend' },
  { v: 2, sec: 'bahia', o: [['otro', 'Coche de bebé', 1]], f: 'coche-bebe', st: 'rev' },
  { v: 12, sec: 'centro', o: [[22, 1]], f: 'sillon-floral', st: 'rev' },
  { v: 3, sec: 'lasbrisas', o: [[15, 1]], f: 'colchon-descartado', st: 'rev' },
  { v: 4, sec: 'elconvento', o: [['otro', 'Bicicleta de carrera', 1]], f: 'bicicleta-carrera', st: 'rev' },
  { v: 5, sec: 'litoral', o: [[8, 1]], f: 'lavadora-carga-superior', st: 'rev' },
  { v: 6, sec: 'rocas', o: [[21, 1]], f: 'televisor-descartado', st: 'reenv', m: 'foto_insuficiente' },
  { v: 7, sec: 'sanenrique', o: [[24, 1]], f: 'sofa-living', st: 'reenv', m: 'descripcion_incompleta' },
  { v: 8, sec: 'centro', o: [[22, 1]], f: 'sillon-verde', st: 'mod', m: 'direccion_incompleta' },
  { v: 9, sec: 'bahia', o: [['otro', 'Mesa de madera', 1]], f: 'mesa-madera', st: 'mod', m: 'descripcion_incompleta' },
  { v: 12, sec: 'rocas', o: [[19, 1]], f: 'microondas-panasonic', st: 'mod', m: 'categoria_incorrecta' },
  { v: 10, sec: null, o: [[17, 1]], f: 'colchon-pillowtop', st: 'rech', m: 'fuera_de_comuna', dir: 'Av. Libertad 1450, Viña del Mar' },
  { v: 11, sec: 'sanenrique', o: [[27, 1], ['otro', 'Escombros de una remodelación (2 m3)', 1]], f: 'inodoro', st: 'rech', m: 'residuo_no_admitido' },
  { v: 1, sec: 'centro', o: [[6, 1]], f: 'refrigerador-frigidaire', st: 'rech', m: 'duplicada' },
  { v: 2, sec: 'rocas', o: [['otro', 'Sillas de madera', 2]], f: 'silla-madera', st: 'rech', m: 'otro' },
  { v: 3, sec: 'bahia', o: [[12, 1]], f: 'estufa-parafina', st: 'canc', motivo: 'Ya no necesito el retiro, se lo regalé a un vecino.' },
  { v: 12, sec: 'centro', o: [[17, 1]], f: 'colchon-pillowtop', st: 'canc', motivo: 'Me equivoqué de dirección, lo vuelvo a pedir.' },
];

const COMENTARIOS = {
  foto_insuficiente: 'La foto no deja ver el objeto completo. Sube una foto con el objeto entero y buena luz.',
  direccion_incompleta: 'Falta el número de la casa o una referencia para ubicar el retiro.',
  descripcion_incompleta: 'Indica el tamaño aproximado y si se puede mover entre dos personas.',
  categoria_incorrecta: 'Revisa la categoría elegida: no calza con lo que se ve en la foto.',
  fuera_de_comuna: 'La dirección está en Viña del Mar, fuera de la comuna de Santo Domingo.',
  residuo_no_admitido: 'Los escombros de obra no se retiran por este servicio. Contrata un contenedor o un flete autorizado.',
  duplicada: 'Ya existe una solicitud tuya para este mismo refrigerador.',
  otro: 'Las sillas sueltas se coordinan mejor en el Marketplace: publícalas como regalo y otro vecino las retira.',
};

const NOTAS = [
  [0, 'Llamé al vecino: confirma que hay acceso para camión por la calle principal.'],
  [5, 'Objeto de gran volumen, avisar a la empresa operadora antes del retiro.'],
  [9, 'Segundo intento de retiro sin éxito: el portón estaba cerrado y nadie atendió.'],
  [11, 'El presupuesto incluye las cuatro sillas, confirmado por teléfono.'],
  [17, 'Pago verificado, queda lista para el próximo lote de derivación.'],
  [24, 'Falta confirmar si el coche está completo, preguntar al vecino por la foto.'],
  [29, 'Reenviada con foto nueva, revisar con calma la categoría del televisor.'],
  [36, 'Se informó al vecino la alternativa de contratar un contenedor para escombros.'],
];

const CHECKLIST = { foto_clara: true, residuo_coincide: true, volumen_razonable: true, direccion_en_comuna: true, no_duplicada: true };

// Marketplace. p: publicador, c: id de catálogo u ['otro', nombre], st: estado final.
// compra: vecino al que se le reserva. consultan: otros interesados.
const ARTICULOS = [
  { p: 1, t: 'Sofá de tres cuerpos en buen estado', d: 'Tapiz gris, sin manchas ni rotos. Lo regalo porque cambié el living.', tipo: 'regalo', c: 24, f: 'sofa-living', sec: 'centro', st: 'completado', cred: 150, compra: 4, star: 5, com: 'Todo perfecto, el sofá estaba tal como en la foto. Muy amable.' },
  { p: 2, t: 'Refrigerador Frigidaire de dos puertas', d: 'Funciona muy bien, enfría perfecto. Lo cambié por uno más grande.', tipo: 'regalo', c: 6, f: 'refrigerador-frigidaire', sec: 'rocas', st: 'completado', cred: 180, compra: 6, star: 5, com: 'Excelente trato y el refrigerador funciona de maravilla.' },
  { p: 3, t: 'Lavadora de carga superior', d: 'Lavadora de 16 kg, lava bien. Tiene el cable un poco gastado pero funciona.', tipo: 'regalo', c: 8, f: 'lavadora-carga-superior', sec: 'sanenrique', st: 'completado', cred: 120, compra: 8, star: 4, com: 'Buena lavadora, llegué un poco tarde y igual me esperó.' },
  { p: 5, t: 'Microondas Panasonic', d: 'Microondas blanco de 20 litros, calienta bien. Incluye el plato giratorio.', tipo: 'regalo', c: 19, f: 'microondas-panasonic', sec: 'litoral', st: 'completado', cred: 100, compra: 10, star: 5, com: 'Rápido y puntual. Gracias por el microondas.' },
  { p: 7, t: 'Mesa de comedor de roble', d: 'Mesa maciza de seis puestos, con un par de marcas en una esquina. Sin sillas.', tipo: 'intercambio', c: ['otro', 'Mesa de comedor'], f: 'mesa-comedor', sec: 'lasbrisas', st: 'completado', cred: 200, compra: 0, star: 3, com: 'La mesa tenía más marcas de las que se veían en la foto.' },
  { p: 9, t: 'Refrigerador Panasonic con freezer', d: 'Refrigerador de dos puertas, color blanco, sin escarcha. Lo retiro con calma.', tipo: 'intercambio', c: 6, f: 'refrigerador-panasonic', sec: 'bahia', st: 'en_negociacion', cred: 160, compra: 11, consultan: [1] },
  { p: 11, t: 'Bicicleta de carrera italiana', d: 'Bicicleta de ruta antigua, cuadro de acero. Necesita cambio de cámaras.', tipo: 'intercambio', c: ['otro', 'Bicicleta de carrera'], f: 'bicicleta-carrera', sec: 'elconvento', st: 'en_negociacion', cred: 140, compra: 2, consultan: [6] },
  { p: 0, t: 'Sillón verde de terciopelo', d: 'Sillón de un cuerpo, muy cómodo. Solo le falta un cojín.', tipo: 'regalo', c: 22, f: 'sillon-verde', sec: 'centro', st: 'disponible', cred: 110, consultan: [3, 5] },
  { p: 4, t: 'Sillón floral vintage', d: 'Sillón con estampado de flores, estructura firme. Ideal para restaurar.', tipo: 'intercambio', c: 22, f: 'sillon-floral', sec: 'rocas', st: 'disponible', cred: 110, consultan: [7, 9, 12] },
  { p: 6, t: 'Colchón de dos plazas', d: 'Colchón pillow top, usado un año en pieza de visitas. Sin manchas.', tipo: 'regalo', c: 17, f: 'colchon-pillowtop', sec: 'lasbrisas', st: 'disponible', cred: 130, consultan: [1] },
  { p: 8, t: 'Microondas LG', d: 'Funciona perfecto, solo cambié de modelo. Retiro en horario de tarde.', tipo: 'regalo', c: 19, f: 'microondas-lg', sec: 'litoral', st: 'disponible', cred: 100, consultan: [2, 12] },
  { p: 10, t: 'Bicicleta de paseo antigua', d: 'Bicicleta de paseo, necesita un poco de cariño en los frenos.', tipo: 'regalo', c: ['otro', 'Bicicleta de paseo'], f: 'bicicleta-vieja', sec: 'sanenrique', st: 'disponible', cred: 90, consultan: [4] },
  { p: 3, t: 'Estante de madera para libros', d: 'Estante de cinco repisas, madera sólida. Se desarma para el traslado.', tipo: 'regalo', c: ['otro', 'Estante de madera'], f: 'estante-madera', sec: 'bahia', st: 'disponible', cred: 100, consultan: [6, 8] },
  { p: 2, t: 'Ropero de madera de dos puertas', d: 'Ropero antiguo con cajón inferior y llave. Pesa harto, se necesitan dos personas.', tipo: 'regalo', c: ['otro', 'Ropero de madera'], f: 'ropero-madera', sec: 'centro', st: 'disponible', cred: 120, consultan: [7] },
  { p: 12, t: 'Silla tapizada de madera', d: 'Silla de comedor tapizada en tela café. Tengo cuatro iguales.', tipo: 'regalo', c: ['otro', 'Silla de madera'], f: 'silla-madera', sec: 'elconvento', st: 'disponible', cred: 80, consultan: [9, 1] },
  { p: 5, t: 'Televisor de tubo 21 pulgadas', d: 'Televisor antiguo, enciende pero la imagen es oscura.', tipo: 'regalo', c: 21, f: 'televisor-descartado', sec: 'rocas', st: 'pendiente' },
  { p: 9, t: 'Mesa larga de madera', d: 'Mesa de madera para exterior o quincho, tablero grueso.', tipo: 'regalo', c: ['otro', 'Mesa de madera'], f: 'mesa-madera', sec: 'sanenrique', st: 'pendiente' },
  { p: 12, t: 'Coche de bebé', d: 'Coche con capota, ruedas en buen estado. Ideal para decoración o uso.', tipo: 'regalo', c: ['otro', 'Coche de bebé'], f: 'coche-bebe', sec: 'centro', st: 'pendiente' },
  { p: 7, t: 'Estufa a parafina Corona', d: 'Estufa a parafina, funciona bien.', tipo: 'regalo', c: 12, f: 'estufa-parafina', sec: 'bahia', st: 'rechazado', motivo: 'La foto no muestra la estufa completa ni su estado. Súbela de nuevo con mejor luz y sin el entorno.' },
  { p: 0, t: 'Aspiradora con bolsa', d: 'Aspiradora vertical, funciona. La retiro porque ya la regalé por otro lado.', tipo: 'regalo', c: 18, f: 'aspiradora', sec: 'litoral', st: 'retirado', cred: 70 },
];

const DIALOGOS = [
  [['i', 'Hola, buenas tardes. ¿Sigue disponible {o}?'], ['p', 'Hola, sí, sigue disponible.'], ['i', 'Qué bueno. ¿Podría pasar a retirarlo este fin de semana?'], ['p', 'Claro, el sábado en la mañana me acomoda. ¿Vienes en auto?'], ['i', 'Sí, voy con una camioneta y un amigo para ayudar a cargar.'], ['p', 'Perfecto, entonces te lo reservo. Cuando llegues me dictas el código que te va a aparecer en la app.'], ['i', 'Genial, muchas gracias. Nos vemos el sábado.']],
  [['i', 'Buen día, me interesa {o}. ¿Está en buen estado?'], ['p', 'Buen día. Sí, está en buen estado, solo tiene detalles por el uso. Si quieres te mando más fotos.'], ['i', 'No te preocupes, con la foto basta. ¿En qué horario puedo ir?'], ['p', 'Después de las 4 de la tarde, cualquier día de la semana.'], ['i', 'Perfecto, mañana a las 5 estoy por ahí. ¿Me lo puedes reservar?'], ['p', 'Listo, queda reservado para ti.']],
];
const CONSULTAS = [
  [['i', 'Hola, ¿todavía tienes {o}? Me serviría bastante.'], ['p', 'Hola, sí, todavía lo tengo. ¿Desde qué sector me escribes?'], ['i', 'Vivo en {s}, así que me queda cerca.'], ['p', 'Buenísimo, entonces coordinemos. ¿Puedes pasar el jueves o el viernes?']],
  [['i', 'Buenas tardes, ¿{o} se puede llevar en una camioneta chica o es muy grande?'], ['p', 'Buenas tardes. Es bastante voluminoso, mejor una camioneta mediana o un flete.'], ['i', 'Ya, entiendo. Voy a ver si consigo un flete y te aviso.']],
  [['i', 'Hola, me interesa {o}. ¿Aceptas intercambio por algo de decoración?'], ['p', 'Hola, claro, depende de lo que sea. ¿Qué tienes?'], ['i', 'Tengo un par de cuadros y una lámpara de pie en buen estado.'], ['p', 'Suena bien, mándame una foto cuando puedas y lo vemos.']],
];

// ---------------------------------------------------------------- Ejecución
const db = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  timezone: 'Z',
});
const q = async (sql, params) => (await db.query(sql, params))[0];

const yaHay = (await q('SELECT COUNT(*) n FROM solicitudes_retiro'))[0].n;
if (yaHay > 0 && process.env.FORCE !== '1') {
  console.error(`La base ya tiene ${yaHay} solicitudes. Corre sobre una base recién migrada o usa FORCE=1.`);
  process.exit(1);
}
log(`Base: ${process.env.DB_DATABASE} | API: ${BASE_URL} | Origin: ${ORIGIN}`);

// Sesiones
log('Ingresando funcionarios y vecinos...');
const rev = [];
for (const id of REVISORES) rev.push(await ingresar(id));
const admin = await ingresar(ADMIN);
const vec = [];
for (let i = 0; i < NOMBRES.length; i++) {
  vec.push(await ingresar(VECINO_COMPARTIDO, NOMBRES[i] ?? undefined));
}
let turno = 0;
const revisor = () => rev[turno++ % rev.length];

const catalogo = (await api(vec[0], 'GET', '/api/residuos/catalogo')).dato;
const catPorId = new Map(catalogo.map((r) => [r.id, r]));

// Marcadores para las fechas: todo lo que crea el script queda registrado aquí.
const S = []; // solicitudes
const pagos = [];

// 1) Solicitudes de retiro
log('Creando solicitudes...');
const orden = { ret1: 0, nor1: 0, ret2: 0, nor2: 0, der2: 0, apPag: 0, apPend: 0, rev: 0, reenv: 0, mod: 0, rech: 0, canc: 0 };
const total = {};
for (const s of SOLICITUDES) total[s.st] = (total[s.st] || 0) + 1;
const rangoT0 = {
  A1: [170, 30], A2: [40, 14], apPag: [10, 3], apPend: [6, 1], rev: [2, 0.1], reenv: [9, 5], mod: [5, 1], canc: [30, 12],
};
const t0Rech = [150, 90, 60, 25];
const t0De = (s, i) => {
  const r = s.st === 'ret1' || s.st === 'nor1' ? 'A1' : ['ret2', 'nor2', 'der2'].includes(s.st) ? 'A2' : s.st;
  if (r === 'rech') return t0Rech[orden.rech];
  const base = r === 'A1' ? 10 : r === 'A2' ? 7 : total[r];
  const idx = r === 'A1' ? i : r === 'A2' ? i - 10 : orden[s.st];
  const [a, b] = rangoT0[r];
  return Math.max(0.1, reparte(a, b, idx, base));
};
for (let i = 0; i < SOLICITUDES.length; i++) {
  const s = SOLICITUDES[i];
  const pt = s.sec ? punto(s.sec) : { dir: s.dir };
  const objetos = s.o.map((o) =>
    o[0] === 'otro' ? { nombreOtro: o[1], cantidad: o[2] } : { residuoCatalogoId: o[0], cantidad: o[1] },
  );
  const desc = s.st === 'mod' ? 'Lo que se ve en la foto.' : DESCRIPCIONES[i % DESCRIPCIONES.length];
  const campos = {
    usuarioCiudadanoId: vec[s.v].id,
    objetos: JSON.stringify(objetos),
    direccionRetiro: pt.dir,
    descripcion: desc,
    latitudCapturada: pt.lat,
    longitudCapturada: pt.lng,
  };
  const { dato } = await api(vec[s.v], 'POST', '/api/solicitudes-retiro', { form: formulario(campos, s.f) });
  const t0 = t0De(s, i);
  orden[s.st]++;
  const reg = { id: dato.id, ...s, t0, fSol: hace(t0), eventos: [] };
  S.push(reg);
}
const porSt = (st) => S.filter((s) => s.st === st);
log(`  ${S.length} solicitudes creadas`);

const aprobar = async (s) => {
  const body = { decision: 'aprobada', checklist: CHECKLIST };
  if (s.monto) body.montoFinal = s.monto;
  await api(revisor(), 'POST', `/api/admin/solicitudes/${s.id}/revision`, { json: body });
  s.fRev = tope(despues(s.fSol, entre(0.4, 1.5)));
};

// Pago aprobado de Webpay, replicado por SQL (el pago real necesita navegador).
const pagar = async (s, fecha) => {
  const [fila] = await q('SELECT monto, usuario_ciudadano_id u FROM solicitudes_retiro WHERE id=?', [s.id]);
  const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(azar() * 16)]).join('');
  await q(
    `INSERT INTO pagos_webpay (solicitud_retiro_id, buy_order, session_id, token, monto, estado, codigo_autorizacion, fecha_transaccion)
     VALUES (?,?,?,?,?, 'autorizado', ?, ?)`,
    [s.id, `r${s.id.toString(36)}${hex(8)}`.slice(0, 26), hex(32), 'demo' + hex(60), fila.monto, String(Math.floor(entre(100000, 999999))), AHORA],
  );
  await q("UPDATE solicitudes_retiro SET estado_pago='pagado' WHERE id=?", [s.id]);
  const [ult] = await q('SELECT saldo_nuevo FROM transacciones_circular_credits WHERE usuario_ciudadano_id=? ORDER BY id DESC LIMIT 1', [fila.u]);
  const saldo = ult?.saldo_nuevo ?? 0;
  const razon = `Retiro municipal de la solicitud #${s.id}`;
  await q(
    `INSERT INTO transacciones_circular_credits (usuario_ciudadano_id, solicitud_retiro_id, monto_creditos, tipo, origen, razon, saldo_anterior, saldo_nuevo, fecha_transaccion)
     VALUES (?,?,50,'bonificacion','retirada',?,?,?,?)`,
    [fila.u, s.id, razon, saldo, saldo + 50, AHORA],
  );
  await q(
    `INSERT INTO notificaciones (usuario_ciudadano_id, tipo, titulo, cuerpo, url) VALUES (?, 'creditos', 'Circular Credits', ?, '/circular-credits')`,
    [fila.u, `Sumaste 50 CC por retiro municipal de la solicitud #${s.id}`],
  );
  await q(
    `INSERT INTO auditoria (tipo_actor, entidad, entidad_id, accion, datos_anteriores, datos_nuevos, fecha_accion)
     VALUES ('sistema','solicitudes_retiro',?, 'UPDATE', ?, ?, ?)`,
    [s.id, JSON.stringify({ estadoPago: 'pendiente', resultado: 'aprobado' }), JSON.stringify({ estadoPago: 'pagado', resultado: 'aprobado' }), AHORA],
  );
  s.fPago = fecha;
  pagos.push(s.id);
};

// 2) Lote 1: aprobar, pagar, derivar, cerrar
log('Aprobando, pagando y derivando (lote 1)...');
const A1 = S.filter((s) => s.st === 'ret1' || s.st === 'nor1');
for (const s of A1) {
  await aprobar(s);
  await pagar(s, despues(s.fRev, entre(0.3, 1)));
}
{
  const { dato } = await api(admin, 'POST', '/api/admin/derivaciones');
  log(`  lote ${dato.id} con ${dato.cantidad} solicitudes`);
}
for (const s of A1) {
  await api(revisor(), 'PATCH', `/api/admin/solicitudes/${s.id}`, { json: { estado: s.st === 'ret1' ? 'retirada' : 'no_realizada' } });
  s.lote = 1;
  s.fCierre = hace(entre(14, 22));
}

// 3) Lote 2
log('Lote 2...');
const A2 = S.filter((s) => ['ret2', 'nor2', 'der2'].includes(s.st));
for (const s of A2) {
  await aprobar(s);
  await pagar(s, despues(s.fRev, entre(0.3, 1)));
}
{
  const { dato } = await api(admin, 'POST', '/api/admin/derivaciones');
  log(`  lote ${dato.id} con ${dato.cantidad} solicitudes`);
}
for (const s of A2) {
  s.lote = 2;
  if (s.st === 'der2') continue;
  await api(revisor(), 'PATCH', `/api/admin/solicitudes/${s.id}`, { json: { estado: s.st === 'ret2' ? 'retirada' : 'no_realizada' } });
  s.fCierre = hace(entre(4, 5));
}

// 4) Aprobadas (con pago pendiente o ya pagadas y listas para derivar)
log('Aprobadas pendientes y pagadas...');
for (const s of porSt('apPag')) {
  await aprobar(s);
  await pagar(s, despues(s.fRev, entre(0.3, 1)));
}
for (const s of porSt('apPend')) await aprobar(s);

// 5) Revisiones, rechazos, cancelaciones y reenvíos
log('Revisiones, rechazos y cancelaciones...');
for (const s of [...porSt('mod'), ...porSt('reenv')]) {
  await api(revisor(), 'POST', `/api/admin/solicitudes/${s.id}/revision`, {
    json: { decision: 'requiere_modificacion', motivo: s.m, comentario: COMENTARIOS[s.m] },
  });
  s.fRev = tope(despues(s.fSol, entre(0.4, 1.5)));
}
for (const s of porSt('reenv')) {
  const f = formulario({ descripcion: s.m === 'foto_insuficiente' ? 'Agregué una foto nueva donde se ve el televisor completo.' : 'Es un sofá de tres cuerpos, de unos 2 metros de largo; se mueve entre dos personas.' }, s.f);
  await api(vec[s.v], 'PATCH', `/api/solicitudes-retiro/${s.id}/reenviar`, { form: f });
  s.fReenvio = tope(despues(s.fRev, entre(0.5, 2)));
}
for (const s of porSt('rech')) {
  await api(revisor(), 'POST', `/api/admin/solicitudes/${s.id}/revision`, {
    json: { decision: 'rechazada', motivo: s.m, comentario: COMENTARIOS[s.m] },
  });
  s.fRev = tope(despues(s.fSol, entre(0.4, 1.5)));
}
for (const s of porSt('canc')) {
  await api(vec[s.v], 'PATCH', `/api/solicitudes-retiro/${s.id}/cancelar`, { json: { usuarioCiudadanoId: vec[s.v].id, motivo: s.motivo } });
  s.fCancel = tope(despues(s.fSol, entre(0.3, 1.5)));
}
for (const [i, texto] of NOTAS) {
  const s = S[i];
  await api(revisor(), 'POST', `/api/admin/solicitudes/${s.id}/notas`, { json: { texto } });
  s.nota = true;
}

// 6) Marketplace
log('Marketplace...');
const arts = [];
let nChat = 0;
const decir = async (art, conv, quien, texto) => {
  const sesion = quien === 'i' ? vec[conv.v] : vec[art.p];
  const query = quien === 'p' ? { conversacion: conv.id } : undefined;
  await dormir(CHAT_MS);
  await api(sesion, 'POST', `/api/marketplace/articulos/${art.id}/mensajes`, { json: { contenido: texto }, query });
  nChat++;
};
const conversar = async (art, conv, dialogo) => {
  const obj = art.t.charAt(0).toLowerCase() + art.t.slice(1);
  for (const [quien, plantilla] of dialogo) {
    await decir(art, conv, quien, plantilla.replace('{o}', obj).replace('{s}', SECTORES[art.sec].nombre));
  }
};

let iDialogo = 0;
let iConsulta = 0;
for (const a of ARTICULOS) {
  const pt = punto(a.sec);
  const campos = {
    tipo: a.tipo,
    titulo: a.t,
    descripcion: a.d,
    lat: pt.lat,
    lon: pt.lng,
  };
  if (Array.isArray(a.c)) campos.nombreResiduoOtro = a.c[1];
  else campos.residuoCatalogoId = a.c;
  const { dato } = await api(vec[a.p], 'POST', '/api/marketplace/articulos', { form: formulario(campos, a.f) });
  a.id = dato.id;
  a.convs = [];
  arts.push(a);
  if (a.st === 'pendiente') continue;
  if (a.st === 'rechazado') {
    await api(revisor(), 'POST', `/api/admin/marketplace/${a.id}/rechazar`, { json: { motivo: a.motivo } });
    continue;
  }
  await api(revisor(), 'POST', `/api/admin/marketplace/${a.id}/aprobar`, { json: { creditos: a.cred } });
  if (a.st === 'retirado') {
    await api(vec[a.p], 'PATCH', `/api/marketplace/articulos/${a.id}/retirar`);
    continue;
  }
  // Interesados: quien compra primero, luego los que consultan.
  const interesados = [];
  if (a.compra !== undefined) interesados.push({ v: a.compra, compra: true });
  for (const v of a.consultan || []) interesados.push({ v, compra: false });
  for (const it of interesados) {
    const { dato: r } = await api(vec[it.v], 'POST', `/api/marketplace/articulos/${a.id}/interes`);
    it.id = r.conversacionId;
    a.convs.push(it);
  }
  for (const it of a.convs) {
    if (it.compra) await conversar(a, it, DIALOGOS[iDialogo++ % DIALOGOS.length]);
    else if (nChat < 90) await conversar(a, it, CONSULTAS[iConsulta++ % CONSULTAS.length]);
  }
  if (a.compra !== undefined) {
    const comprador = a.convs.find((c) => c.compra);
    await api(vec[a.p], 'PATCH', `/api/marketplace/articulos/${a.id}/reservar`, { json: { conversacionId: comprador.id } });
    if (a.st === 'completado') {
      const { dato: det } = await api(vec[a.compra], 'GET', `/api/marketplace/articulos/${a.id}`);
      await api(vec[a.p], 'PATCH', `/api/marketplace/articulos/${a.id}/entregar`, { json: { codigo: det.codigoEntrega } });
      await api(vec[a.compra], 'POST', `/api/marketplace/articulos/${a.id}/calificacion`, { json: { puntuacion: a.star, comentario: a.com } });
      for (const sesion of [vec[a.p], vec[a.compra]]) {
        await api(sesion, 'PATCH', `/api/marketplace/articulos/${a.id}/mensajes/leidos`, { query: sesion === vec[a.p] ? { conversacion: comprador.id } : undefined });
      }
    }
  }
}
log(`  ${arts.length} artículos, ${nChat} mensajes`);

// 7) Denuncias
log('Denuncias...');
const art = (titulo) => arts.find((a) => a.t.startsWith(titulo));
const bici = art('Bicicleta de carrera');
const d1 = await api(vec[2], 'POST', '/api/denuncias', {
  json: { articuloId: bici.id, origen: 'chat', motivo: 'no_se_presento', descripcion: 'Quedamos de juntarnos el sábado a las 11 y no llegó ni respondió los mensajes.' },
});
const sillonVerde = art('Sillón verde');
const d2 = await api(vec[3], 'POST', '/api/denuncias', {
  json: { articuloId: sillonVerde.id, origen: 'chat', motivo: 'pidio_datos_o_dinero', descripcion: 'Pidió una transferencia para reservar el sillón antes de que lo fuera a ver.' },
});
const floral = art('Sillón floral');
const convOfensiva = floral.convs.find((c) => c.v === 9);
const d3 = await api(vec[4], 'POST', '/api/denuncias', {
  json: { articuloId: floral.id, conversacion: convOfensiva.id, origen: 'chat', motivo: 'trato_ofensivo', descripcion: 'Me escribió con insultos cuando le dije que ya estaba comprometido con otra persona.' },
});
const idDen = (r) => r.dato.id;
await api(revisor(), 'PATCH', `/api/admin/denuncias/${idDen(d1)}`, { json: { estado: 'investigacion' } });
await api(revisor(), 'PATCH', `/api/admin/denuncias/${idDen(d1)}`, {
  json: { estado: 'resuelta', resolucion: 'Se contactó a ambas partes y se coordinó una nueva hora de entrega. Se advirtió al vecino sobre la importancia de avisar si no puede asistir.' },
});
await api(revisor(), 'PATCH', `/api/admin/denuncias/${idDen(d3)}`, { json: { estado: 'investigacion' } });

// 8) Avisos leídos en parte (para que la campanita muestre ambos estados)
for (const i of [0, 1, 3, 5, 7]) await api(vec[i], 'PATCH', '/api/notificaciones/leidas');

// 9) Fechas hacia atrás: solo sobre los IDs creados por este script
log('Fechando hacia atrás...');
for (const s of S) {
  const fRev = s.fRev ?? null;
  const fCierre = s.fCierre ?? null;
  const ultimo = [s.fSol, fRev, s.fReenvio, s.fCancel, s.fPago, fCierre].filter(Boolean).reduce((a, b) => (a > b ? a : b));
  const cierraAhora = ['ret1', 'nor1', 'ret2', 'nor2'].includes(s.st);
  await q(
    'UPDATE solicitudes_retiro SET fecha_solicitud=?, created_at=?, updated_at=?, fecha_revision=?, fecha_cierre=? WHERE id=?',
    [s.fSol, s.fSol, ultimo, ['rev', 'canc'].includes(s.st) ? null : fRev, cierraAhora ? fCierre : null, s.id],
  );
  await q('UPDATE foto_retiro SET fecha_captura=? WHERE solicitud_retiro_id=?', [s.fSol, s.id]);
  await q('UPDATE revisiones_solicitud SET created_at=? WHERE solicitud_retiro_id=?', [fRev ?? s.fSol, s.id]);
  await q('UPDATE notas_solicitud SET created_at=? WHERE solicitud_retiro_id=?', [tope(despues(s.fSol, 0.3)), s.id]);
  if (s.fPago) {
    await q("UPDATE pagos_webpay SET fecha_transaccion=?, created_at=?, updated_at=? WHERE solicitud_retiro_id=?", [s.fPago, s.fPago, s.fPago, s.id]);
    await q('UPDATE transacciones_circular_credits SET fecha_transaccion=?, created_at=? WHERE solicitud_retiro_id=?', [s.fPago, s.fPago, s.id]);
  }
  // Auditoría de esa solicitud repartida entre su creación y su último movimiento.
  const filas = await q("SELECT id FROM auditoria WHERE entidad='solicitudes_retiro' AND entidad_id=? ORDER BY id", [s.id]);
  for (let k = 0; k < filas.length; k++) {
    const f = new Date(s.fSol.getTime() + ((ultimo - s.fSol) * k) / Math.max(1, filas.length - 1));
    await q('UPDATE auditoria SET fecha_accion=?, created_at=? WHERE id=?', [f, f, filas[k].id]);
  }
}
const lotes = await q('SELECT id FROM lotes_derivacion ORDER BY id');
const fLotes = [hace(24), hace(9)];
for (let i = 0; i < lotes.length; i++) {
  await q('UPDATE lotes_derivacion SET created_at=? WHERE id=?', [fLotes[i], lotes[i].id]);
  await q("UPDATE auditoria SET fecha_accion=?, created_at=? WHERE entidad='lotes_derivacion' AND entidad_id=?", [fLotes[i], fLotes[i], lotes[i].id]);
}

// Marketplace
for (const a of arts) {
  const vigente = ['disponible', 'pendiente'].includes(a.st);
  const pub = a.st === 'completado' ? hace(entre(10, 20)) : a.st === 'pendiente' ? hace(entre(0.1, 1.5)) : a.st === 'en_negociacion' ? hace(entre(6, 10)) : hace(entre(1, 12));
  const mod = a.st === 'pendiente' ? null : tope(despues(pub, 0.3));
  const reserva = ['completado', 'en_negociacion'].includes(a.st) ? tope(despues(pub, a.st === 'completado' ? 4 : 5)) : null;
  const entrega = a.st === 'completado' ? tope(despues(pub, 5)) : null;
  await q(
    `UPDATE articulos_marketplace SET fecha_publicacion=?, created_at=?, updated_at=?, fecha_expiracion=?, fecha_moderacion=?, fecha_reserva=?, fecha_transaccion=? WHERE id=?`,
    [pub, pub, entrega ?? reserva ?? mod ?? pub, vigente || a.st === 'en_negociacion' ? despues(pub, 30) : despues(pub, 30), mod, reserva, entrega, a.id],
  );
  const base = tope(despues(pub, a.st === 'pendiente' ? 0 : 0.6));
  for (let c = 0; c < a.convs.length; c++) {
    const cv = a.convs[c];
    const inicio = new Date(base.getTime() + c * 3 * 3600e3);
    await q('UPDATE interesados_marketplace SET created_at=? WHERE id=?', [tope(inicio), cv.id]);
    const msgs = await q('SELECT id FROM mensajes_marketplace WHERE articulo_id=? AND interesado_id=(SELECT usuario_interesado_id FROM interesados_marketplace WHERE id=?) ORDER BY id', [a.id, cv.id]);
    for (let k = 0; k < msgs.length; k++) {
      const f = tope(new Date(inicio.getTime() + (k + 1) * entre(6, 14) * 60000));
      await q('UPDATE mensajes_marketplace SET fecha_mensaje=?, created_at=?, updated_at=? WHERE id=?', [f, f, f, msgs[k].id]);
    }
  }
  if (entrega) {
    await q('UPDATE transacciones_circular_credits SET fecha_transaccion=?, created_at=? WHERE articulo_id=?', [entrega, entrega, a.id]);
    await q('UPDATE ratings SET fecha_calificacion=?, created_at=? WHERE articulo_id=?', [tope(despues(entrega, 0.5)), tope(despues(entrega, 0.5)), a.id]);
  }
}
// Denuncias
const fDen = [[d1, hace(4), hace(2)], [d2, hace(1.2), null], [d3, hace(2.5), null]];
for (const [d, f, fr] of fDen) {
  await q('UPDATE denuncias SET fecha_denuncia=?, created_at=?, fecha_resolucion=? WHERE id=?', [f, f, fr, d.dato.id]);
}
// Avisos repartidos en las últimas dos semanas, en orden cronológico
const avisos = await q('SELECT id FROM notificaciones ORDER BY id');
for (let i = 0; i < avisos.length; i++) {
  await q('UPDATE notificaciones SET created_at=? WHERE id=?', [hace(14 - (14 * i) / Math.max(1, avisos.length - 1) + 0.01), avisos[i].id]);
}

// 10) Resumen
const cuenta = async (sql, params) => (await q(sql, params))[0].n;
const por = async (tabla, col) =>
  Object.fromEntries((await q(`SELECT ${col} k, COUNT(*) n FROM ${tabla} GROUP BY ${col}`)).map((r) => [r.k, r.n]));
const resumen = {
  vecinos: await cuenta("SELECT COUNT(*) n FROM usuarios_ciudadanos WHERE clave_unica_id LIKE 'dev:%'"),
  solicitudes: await cuenta('SELECT COUNT(*) n FROM solicitudes_retiro'),
  'solicitudes por estado': await por('solicitudes_retiro', 'estado'),
  'solicitudes por pago': await por('solicitudes_retiro', 'estado_pago'),
  lotes: await cuenta('SELECT COUNT(*) n FROM lotes_derivacion'),
  revisiones: await cuenta('SELECT COUNT(*) n FROM revisiones_solicitud'),
  notas: await cuenta('SELECT COUNT(*) n FROM notas_solicitud'),
  'pagos Webpay': await cuenta('SELECT COUNT(*) n FROM pagos_webpay'),
  'artículos por estado': await por('articulos_marketplace', 'estado'),
  interesados: await cuenta('SELECT COUNT(*) n FROM interesados_marketplace'),
  mensajes: await cuenta('SELECT COUNT(*) n FROM mensajes_marketplace'),
  calificaciones: await cuenta('SELECT COUNT(*) n FROM ratings'),
  'movimientos CC': await cuenta('SELECT COUNT(*) n FROM transacciones_circular_credits'),
  'denuncias por estado': await por('denuncias', 'estado'),
  notificaciones: await cuenta('SELECT COUNT(*) n FROM notificaciones'),
  auditoria: await cuenta('SELECT COUNT(*) n FROM auditoria'),
};
log('\n=== Resumen ===');
for (const [k, v] of Object.entries(resumen)) log(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
await db.end();
