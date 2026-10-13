/**
 * Datos de prueba para desarrollo local: `npm run seed:dev` (desde apps/backend).
 *
 * Llena la base con vecinos ficticios, solicitudes en todos los estados y con
 * ubicación, revisiones, notas, lotes, marketplace, créditos y auditoría, para
 * poder probar el panel y la PWA con volumen.
 *
 * Vive fuera de `src/` a propósito: no es una migración ni entra al build, así
 * que nunca llega al servidor. Además se niega a correr en producción.
 *
 * Se puede correr las veces que haga falta: primero borra lo que él mismo creó
 * (vecinos `seed-dev-*` y todo lo que cuelga de ellos) y lo vuelve a generar
 * igual, porque los "aleatorios" salen de una semilla fija. No toca los datos
 * cargados a mano ni los usuarios demo de las migraciones.
 */
import type { QueryRunner } from 'typeorm';
import dataSource from '../src/database/data-source';
import { SECTORES_PROVISIONALES } from '../src/admin/mapa-calor/sectores.constants';
import {
  bonoPorEstrellas,
  creditosPorEntrega,
  creditosPorRetirada,
} from '../src/creditos/reglas-creditos';

const VECINOS = 30;
const SOLICITUDES = 200;
const ARTICULOS = 40;
const DIAS_HISTORIA = 90;

// Marca de todo lo que crea este script, para poder borrarlo después.
const PREFIJO_CLAVE_UNICA = 'seed-dev-';
const MARCA_AUDITORIA = 'seed-dev';

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

// Generador con semilla fija (mulberry32): cada corrida deja los mismos datos.
let semilla = 20261012;
function azar(): number {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entero = (min: number, max: number): number =>
  min + Math.floor(azar() * (max - min + 1));
const elegir = <T>(lista: readonly T[]): T =>
  lista[entero(0, lista.length - 1)];
function elegirConPeso<T>(opciones: readonly (readonly [T, number])[]): T {
  let resto = azar() * opciones.reduce((suma, [, peso]) => suma + peso, 0);
  for (const [valor, peso] of opciones) {
    resto -= peso;
    if (resto < 0) return valor;
  }
  return opciones[opciones.length - 1][0];
}

const idVecino = (n: number): string =>
  `5eed0000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Reparto desigual a propósito, para que el mapa muestre zonas de alta, media
// y baja demanda.
const PESO_SECTOR = [30, 22, 14, 12, 9, 7, 6];

const DESCRIPCIONES = [
  'Está en el antejardín, se puede retirar sin tocar el timbre.',
  'Funciona, pero ya no lo usamos.',
  'Tiene una pata quebrada.',
  'Pesa bastante, se necesitan dos personas.',
  'Está desarmado y amarrado.',
  'Quedó de una remodelación.',
  'Sin uso hace más de un año.',
  null,
  null,
];

const MOTIVOS_MODIFICACION = [
  'foto_insuficiente',
  'categoria_incorrecta',
  'descripcion_incompleta',
  'direccion_incompleta',
  'otro',
];
const MOTIVOS_RECHAZO = [
  'fuera_de_comuna',
  'residuo_no_admitido',
  'duplicada',
  'contenido_inapropiado',
  'otro',
];
const COMENTARIOS_MODIFICACION = [
  'La foto está muy oscura, por favor sube otra con luz de día.',
  'Indica el número de la casa o una referencia para encontrarla.',
  'Cuéntanos el tamaño aproximado del objeto.',
  'La categoría no coincide con lo que se ve en la foto.',
];
const CHECKLIST_COMPLETO = JSON.stringify({
  foto_clara: true,
  no_duplicada: true,
  residuo_coincide: true,
  volumen_razonable: true,
  direccion_en_comuna: true,
});
const NOTAS = [
  'Vecino llamó para confirmar el horario de retiro.',
  'Coordinar con la empresa: acceso por pasaje angosto.',
  'Se repite la dirección con otra solicitud, revisar si es la misma.',
  'Pidió que el retiro sea en la mañana.',
  'El objeto es más grande de lo que indica la categoría.',
];
const MENSAJES = [
  'Hola, ¿sigue disponible?',
  'Sí, todavía lo tengo.',
  '¿Lo puedo pasar a buscar el sábado?',
  'Perfecto, te espero en la mañana.',
  '¿Funciona bien?',
  'Sí, lo usamos hasta el mes pasado.',
  'Gracias, quedó muy bien en la casa.',
];
const COMENTARIOS_RATING = [
  'Todo tal como se describía.',
  'Muy amable y puntual.',
  'El objeto estaba en buen estado.',
  null,
];

type Estado =
  | 'en_revision'
  | 'requiere_modificacion'
  | 'aprobada'
  | 'rechazada'
  | 'derivada'
  | 'retirada'
  | 'no_realizada'
  | 'cancelada';

interface Residuo {
  id: number;
  nombre: string;
  precio: number;
  puede_reutilizarse: number;
}

async function limpiar(db: QueryRunner): Promise<void> {
  const vecinos = `SELECT id FROM usuarios_ciudadanos WHERE clave_unica_id LIKE '${PREFIJO_CLAVE_UNICA}%'`;
  const solicitudes = `SELECT id FROM solicitudes_retiro WHERE usuario_ciudadano_id IN (${vecinos})`;
  const articulos = `SELECT id FROM articulos_marketplace WHERE usuario_publicador_id IN (${vecinos})`;

  const lotes = (
    (await db.query(
      `SELECT DISTINCT lote_derivacion_id AS id FROM solicitudes_retiro
       WHERE lote_derivacion_id IS NOT NULL AND usuario_ciudadano_id IN (${vecinos})`,
    )) as { id: number }[]
  ).map((l) => l.id);

  await db.query(`DELETE FROM auditoria WHERE user_agent = ?`, [
    MARCA_AUDITORIA,
  ]);
  await db.query(
    `DELETE FROM transacciones_circular_credits WHERE usuario_ciudadano_id IN (${vecinos})`,
  );
  await db.query(
    `DELETE FROM ratings WHERE usuario_calificador_id IN (${vecinos})`,
  );
  await db.query(
    `DELETE FROM mensajes_marketplace WHERE articulo_id IN (${articulos})`,
  );
  await db.query(
    `DELETE FROM articulos_marketplace WHERE usuario_publicador_id IN (${vecinos})`,
  );
  await db.query(
    `DELETE FROM notas_solicitud WHERE solicitud_retiro_id IN (${solicitudes})`,
  );
  await db.query(
    `DELETE FROM revisiones_solicitud WHERE solicitud_retiro_id IN (${solicitudes})`,
  );
  await db.query(
    `DELETE FROM solicitudes_retiro WHERE usuario_ciudadano_id IN (${vecinos})`,
  );
  if (lotes.length > 0) {
    // Solo los lotes que quedaron sin solicitudes: los demás no son del script.
    await db.query(
      `DELETE FROM lotes_derivacion WHERE id IN (?)
       AND id NOT IN (SELECT lote_derivacion_id FROM (
         SELECT lote_derivacion_id FROM solicitudes_retiro WHERE lote_derivacion_id IS NOT NULL
       ) AS en_uso)`,
      [lotes],
    );
  }
  await db.query(
    `DELETE FROM sesiones_ciudadano WHERE usuario_ciudadano_id IN (${vecinos})`,
  );
  await db.query(
    `DELETE FROM usuarios_ciudadanos WHERE clave_unica_id LIKE '${PREFIJO_CLAVE_UNICA}%'`,
  );
}

async function sembrar(db: QueryRunner): Promise<Record<string, number>> {
  const ahora = Date.now();
  const hace = (ms: number): Date => new Date(ahora - ms);

  const residuos = (await db.query(
    `SELECT id, nombre, precio, puede_reutilizarse FROM residuos_catalogo`,
  )) as Residuo[];
  const admins = (
    (await db.query(
      `SELECT id FROM usuarios_administradores WHERE activo = 1`,
    )) as { id: string }[]
  ).map((a) => a.id);
  if (residuos.length === 0 || admins.length === 0) {
    throw new Error(
      'Faltan el catálogo de residuos o los usuarios demo: corre antes `npm run migration:run`.',
    );
  }

  const auditar = (
    actor: { ciudadano?: string; admin?: string },
    entidad: string,
    entidadId: number | null,
    accion: string,
    antes: object | null,
    despues: object | null,
    fecha: Date,
  ) =>
    db.query(
      `INSERT INTO auditoria (actor_ciudadano_id, actor_administrador_id, tipo_actor, entidad,
         entidad_id, accion, datos_anteriores, datos_nuevos, ip_origen, user_agent, fecha_accion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '127.0.0.1', ?, ?)`,
      [
        actor.ciudadano ?? null,
        actor.admin ?? null,
        actor.admin ? 'administrador' : 'ciudadano',
        entidad,
        entidadId,
        accion,
        antes && JSON.stringify(antes),
        despues && JSON.stringify(despues),
        MARCA_AUDITORIA,
        fecha,
      ],
    );

  // --- Vecinos ---
  const vecinos: string[] = [];
  for (let n = 1; n <= VECINOS; n++) {
    const registro = hace(entero(DIAS_HISTORIA, DIAS_HISTORIA + 60) * DIA);
    await db.query(
      `INSERT INTO usuarios_ciudadanos (id, clave_unica_id, fecha_registro, fecha_ultima_actividad, activo)
       VALUES (?, ?, ?, ?, 1)`,
      [
        idVecino(n),
        `${PREFIJO_CLAVE_UNICA}${n}`,
        registro,
        hace(entero(0, 20) * DIA),
      ],
    );
    vecinos.push(idVecino(n));
  }

  // Saldo de créditos por vecino; los movimientos se insertan al final, en
  // orden de fecha, para que saldo_anterior y saldo_nuevo calcen.
  const movimientos: {
    vecino: string;
    articulo: number | null;
    solicitud: number | null;
    monto: number;
    origen: string;
    razon: string;
    fecha: Date;
  }[] = [];

  // --- Solicitudes ---
  const paraLote: { id: number; derivada: Date }[] = [];
  let revisiones = 0;
  let notas = 0;

  for (let i = 0; i < SOLICITUDES; i++) {
    // Más solicitudes recientes que antiguas, como en un sistema en uso.
    const edad =
      Math.floor(azar() ** 1.6 * DIAS_HISTORIA * DIA) + entero(1, 20) * HORA;
    const creada = hace(edad);
    const vecino = elegir(vecinos);
    const residuo = elegir(residuos);

    // Una solicitud recién creada no alcanza a estar retirada.
    const estado: Estado =
      edad < 3 * DIA
        ? elegirConPeso<Estado>([
            ['en_revision', 70],
            ['requiere_modificacion', 10],
            ['aprobada', 12],
            ['rechazada', 5],
            ['cancelada', 3],
          ])
        : elegirConPeso<Estado>([
            ['en_revision', 8],
            ['requiere_modificacion', 9],
            ['aprobada', 14],
            ['rechazada', 11],
            ['derivada', 18],
            ['retirada', 28],
            ['no_realizada', 5],
            ['cancelada', 7],
          ]);

    const conUbicacion = azar() > 0.08;
    const sector = elegirConPeso(
      SECTORES_PROVISIONALES.map((s, n) => [s, PESO_SECTOR[n] ?? 5] as const),
    );
    const lat = conUbicacion ? sector.lat + (azar() - 0.5) * 0.006 : null;
    const lng = conUbicacion ? sector.lng + (azar() - 0.5) * 0.006 : null;

    const revisada =
      estado !== 'en_revision' && !(estado === 'cancelada' && azar() < 0.6);
    const fechaRevision = revisada
      ? new Date(
          Math.min(creada.getTime() + entero(2, 70) * HORA, ahora - HORA),
        )
      : null;
    const revisor = revisada ? elegir(admins) : null;
    const aprobada = [
      'aprobada',
      'derivada',
      'retirada',
      'no_realizada',
    ].includes(estado);
    const pagada =
      ['derivada', 'retirada', 'no_realizada'].includes(estado) ||
      (estado === 'aprobada' && azar() < 0.6);
    const estadoPago = !aprobada
      ? 'no_aplica'
      : pagada
        ? 'pagado'
        : 'pendiente';

    const derivada =
      fechaRevision && ['derivada', 'retirada', 'no_realizada'].includes(estado)
        ? new Date(
            Math.min(
              fechaRevision.getTime() + entero(1, 5) * DIA,
              ahora - HORA / 2,
            ),
          )
        : null;
    const cierre =
      estado === 'retirada' || estado === 'no_realizada'
        ? new Date(
            Math.min(
              derivada!.getTime() + entero(1, 6) * DIA,
              ahora - HORA / 4,
            ),
          )
        : estado === 'cancelada' || estado === 'rechazada'
          ? (fechaRevision ?? new Date(creada.getTime() + entero(1, 30) * HORA))
          : null;
    const motivoRechazo =
      estado === 'rechazada' ? elegir(MOTIVOS_RECHAZO) : null;

    const { insertId: id } = (await db.query(
      `INSERT INTO solicitudes_retiro (usuario_ciudadano_id, residuo_catalogo_id, estado, estado_pago,
         monto, descripcion, direccion_anonimizada, latitud_capturada, longitud_capturada,
         fecha_solicitud, fecha_revision, revisado_por_id, fecha_cierre, razon_rechazo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vecino,
        residuo.id,
        estado,
        estadoPago,
        aprobada ? residuo.precio : null,
        elegir(DESCRIPCIONES),
        conUbicacion ? `Sector ${sector.nombre}` : null,
        lat,
        lng,
        creada,
        fechaRevision,
        revisor,
        cierre,
        motivoRechazo,
        creada,
      ],
    )) as { insertId: number };

    await auditar(
      { ciudadano: vecino },
      'solicitudes_retiro',
      id,
      'CREATE',
      null,
      { estado: 'en_revision' },
      creada,
    );

    if (revisada && revisor && fechaRevision) {
      // Algunas aprobadas pasaron antes por un «pedir modificación».
      if (aprobada && azar() < 0.2) {
        const antes = new Date(
          (creada.getTime() + fechaRevision.getTime()) / 2,
        );
        await db.query(
          `INSERT INTO revisiones_solicitud (solicitud_retiro_id, revisado_por_id, decision, motivo, comentario, created_at)
           VALUES (?, ?, 'requiere_modificacion', ?, ?, ?)`,
          [
            id,
            revisor,
            elegir(MOTIVOS_MODIFICACION),
            elegir(COMENTARIOS_MODIFICACION),
            antes,
          ],
        );
        revisiones++;
      }
      const decision = aprobada
        ? 'aprobada'
        : estado === 'rechazada'
          ? 'rechazada'
          : 'requiere_modificacion';
      const motivo =
        decision === 'aprobada'
          ? null
          : (motivoRechazo ?? elegir(MOTIVOS_MODIFICACION));
      await db.query(
        `INSERT INTO revisiones_solicitud (solicitud_retiro_id, revisado_por_id, decision, motivo, comentario, checklist, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          revisor,
          decision,
          motivo,
          decision === 'requiere_modificacion'
            ? elegir(COMENTARIOS_MODIFICACION)
            : null,
          decision === 'aprobada' ? CHECKLIST_COMPLETO : null,
          fechaRevision,
        ],
      );
      revisiones++;
      await auditar(
        { admin: revisor },
        'solicitudes_retiro',
        id,
        'UPDATE',
        { estado: 'en_revision', revisadoPorId: null },
        { estado: decision, decision, motivo, revisadoPorId: revisor },
        fechaRevision,
      );
    }

    if (azar() < 0.2) {
      await db.query(
        `INSERT INTO notas_solicitud (solicitud_retiro_id, autor_id, texto, created_at) VALUES (?, ?, ?, ?)`,
        [
          id,
          elegir(admins),
          elegir(NOTAS),
          new Date(creada.getTime() + entero(1, 40) * HORA),
        ],
      );
      notas++;
    }

    if (derivada) paraLote.push({ id, derivada });
    if (estado === 'retirada' && cierre) {
      movimientos.push({
        vecino,
        articulo: null,
        solicitud: id,
        monto: creditosPorRetirada(),
        origen: 'retirada',
        razon: `Retiro municipal de «${residuo.nombre}»`,
        fecha: cierre,
      });
    }
  }

  // --- Lotes de derivación: uno por semana, como los generaría el panel ---
  const porSemana = new Map<number, { id: number; derivada: Date }[]>();
  for (const s of paraLote) {
    const semana = Math.floor(s.derivada.getTime() / (7 * DIA));
    porSemana.set(semana, [...(porSemana.get(semana) ?? []), s]);
  }
  for (const grupo of porSemana.values()) {
    const fecha = new Date(Math.max(...grupo.map((s) => s.derivada.getTime())));
    const admin = elegir(admins);
    const { insertId: lote } = (await db.query(
      `INSERT INTO lotes_derivacion (generado_por_id, cantidad, created_at) VALUES (?, ?, ?)`,
      [admin, grupo.length, fecha],
    )) as { insertId: number };
    await db.query(
      `UPDATE solicitudes_retiro SET lote_derivacion_id = ? WHERE id IN (?)`,
      [lote, grupo.map((s) => s.id)],
    );
    await auditar(
      { admin },
      'lotes_derivacion',
      lote,
      'CREATE',
      null,
      { cantidad: grupo.length },
      fecha,
    );
  }

  // --- Marketplace ---
  const reutilizables = residuos.filter((r) => r.puede_reutilizarse);
  let mensajes = 0;
  let calificaciones = 0;
  for (let i = 0; i < ARTICULOS && reutilizables.length > 0; i++) {
    const publicador = elegir(vecinos);
    const residuo = elegir(reutilizables);
    const publicado = hace(entero(1, 45) * DIA + entero(0, 23) * HORA);
    const estado = elegirConPeso([
      ['disponible', 45],
      ['en_negociacion', 20],
      ['completado', 25],
      ['retirado', 10],
    ] as const);
    const tipo = azar() < 0.7 ? 'regalo' : 'intercambio';
    const sector = elegir(SECTORES_PROVISIONALES);
    const otro = elegir(vecinos.filter((v) => v !== publicador));
    const transaccion =
      estado === 'completado'
        ? new Date(
            Math.min(publicado.getTime() + entero(1, 10) * DIA, ahora - HORA),
          )
        : null;

    const { insertId: articulo } = (await db.query(
      `INSERT INTO articulos_marketplace (usuario_publicador_id, residuo_catalogo_id, tipo, titulo,
         descripcion, estado, latitud, longitud, fecha_publicacion, fecha_expiracion,
         usuario_comprador_id, fecha_transaccion, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        publicador,
        residuo.id,
        tipo,
        `${residuo.nombre} en buen estado`,
        elegir(DESCRIPCIONES),
        estado,
        sector.lat + (azar() - 0.5) * 0.006,
        sector.lng + (azar() - 0.5) * 0.006,
        publicado,
        new Date(publicado.getTime() + 30 * DIA),
        transaccion ? otro : null,
        transaccion,
        publicado,
      ],
    )) as { insertId: number };

    if (estado === 'en_negociacion' || estado === 'completado') {
      const cantidad = entero(2, 6);
      for (let m = 0; m < cantidad; m++) {
        await db.query(
          `INSERT INTO mensajes_marketplace (articulo_id, usuario_remitente_id, contenido, fecha_mensaje, leido)
           VALUES (?, ?, ?, ?, ?)`,
          [
            articulo,
            m % 2 === 0 ? otro : publicador,
            MENSAJES[m % MENSAJES.length],
            new Date(Math.min(publicado.getTime() + (m + 1) * 3 * HORA, ahora)),
            m < cantidad - 1 || estado === 'completado' ? 1 : 0,
          ],
        );
        mensajes++;
      }
    }

    if (transaccion) {
      const titulo = `${residuo.nombre} en buen estado`;
      movimientos.push({
        vecino: publicador,
        articulo,
        solicitud: null,
        monto: creditosPorEntrega(),
        origen: 'entrega',
        razon: `Entrega de «${titulo}»`,
        fecha: transaccion,
      });
      if (azar() < 0.8) {
        const puntuacion = elegirConPeso([
          [5, 50],
          [4, 30],
          [3, 12],
          [2, 5],
          [1, 3],
        ] as const);
        const calificado = new Date(
          Math.min(transaccion.getTime() + entero(1, 48) * HORA, ahora),
        );
        await db.query(
          `INSERT INTO ratings (usuario_calificador_id, usuario_calificado_id, articulo_id, puntuacion, comentario, fecha_calificacion)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            otro,
            publicador,
            articulo,
            puntuacion,
            elegir(COMENTARIOS_RATING),
            calificado,
          ],
        );
        calificaciones++;
        if (bonoPorEstrellas(puntuacion) > 0) {
          movimientos.push({
            vecino: publicador,
            articulo,
            solicitud: null,
            monto: bonoPorEstrellas(puntuacion),
            origen: 'estrellas',
            razon: `${puntuacion} estrellas por «${titulo}»`,
            fecha: calificado,
          });
        }
      }
    }
  }

  // --- Circular Credits ---
  // ponytail: no aplica los topes mensual ni por pareja de reglas-creditos.ts;
  // si hace falta probar los topes, pasar estos montos por `aplicarTopes`.
  const saldos = new Map<string, number>();
  movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  for (const m of movimientos) {
    const anterior = saldos.get(m.vecino) ?? 0;
    saldos.set(m.vecino, anterior + m.monto);
    await db.query(
      `INSERT INTO transacciones_circular_credits (usuario_ciudadano_id, articulo_id, solicitud_retiro_id,
         monto_creditos, tipo, origen, razon, saldo_anterior, saldo_nuevo, fecha_transaccion)
       VALUES (?, ?, ?, ?, 'bonificacion', ?, ?, ?, ?, ?)`,
      [
        m.vecino,
        m.articulo,
        m.solicitud,
        m.monto,
        m.origen,
        m.razon,
        anterior,
        anterior + m.monto,
        m.fecha,
      ],
    );
  }

  // --- Inicios de sesión, para los filtros y la paginación de Auditoría ---
  const LOGINS = 60;
  for (let i = 0; i < LOGINS; i++) {
    await auditar(
      { ciudadano: elegir(vecinos) },
      'sesiones_ciudadano',
      null,
      'LOGIN',
      null,
      { origen: 'dev' },
      hace(entero(0, DIAS_HISTORIA) * DIA + entero(0, 23) * HORA),
    );
  }

  return {
    vecinos: vecinos.length,
    solicitudes: SOLICITUDES,
    revisiones,
    notas,
    lotes: porSemana.size,
    articulos: Math.min(ARTICULOS, reutilizables.length ? ARTICULOS : 0),
    mensajes,
    calificaciones,
    'movimientos de créditos': movimientos.length,
  };
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed:dev no corre en producción.');
  }
  const soloLimpiar = process.argv.includes('--limpiar');

  await dataSource.initialize();
  const db = dataSource.createQueryRunner();
  await db.startTransaction();
  try {
    await limpiar(db);
    const resumen = soloLimpiar ? null : await sembrar(db);
    await db.commitTransaction();
    console.log(
      resumen
        ? `Datos de prueba cargados en ${process.env.DB_DATABASE}:`
        : `Datos de prueba borrados de ${process.env.DB_DATABASE}.`,
    );
    if (resumen) console.table(resumen);
  } catch (error) {
    await db.rollbackTransaction();
    throw error;
  } finally {
    await db.release();
    await dataSource.destroy();
  }
}

main().catch((error) => {
  // Un fallo de conexión llega como AggregateError, con el mensaje vacío.
  console.error((error instanceof Error && error.message) || error);
  process.exit(1);
});
