# Spec: `marketplace` — Backend del Marketplace P2P y Circular Credits

> **Estado:** IMPLEMENTADO en el backend (2026-09-29): PR #74 (spec), #75 (tablas), #76 (publicar y
> listar), #77 (entrega y calificación) y el PR de Circular Credits. Pendiente: conectar la PWA (§10).
> **Fecha:** 2026-09-29 · **Autor:** Javier Figueroa (con asistencia de IA)
> **Origen:** "Sprint 3 - Reparto del equipo COM Tech" (Miguel Segovia, 2026-09-24), sección de Javier.
> Se acordó que ese documento vale como acuerdo del equipo para los cambios al DBML que pide.
> **Depende de:** [`sesion-unica`](SPEC-sesion-unica.md) (identidad por cookie) ·
> ubicación del Marketplace ([BACKEND_FASE1 § Rate limiting y ubicación](../BACKEND_FASE1.md#rate-limiting-y-ubicación-del-marketplace))
> **HU:** HU-04, HU-05, HU-10, HU-15, más "Marcar como entregado"

## 1. Objetivo

Dar al frontend los endpoints para demostrar la cadena completa del Sprint 3:
**publicar → buscar → mostrar interés y conversar → reservar → entregar con código → calificar → ver los créditos.**

El contrato que ya usan las pantallas está en `apps/frontend/src/api/marketplace.ts` (Miguel). Este
spec lo respeta y agrega lo que falta para entregar, calificar y ver créditos (§5).

**Para quién:** Miguel (pantallas del marketplace), Ana (calificación y QA), Maxi (billetera).

### Criterios de aceptación

1. Un vecino publica un artículo con tipo, título, descripción, residuo del catálogo, foto opcional y
   ubicación opcional. La ubicación se guarda ya aproximada a la grilla de 250 m.
2. El listado filtra por texto, categoría, tipo y banda de distancia, y **nunca** devuelve artículos
   vencidos, reservados, entregados ni retirados.
3. La API nunca devuelve la coordenada de un artículo ni el id de ningún vecino.
4. «Me interesa» registra el interés y abre el chat; quien publicó elige a un interesado con «Reservar»,
   puede liberarlo o marcarlo como entregado con el código que le dicta quien recibe. Entregar deja
   registrado quién lo recibió y cuándo.
5. Solo quien recibió el artículo lo califica, de 1 a 5, una sola vez.
6. Al entregar y al calificar con 4 o 5 estrellas se otorgan créditos a quien regaló, respetando los
   topes (§7). El saldo nunca se edita: solo se agregan movimientos.
7. `GET /api/creditos` devuelve el saldo y los movimientos de la sesión.
8. Todo lo anterior con tests, y `npm run lint`, `npm run test` y `npm run build` en verde.

## 2. Decisiones (2026-09-29, Javier)

| # | Decisión |
|---|---|
| 1 | **Receptor:** *(reemplazada)* antes se identificaba con **"Lo quiero"**. Hoy lo elige quien publica con **«Reservar»** (§5.6): el artículo pasa a `en_negociacion` y se guarda `usuario_comprador_id` |
| 2 | **DBML:** el PDF del Sprint 3 vale como acuerdo para los cambios de §3 |
| 3 | **Créditos:** valores de prueba de §7, en un solo archivo de constantes |
| 4 | **Distancia:** grilla de 250 m del backend (ya implementada). Los 20 m son el redondeo que hace el navegador sobre el punto de quien mira; no hay contradicción |
| 5 | **Nombre del publicador:** texto fijo `"Vecino de Santo Domingo"` hasta que se guarde el nombre real (toca el núcleo y HU-38; Sprint 4) |
| 6 | **Ubicación del artículo:** `lat` y `lon` opcionales al publicar; se guardan con `aproximarParaGuardar` |
| 7 | **Filtro por banda:** parámetro opcional `banda` en el listado |
| 8 | **Rutas nuevas:** las de §5.2 |
| 9 | **Artículo reservado o entregado:** lo ven solo quien lo publicó y quien lo reservó |
| 10 | **Reputación:** es de la persona, no del artículo (PDF). El promedio se calcula sobre `ratings` al consultar; no se guarda |

**Decisión 9 extendida para el chat (HU-06):** quien ya conversó por un artículo conserva el acceso a su historial en solo lectura aunque otro vecino lo reserve o lo reciba. Ese participante solo recibe `titulo`, `estado` y `puedoEscribir`; la foto va `null` si el artículo ya no le es visible por la regla de la decisión 9 y no hay detalle ni otros datos. El chat no reutiliza la búsqueda del detalle: usa `esVisiblePara` (`marketplace/articulo-publico.ts`) más "es participante de una conversación".

## 3. Base de datos (PR 1)

Una migración nueva. Ninguna migración existente se edita.

### 3.1 `articulos_marketplace` — crear

La tabla está en el DBML pero **no existe en la base**: ninguna migración la creó. Se crea completa.

| Columna | Tipo | Nota |
|---|---|---|
| `id` | int, PK, autoincremental | |
| `usuario_publicador_id` | varchar(36), not null, FK `usuarios_ciudadanos` | |
| `residuo_catalogo_id` | int, not null, FK `residuos_catalogo` | La categoría sale de aquí |
| `tipo` | enum(`regalo`, `intercambio`), not null | **Nueva** |
| `titulo` | varchar(255), not null | |
| `descripcion` | text, null | |
| `estado` | enum(`disponible`, `en_negociacion`, `retirado`, `completado`), default `disponible` | |
| `foto_path` | varchar(500), null | **Nueva.** Ruta relativa a la carpeta de subidas; nunca una URL |
| `latitud` | decimal(10,8), null | **Nueva.** Ya aproximada a 250 m |
| `longitud` | decimal(11,8), null | **Nueva.** Ya aproximada a 250 m |
| `fecha_publicacion` | timestamp, not null | |
| `fecha_expiracion` | timestamp, not null | **Nueva.** Publicación + 30 días |
| `usuario_comprador_id` | varchar(36), null, FK `usuarios_ciudadanos` | Interesado que eligió quien publicó (reservado) / quien recibió |
| `codigo_entrega` | char(6), null | **Nueva (chat).** Código de 6 dígitos generado al reservar; se borra al liberar y al entregar |
| `intentos_codigo` | tinyint, not null, default 0 | **Nueva (chat).** Códigos errados al entregar; con 5 se bloquea |
| `fecha_reserva` | datetime, null | **Nueva (chat).** Cuándo se reservó |
| `fecha_transaccion` | timestamp, null | Cuándo se entregó |
| `created_at`, `updated_at` | timestamp | |

- **Se quitan** `calificacion_promedio` y `cantidad_evaluaciones` del DBML (decisión 10).
- Índice en (`estado`, `fecha_expiracion`) para el listado.

### 3.2 `ratings` — crear

Igual que el DBML, más un índice único en (`articulo_id`, `usuario_calificador_id`): una
calificación por intercambio, garantizada también por la base.

### 3.3 `mensajes_marketplace` — crear

Ya existía en la base. Para el chat (HU-06) la migración `1782164700000-chat-marketplace` agrega:

- `interesado_id VARCHAR(36) NOT NULL`, FK a `usuarios_ciudadanos`. Una conversación es (`articulo_id`, `interesado_id`); el otro participante es siempre quien publicó. Las filas sembradas se completan con el remitente que no es el publicador, o con el comprador; las que no tienen interlocutor se borran.
- Índices `idx_mensajes_conversacion (articulo_id, interesado_id, id)` e `idx_mensajes_interesado (interesado_id)`.
- `leido` lo marca solo el destinatario.

La conversación se identifica hacia afuera con un `conversacionId` opaco: el `id` de la fila de interés (§3.3.2). El id del interesado nunca sale del servidor.

### 3.3.1 `suscripciones_push` — crear (chat)

Una fila por navegador o dispositivo (Web Push): `id`, `usuario_ciudadano_id` (FK a `usuarios_ciudadanos`), `endpoint` (`VARCHAR(500)`, índice único `uq_suscripciones_endpoint`), `p256dh`, `auth`, `created_at`, `updated_at`. Índice `idx_suscripciones_usuario` por vecino.

### 3.3.2 `interesados_marketplace` — crear (interés)

Migración `1782164800000-interes-reserva-marketplace`. Una fila por vecino interesado en un artículo: `id`, `articulo_id` (FK, `ON DELETE CASCADE`), `usuario_interesado_id` (FK a `usuarios_ciudadanos`), `created_at`. `UNIQUE (articulo_id, usuario_interesado_id)` e índice `(usuario_interesado_id, created_at)` para el tope diario. Se rellena con un interés por cada par (artículo, interesado) que ya tuviera mensajes. Su `id` es el `conversacionId`. La misma migración agrega a `articulos_marketplace` las columnas de §3.1. La dirección del vecino no se guarda en ninguna tabla del marketplace.

### 3.4 `transacciones_circular_credits` — crear

Igual que el DBML, con estos cambios:

| Cambio | Por qué |
|---|---|
| `monto_creditos` pasa de decimal(10,2) a **int** | `saldo_anterior` y `saldo_nuevo` ya son int; los valores de §7 son enteros |
| Nueva `origen` enum(`entrega`, `estrellas`, `retirada`, `ajuste`), not null | Para mostrar el origen en la billetera y aplicar el tope por intercambio |
| Nueva `solicitud_retiro_id` int, null, FK `solicitudes_retiro` | Para el 50 % por retiro pagado (§7.3) |
| Índice único (`articulo_id`, `origen`) | Tope "uno por intercambio": una entrega y un bono por artículo |
| Índice único (`solicitud_retiro_id`) | Un otorgamiento por solicitud |

`tipo` se mantiene; todo lo de este spec es `bonificacion`.

### 3.5 `residuos_catalogo` — agregar `creditos`

`creditos` int, **null y sin llenar**. Mientras el valor sea el mismo para todos, el cálculo usa la
constante de §7. Así, cambiar el valor de prueba no exige otra migración.

### 3.6 Entidades

Nuevas entidades en `apps/backend/src/core/entities/` y alta en `ENTIDADES`
(`src/core/entities/index.ts`): es el único lugar donde TypeORM las registra (ver
`src/database/data-source.ts`). Por eso el PR 1 toca el núcleo y lo revisa backend ciudadano.

## 4. Estados del artículo

```
disponible ──reservar──▶ en_negociacion ──entregar──▶ completado
    ▲  │                         │
    │  └──retirar──▶ retirado    │
    └──────────liberar───────────┘
```

| Acción | Desde | Hacia | Quién |
|---|---|---|---|
| Reservar | `disponible`, no vencido | `en_negociacion` (guarda el comprador y la fecha, genera el código) | Quien publicó, eligiendo a un interesado de ese artículo |
| Liberar | `en_negociacion` | `disponible` (borra comprador, código y fecha de reserva) | Quien publicó |
| Entregar | `en_negociacion` | `completado` (exige el código; lo borra) | Quien publicó |
| Retirar | `disponible` | `retirado` | Quien publicó |

Un artículo está **vencido** si `fecha_expiracion` ya pasó. No cambia de estado: simplemente deja de
listarse y no admite intereses ni reservas.

**Quién ve cada artículo** (decisión 9):

- `disponible` y no vencido: cualquier vecino con sesión.
- En cualquier otro caso: solo quien publicó y quien figura como comprador. Para el resto, **404**.

## 5. Endpoints

Todos bajo `/api`, con sesión (`arca_sesion`). La identidad sale siempre de la cookie, nunca del body.

### 5.1 Los que ya espera el frontend

| Método y ruta | Qué hace |
|---|---|
| `GET /marketplace/articulos?tipo=&categoria=&texto=&lat=&lon=&banda=` | Listado. Solo `disponible` y no vencidos. `banda` es opcional y requiere `lat`/`lon`; los artículos sin banda calculable quedan fuera cuando se filtra por banda. `@LimiteUbicacion()` |
| `GET /marketplace/articulos/:id?lat=&lon=` | Detalle, según la visibilidad de §4. `@LimiteUbicacion()` |
| `POST /marketplace/articulos` | Publicar. `multipart/form-data`: `tipo`, `titulo`, `descripcion?`, `residuoCatalogoId`, `foto?`, **`lat?`, `lon?`** (nuevos) |
| `GET /marketplace/mis-articulos` | Los de la sesión, todos los estados, más recientes primero |
| `PATCH /marketplace/articulos/:id/retirar` | `disponible` → `retirado`. 403 si no es propio, 409 si no está `disponible` |

### 5.2 Nuevos

| Método y ruta | Qué hace | Errores |
|---|---|---|
| `GET /marketplace/articulos/:id/foto` | Devuelve la imagen. Misma visibilidad que el detalle | 404 si no hay foto o no se puede ver |
| `PATCH /marketplace/articulos/:id/reservar` | Body `{ conversacionId }`. Quien publicó elige a un interesado: `en_negociacion` y código de 6 dígitos (§5.5) | 403 si no es propio · 404 si el interesado no es de ese artículo · 409 si no está `disponible` o está vencido |
| `PATCH /marketplace/articulos/:id/liberar` | Rechaza al interesado y borra código y reserva | 403 si no es propio · 409 si no está `en_negociacion` |
| `PATCH /marketplace/articulos/:id/entregar` | Body `{ codigo }` (6 dígitos). Cierra el intercambio y otorga los créditos de entrega (§7) | 400 si el código es incorrecto · 403 si no es propio · 409 si no está `en_negociacion` o el código está bloqueado |
| `POST /marketplace/articulos/:id/calificacion` | Body `{ puntuacion: 1-5, comentario?: string }`. Otorga el bono por estrellas (§7) | 403 si no es quien recibió · 409 si no está `completado` o ya calificó |
| `GET /creditos` | `{ saldo, movimientos[] }` de la sesión | — |

**Interés y chat (HU-06).** En `marketplace/chat/`. El parámetro `conversacion` (query) es el `conversacionId` opaco (el id del interés); solo lo indica quien publicó, porque el interesado tiene una sola conversación por artículo y se resuelve por la sesión. «Lo quiero» (`POST .../solicitar`) ya no existe.

| Método y ruta | Qué hace | Errores |
|---|---|---|
| `POST /marketplace/articulos/:id/interes` | «Me interesa» / «Quiero intercambiar»: registra el interés y abre el chat. Idempotente. Responde `{ conversacionId }`. Tope de 20 intereses nuevos por vecino en 24 h (las repeticiones no cuentan) | 403 si es propio · 404 · 409 si no está `disponible` o venció · 429 al pasar el tope |
| `GET /marketplace/articulos/:id/interesados` | Solo quien publicó. Por interesado: `conversacionId`, `nombre` (de pila), `calificacionPromedio`, `cantidadCalificaciones`, `identidadVerificada: true`, `noLeidos`, `ultimoMensaje` (o `null`), `reservado`. Lo más reciente primero | 403 si no es propio · 404 |
| `GET /marketplace/conversaciones` | Bandeja: las conversaciones de la sesión (hasta 100), la de actividad más reciente primero | — |
| `GET /marketplace/articulos/:id/mensajes?conversacion=&antesDe=` | Historial, 50 por página, ascendente. `antesDe` es el id del mensaje más antiguo ya cargado | 400 si quien publica no indica `conversacion` · 404 si el artículo o la conversación no existen o no son visibles. Incluye `otroNombre` |
| `POST /marketplace/articulos/:id/mensajes?conversacion=` | Body `{ contenido }` (máx. 1000 caracteres). `@LimiteChat()` (30 por minuto por IP) y tope de 20 mensajes por minuto por vecino remitente. Solo escribe quien tiene interés; quien publica puede iniciar la conversación con cualquier interesado, aunque no haya mensajes | 400 como arriba · 403 si no mostró interés · 404 · 409 si la conversación es de solo lectura · 429 al pasar el tope |
| `PATCH /marketplace/articulos/:id/mensajes/leidos?conversacion=` | Marca como leído lo recibido; nunca lo propio | 400 · 404 |

Se puede escribir si el artículo está `disponible` y vigente, o `en_negociacion` reservado por ese mismo interesado. En cualquier otro caso (retirado, completado, vencido o reservado por otro vecino) la conversación es de solo lectura para ambos.

**Push (HU-06).** En `push/`. Los avisos son opcionales: sin claves VAPID el chat funciona igual.

| Método y ruta | Qué hace | Errores |
|---|---|---|
| `GET /push/clave-publica` | `{ clavePublica }`; `null` si no hay claves VAPID | — |
| `POST /push/suscripciones` | Body `{ endpoint, keys: { p256dh, auth } }`. Responde `{ suscrito: true }`. Si el `endpoint` ya existía se reasigna al vecino actual; tope de 5 por vecino (se borra la más antigua) | 400 si el servicio push no está en la lista blanca · 409 si no hay claves VAPID |
| `DELETE /push/suscripciones` | Body `{ endpoint }`. Responde `{ eliminado: true }` | — |

**Denuncias (HU-16).** En `denuncias/`, tabla `denuncias` (migración `1782165500000-denuncias`, sigue el
esquema dbml más `origen` y `mensajes_adjuntos`). El vecino nunca envía ni recibe el id del denunciado: si
denuncia quien publicó, el denunciado es el interesado de `conversacion`; si no, es quien publicó.

| Método y ruta | Qué hace | Errores |
|---|---|---|
| `POST /denuncias` | Body `{ articuloId, origen: articulo\|perfil\|chat, motivo, descripcion?, conversacion?, mensajes?: id[] }`. `motivo`: `no_se_presento`, `articulo_distinto`, `basura_encubierta`, `pidio_datos_o_dinero`, `trato_ofensivo` u `otro`. Descripción de hasta 500 caracteres. Hasta 5 mensajes de esa conversación, que se **copian** (el chat se borra a los 30 días). Responde `{ id }`. Una sola denuncia abierta por denunciante, denunciado y artículo; tope de 5 por vecino en 24 h. Se audita sin la descripción ni los mensajes | 400 si quien publica no indica `conversacion` · 403 si se denuncia a sí mismo o adjunta mensajes que no son de su conversación · 404 si el artículo no existe o no es visible · 409 si ya hay una abierta · 429 al pasar el tope |
| `GET /denuncias/mias` | Las denuncias propias: `id`, `articuloId`, `articuloTitulo`, `motivo`, `origen`, `estado` (`abierta`, `investigacion`, `resuelta`, `rechazada`), `fechaDenuncia`, `fechaResolucion`. Nunca el denunciado ni la resolución | — |

Decisiones de Miguel (PO) que se apartan de `tasks/instrucciones-denuncia.md`:
- Puede denunciar a quien publicó **cualquier vecino que vea el artículo**, aunque no haya escrito: así se
  denuncia una publicación sospechosa sin tener que contactarla. Solo puede adjuntar mensajes quien tiene
  conversación. Quien publicó solo denuncia a un interesado de su artículo.
- Se adjuntan hasta 5 mensajes de 500 caracteres, no la conversación completa.
- No hay aviso «Recibimos tu denuncia» en la campanita: el estado se ve en `GET /denuncias/mias`.
- Los motivos son los de la lista de arriba, acordados con el panel.

El 409 y el tope diario se cuentan dentro de una transacción que bloquea la fila del denunciante, para que
dos envíos simultáneos no se los salten. `motivo` es `ENUM` también en la base. La `descripcion` se guarda
tal como la escribió el vecino (solo `trim`): el frontend y el panel la muestran como texto, nunca como HTML.

La revisión en el panel y el bloqueo (HU-18) van aparte, en `admin/`. La tabla ya trae `resolucion`,
`revisado_por_administrador_id` y `fecha_resolucion` para eso.

Las acciones que cambian el estado devuelven el `ArticuloMarketplace` actualizado.
`calificacion` responde 201 con `{ puntuacion, comentario, fecha }`.

### 5.3 Forma de las respuestas

`ArticuloMarketplace` es el del contrato del frontend. La tabla indica cómo se llenan algunos de sus
campos y agrega tres nuevos (en negrita):

| Campo | Tipo | Qué es |
|---|---|---|
| `fotoUrl` | string \| null | `/api/marketplace/articulos/:id/foto`, o null si no tiene |
| `creditos` | number | Créditos que otorga la entrega (hoy, `VALOR_BASE`) |
| `publicador.nombre` | string | `"Vecino de Santo Domingo"` (decisión 5) |
| `publicador.calificacionPromedio` / `cantidadCalificaciones` | number \| null / number | Calculados sobre `ratings` del publicador |
| **`fechaExpiracion`** | string (ISO) | Nuevo |
| **`soyReceptor`** | boolean | Nuevo. La sesión es quien reservó o recibió |
| **`puedoCalificar`** | boolean | Nuevo. `completado`, la sesión es quien recibió y todavía no calificó |

Movimiento de `GET /creditos`, más recientes primero:

```json
{
  "id": 12,
  "monto": 100,
  "origen": "entrega",
  "motivo": "Entrega de «Sofá de 3 cuerpos»",
  "saldoAnterior": 200,
  "saldoNuevo": 300,
  "fecha": "2026-09-30T15:04:00.000Z"
}
```

### 5.4 Chat: respuestas y eventos socket

Ningún id de vecino sale del servidor: los mensajes llevan `esMio` en vez del remitente.

```ts
MensajePublico  { id, contenido, fecha, esMio, leido }
ArticuloDelChat { id, titulo, estado, fotoUrl: string | null }
HistorialChat   { articulo, conversacionId: number | null, soyPublicador, puedoEscribir, mensajes[], hayMas }
ConversacionResumen { conversacionId, articulo, soyPublicador, ultimoMensaje: { contenido, fecha, esMio }, noLeidos }
MensajeEnviado  { conversacionId, mensaje }   // respuesta del POST
```

`conversacionId` es `null` en el historial del vecino que todavía no mostró interés. `otroNombre` es el nombre de pila del otro participante. `ultimoMensaje.contenido` se recorta a 100 caracteres. `fotoUrl` va `null` si el vecino no podría ver la foto (404).

Tiempo real: socket.io en la ruta `/api/socket.io` (bajo `/api` para que viaje la cookie de sesión, que tiene `Path=/api`). El servidor solo empuja; enviar y marcar leídos van siempre por REST. Al conectar se valida la cookie y el `Origin`; cada vecino queda en la sala `usuario:<ciudadanoId>`.

| Evento | Se emite a | Payload |
|---|---|---|
| `mensaje` | Remitente y destinatario, cada uno con su `esMio` | `{ articuloId, conversacionId, mensaje }` |
| `leidos` | El otro participante: leyeron todo lo que enviaste | `{ articuloId, conversacionId }` |

Si el destinatario no tiene ningún socket conectado, se le envía un aviso push (`titulo` del artículo, `cuerpo` «`<nombre> te escribió`», sin repetir el texto del mensaje, y `url` de la conversación). El push nunca bloquea ni hace fallar el envío.

### 5.5 Reserva, código de entrega y datos que se muestran

- **Nombre:** primer nombre de la sesión de ClaveÚnica activa más reciente (solo nombres, sin apellidos); sin sesión activa, el texto provisorio `NOMBRE_PUBLICADOR_PROVISORIO`. Se usa en la lista de interesados, en la cabecera del chat y en los avisos. El listado y el detalle del artículo siguen mostrando el nombre fijo de la decisión 5.
- **Insignia:** toda cuenta nace de ClaveÚnica, así que `identidadVerificada` es `true` para todos.
- **Código:** al reservar se genera con `crypto.randomInt`. `codigoEntrega` solo llega a quien recibió (`soyReceptor`) y solo mientras está `en_negociacion`; nunca a quien publicó. Quien recibe se lo dicta a quien publicó, que lo ingresa en «Confirmar entrega». Cada código errado suma un intento y con 5 la entrega se bloquea hasta liberar y volver a reservar.
- **Sector:** `sector` (el sector más cercano a la ubicación aproximada) solo se entrega a quien publicó y a quien recibió, reservado o entregado; para el resto va `null`. `reservadoPara` (nombre de quien recibe) solo lo ve quien publicó.
- **Al reservar,** los demás chats quedan de solo lectura (§5.2); si se libera, vuelven a poder escribir.
- **Conservación:** `ConservacionChatService` borra los mensajes y los intereses de los artículos `completado` o `retirado` cuya última actualización tiene más de 30 días, y de los `disponible` vencidos hace más de 30 días (`DIAS_CONSERVACION_CHAT`). Corre al arrancar y cada 24 h, y deja una constancia de auditoría del sistema con los conteos.
- **Auditoría:** el alta de interés (`CREATE` sobre `interesados_marketplace`) y la reserva, liberación y entrega (`UPDATE` sobre `articulos_marketplace`, solo con el estado). Nunca el texto de los mensajes ni el código.

### 5.6 Acuerdo pendiente: chat antes de reservar

> **PENDIENTE DE ACUERDO CON MIGUEL.** El PDF de Miguel del 21-10 («Chat entre vecinos») dice que «El chat solo existe si el publicador aceptó». Esta implementación **se aparta de esa regla**: «Me interesa» abre el chat de inmediato y varios interesados pueden conversar con quien publica antes de que este reserve. Lo decidió Benjamín (24-10) para no trabar el intercambio; hay que acordarlo con Miguel antes del PR.
>
> Mitigaciones del riesgo que la regla del PDF quería evitar (que se junten direcciones y datos personales): tope de 20 «Me interesa» por vecino al día; el sector solo se muestra tras reservar y solo a los dos participantes; la dirección nunca se guarda en tablas del marketplace; el aviso push no repite el texto; auditoría de interés, reserva, liberación y entrega; tope de 20 mensajes por minuto por vecino; los chats cerrados se borran a los 30 días.
>
> Los números (30 días, 20 intereses por día, 20 mensajes por minuto) son provisorios y los confirma Miguel.

## 6. Foto

- Una por artículo, opcional. JPG, PNG o WebP, hasta **5 MB**.
- El tipo se valida por el **contenido del archivo** (firma de bytes), no solo por la extensión o el
  `Content-Type` que manda el cliente.
- Se guarda con un nombre aleatorio en la carpeta de la variable **`UPLOADS_DIR`**, fuera de lo que
  sirve el servidor web. En local, `./uploads`, que el PR 2 agrega a `.gitignore`. En cPanel la define
  quien despliega.
- Solo se entrega por `GET /marketplace/articulos/:id/foto`, con sesión y la visibilidad de §4.
- La lógica de subida queda en un servicio reutilizable: es la misma que después usarán las fotos de
  las solicitudes (Sprint 4).
- Si la foto se atrasa, el PR de publicar sale sin foto y ella entra después (lo permite el PDF).

## 7. Circular Credits

### 7.1 Constantes (valores de prueba)

Viven en un solo archivo, con el cálculo en una sola función, para cambiarlos sin tocar el resto.

| Constante | Valor |
|---|---|
| `VALOR_BASE` | 100 |
| `BONO_4_ESTRELLAS` | 50 (monto fijo). Con 5 estrellas, el doble: 100. Con 3 o menos, 0 |
| `TOPE_MENSUAL` | 1000 créditos por vecino |
| `TOPE_PAREJA` | 400 créditos por mes entre los mismos dos vecinos |
| `PORCENTAJE_RETIRADA` | 50 (%) |

La regla definitiva, proporcional al precio del catálogo (`residuos_catalogo.precio`), reemplazará
solo la función de cálculo.

### 7.2 Reglas

- Los créditos de la **entrega** (100 % de `VALOR_BASE`) y el **bono por estrellas** van a **quien
  regaló** (quien publicó).
- **Tope por intercambio:** un movimiento de `entrega` y uno de `estrellas` por artículo.
- **Tope mensual:** lo que gana un vecino en el mes calendario (hora de Chile) no supera `TOPE_MENSUAL`.
- **Tope por pareja:** lo generado por intercambios entre los mismos dos vecinos, en cualquier
  dirección y en el mes calendario, no supera `TOPE_PAREJA`.
- **Al llegar a un tope** se otorga hasta completarlo y el resto se pierde. El movimiento se registra
  igual, aunque sea de 0, con el motivo ("se alcanzó el tope mensual" o "…por pareja").
- Cada movimiento guarda `saldo_anterior` y `saldo_nuevo`. El saldo actual es el `saldo_nuevo` del
  último movimiento. Otorgar corre en una transacción que bloquea los movimientos del vecino, para que
  dos otorgamientos simultáneos no lean el mismo saldo.
- Si un cálculo da decimales, se redondea hacia abajo.

**Ejemplo con dos vecinos de prueba:** primer intercambio con 5 estrellas, 200 créditos; segundo,
otros 200 (la pareja llega a 400); tercero, 0 con el motivo del tope por pareja.

### 7.3 50 % por retiro pagado

El vecino recibe los créditos del retiro municipal **al momento del pago** de su solicitud (decisión
del 13-10-2026; antes se pensó otorgarlos al llegar a `retirada`). Son 50 créditos al solicitante,
sujetos al tope mensual.

`CreditosService.otorgarPorPago(manager, solicitud)` la llama `PagosService` al confirmar Webpay
(HU-44), **en la misma transacción** que deja `estado_pago = pagado`. Confirmar dos veces el mismo
pago no otorga dos veces: la función devuelve el movimiento que ya existía, y el índice único
`uq_creditos_solicitud` lo respalda. Si el monto o la orden que devuelve Transbank no coinciden,
no se marca `pagado`, no se otorgan créditos y se pide la reversa.

Los créditos por intercambios y regalos entre vecinos siguen las reglas de §7.2.

## 8. Fuera de alcance

| Queda fuera | Por qué |
|---|---|
| Nombre real del vecino | Toca el núcleo y HU-38. Sprint 4. El chat usa solo el nombre de pila de la sesión de ClaveÚnica (§5.5) |
| Revisar denuncias y bloquear (HU-18) | Va en el panel municipal (`admin/`), en un PR aparte. La denuncia del vecino ya existe (§5.2) |
| Intercambio con propuesta de artículo, perfil público y doble reserva | Segunda fase; por ahora el intercambio funciona igual que el regalo |
| Disparador del 50 % por retiro pagado | Se conecta en la confirmación del pago con Webpay, HU-44 (§7.3) |
| Notificación al recibir créditos | HU-23 está fuera del sprint |
| Fotos en las solicitudes de retiro | Sprint 4; reutilizan el servicio de §6 |
| Migración de zona horaria | Va aparte: falta decidir columnas y fecha de corte (el cambio de horario de septiembre corre 4 h las filas anteriores y 3 h las posteriores) |

## 9. Plan de PRs

| # | Rama | Área | Contenido | Revisor |
|---|---|---|---|---|
| 0 | `2026-09-29-javier-spec-marketplace` | Documentación | Este spec | Miguel |
| 1 | `2026-09-29-javier-migracion-marketplace` | Base de datos + núcleo | §3: migración, entidades, DBML | Miguel (y Benjamín, migraciones) |
| 2 | `2026-09-29-javier-publicar-listar` | Backend ciudadano | §5.1, foto (§6) | Miguel |
| 3 | `2026-09-30-javier-entrega-estrellas` | Backend ciudadano | Solicitar, liberar, entregar, calificar | Miguel o Ana |
| 4 | `2026-10-01-javier-circular-credits` | Backend ciudadano | §7 y `GET /creditos` | Miguel o Maxi |

El PR 1 junta base de datos y núcleo porque una entidad sin su tabla hace fallar al backend al
arrancar. Cada PR actualiza `apps/backend/README.md` y `docs/BACKEND_FASE1.md` (regla A.10).

## 10. Para el frontend

- `apps/frontend/src/api/marketplace.ts` es de Miguel: este spec **no** lo modifica. Los cambios que
  implica son agregar `lat`/`lon` al publicar, `banda` opcional al listar, los tres campos nuevos de
  §5.3 y las llamadas de §5.2.
- El contrato actual muestra `creditos: 10` en los datos de ejemplo; el valor real vendrá del backend.

## 11. Discrepancias encontradas

- `residuos_catalogo.precio` existe en la base (migración `1782163600000`) y en la entidad, pero no en
  el DBML. Se agrega al DBML en el PR 1, junto con `creditos`.
