# A.R.C.A. — Backend (API REST)

API del proyecto A.R.C.A. Construida con **NestJS + TypeScript + TypeORM + MySQL**.

> Documentación detallada de la fase actual: [`docs/BACKEND_FASE1.md`](../../docs/BACKEND_FASE1.md)
> Setup local completo (Docker, migraciones, troubleshooting): [`docs/SETUP_LOCAL.md`](../../docs/SETUP_LOCAL.md)

---

## Arrancar en local

Si es la primera vez en este PC, corré desde la raíz el script que deja todo listo
(MySQL en Docker, dependencias, `.env.local`, migraciones y ambos servidores):

```powershell
.\scripts\setup.ps1
```

Manual, solo el backend:

```bash
# 1. MySQL (desde la raíz del repo)
docker compose up -d

# 2. Dependencias
cd apps/backend
npm install

# 3. Entorno: copiar .env.example → .env.local y completar
#    DB_USERNAME=arca_user  DB_PASSWORD=arca_pass

# 4. Migraciones
npm run migration:run

# 5. Servidor
npm run start:dev
```

Queda en `http://localhost:3000`, con **prefijo global `/api`**.
Verificación rápida: `curl http://localhost:3000/api/health`

---

## Variables de entorno (`.env.local`)

| Variable | Valor local | Uso |
|---|---|---|
| `DB_HOST` | `localhost` | Host de MySQL |
| `DB_PORT` | `3306` | Puerto de MySQL |
| `DB_USERNAME` | `arca_user` | Usuario (definido en `docker-compose.yml`) |
| `DB_PASSWORD` | `arca_pass` | Contraseña (definida en `docker-compose.yml`) |
| `DB_DATABASE` | `arca_dev` | Base de datos |
| `PORT` | `3000` | Puerto de la API |
| `NODE_ENV` | `development` | Entorno |
| `FRONTEND_URL` | `http://localhost:5173` | Orígenes del frontend (separados por coma): CORS y únicos aceptados en POST/PUT/PATCH/DELETE (chequeo de `Origin`). En local con otro puerto o un túnel, agregarlo aquí |
| `UPLOADS_DIR` | vacío (`./uploads`) | Carpeta de las fotos del marketplace. En el servidor, fuera de `public_html`: solo se entregan por la API |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | vacías | Avisos push del chat. Opcionales: vacías, el chat funciona sin avisos. Generar el par una vez con `npx web-push generate-vapid-keys`; `VAPID_SUBJECT` es un `mailto:` o `https:` de contacto |
| `MAIL_HOST` | `smtp.gmail.com` | Servidor SMTP para envío de correos |
| `MAIL_PORT` | `465` | Puerto SMTP (465 SSL o 587 TLS) |
| `MAIL_USER` | `soporte.arcaa@gmail.com` | Cuenta de correo emisora |
| `MAIL_PASS` | opcional | Contraseña de aplicación de Google (si falta, activa modo simulación en consola) |
| `MAIL_FROM` | `"A.R.C.A. <soporte.arcaa@gmail.com>"` | Nombre y dirección en cabecera From |

`.env.local` **no se versiona** (está en `.gitignore`). La plantilla es `.env.example`.

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | Servidor en watch mode |
| `npm run start:prod` | Corre el build de `dist/` |
| `npm run build` | Compila con `nest build` |
| `npm run migration:run` | Aplica las migraciones pendientes |
| `npm run migration:revert` | Revierte la última migración |
| `npm run lint` | ESLint sin modificar archivos (es el chequeo antes de integrar) |
| `npm run lint:fix` | ESLint con `--fix` |

Las migraciones (`src/database/migrations`) están excluidas del lint: una migración aplicada no se
edita (regla A.12 de `AGENTS.md`), y `--fix` la reescribiría.
| `npm run test` / `test:e2e` / `test:cov` | Jest (unit / e2e / coverage) |

---

## Endpoints implementados

Todos cuelgan del prefijo `/api`.

### Endpoints del ciudadano

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/residuos/catalogo` | Catálogo de residuos (incluye `precio` real) |
| `POST` | `/api/solicitudes-retiro` | Crear solicitud (`multipart/form-data`): `usuarioCiudadanoId`, `residuoCatalogoId`, `direccionRetiro` (obligatoria), `descripcion?`, `emailContacto?`, coords opcionales y archivo `foto` (JPG/PNG/WebP ≤5 MB, obligatorio). Copia `direccionRetiro` a `direccionAnonimizada` como puente para panel/Excel. Respuesta incluye `fotoUrl` |
| `GET` | `/api/solicitudes-retiro` | Listar solicitudes (filtrable por estado); cada ítem trae `direccionRetiro` y `fotoUrl` |
| `GET` | `/api/solicitudes-retiro/:id` | Detalle con `ultimaRevision` (`{ decision, motivo, comentario, fecha }` o `null`), `direccionRetiro` y `fotoUrl`. Nunca el revisor, el checklist ni las notas internas |
| `GET` | `/api/solicitudes-retiro/:id/foto` | Foto `antes` del vecino; misma regla de acceso que el detalle (`404` si no hay) |
| `PATCH` | `/api/solicitudes-retiro/:id/reenviar` | El dueño reenvía en `requiere_modificacion` (vuelve a `en_revision`). `multipart` opcional: `{ descripcion?, residuoCatalogoId?, direccionRetiro? }` + archivo `foto?`. `400` desde otro estado, `403` si no es suya (o si está `rechazada`: solo un admin la reabre). La auditoría registra estado y categoría, nunca la descripción |
| `PATCH` | `/api/solicitudes-retiro/:id/cancelar` | Cancelar solicitud (ciudadano). Borra la dirección de retiro: una cancelada no se reabre |
| `GET` | `/api/perfil` | Perfil de contacto del vecino: `{ nombre, email, telefono, direccion }` (HU-37). Teléfono y dirección salen de `contacto_ciudadano`; `nombre` (de la sesión) solo lectura |
| `PATCH` | `/api/perfil` | Actualiza `{ telefono?, direccion? }` en `contacto_ciudadano` (un texto vacío borra el dato). Audita qué campos cambiaron, sin los valores. El correo solo cambia vía `/api/mail` |
| `GET` | `/api/perfil/baja` | Antes de darse de baja (HU-38): `{ puedeDarseDeBaja, solicitudesQueBloquean, articulosQueBloquean, solicitudesQueSeCancelan, horasParaVolver }` |
| `POST` | `/api/perfil/baja` | Body `{ confirmo: true }`. Desactiva la cuenta con `fecha_baja`, cancela las solicitudes abiertas sin pagar, borra el contacto y el push, revoca las sesiones y borra la cookie. 409 si hay solicitudes pagadas o en retiro o intercambios reservados; 403 si es funcionario. Volver: entrar de nuevo pasadas 48 h |
| `POST` | `/api/mail/enviar-codigo` | Solicitar código OTP (`{ email }`). El ciudadano se toma de la sesión, no del body |
| `POST` | `/api/mail/verificar-codigo` | Validar código (`{ email, codigo }`) y asociar correo a la sesión del vecino autenticado |
| `POST` | `/api/pagos/solicitudes/:id` | Inicia Webpay Plus (HU-44) si la solicitud es del vecino, está `aprobada`, `estadoPago` es `pendiente` y `monto` > 0. Responde `{ url, token }`. El navegador debe enviar un formulario `POST` a `url` con el campo `token_ws` = `token`. `403` si no es suya, `404` si no existe, `409` si no hay cobro pendiente o ya está pagada |
| `GET` | `/api/pagos/solicitudes/:id` | Comprobante del dueño: `{ estadoPago, monto, orden, codigoAutorizacion, fecha, resultado }`. `resultado` es `aprobado`, `anulado`, `agotado`, `rechazado` o `null` |
| `GET`/`POST` | `/api/pagos/retorno` | Vuelta de Transbank, pública y exenta del chequeo de `Origin`. No usa la cookie: reconoce el intento por `token_ws`. Solo confirma si viene `token_ws` sin `TBK_TOKEN`. Anulación y tiempo agotado no confirman. Si el monto, la orden o el código no coinciden, no deja `pagado`, no otorga créditos y pide la reversa. Responde `302` a `{FRONTEND_URL}/pago/:id?resultado=aprobado\|anulado\|agotado\|rechazado` |

**Plazo de la dirección de retiro (decisión 016).** `ConservacionDireccionesService` corre al arrancar
y una vez al día: borra `direccion_retiro` (y la copia en `direccion_anonimizada`) de las solicitudes
`rechazada` o `retirada` cerradas hace más de 30 días, y deja constancia en la auditoría como
`sistema`, solo con la cantidad. Los 30 días dan margen a que un admin reabra la solicitud.

### Endpoints del marketplace (HU-04, HU-05, HU-15)

Requieren sesión. Contrato completo: [spec `marketplace`](../../docs/specs/SPEC-marketplace.md) §5.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/marketplace/articulos` | Publica (`multipart/form-data`): `tipo`, `titulo`, `descripcion?`, `residuoCatalogoId`, `lat?`, `lon?` y `foto?` (JPG, PNG o WebP de hasta 5 MB, validada por su contenido, no por la extensión, y guardada sin metadatos: ver más abajo). La ubicación se guarda aproximada a 250 m. Vence a los 30 días. `404` si el residuo no existe |
| `GET` | `/api/marketplace/articulos` | Disponibles y vigentes, del más nuevo al más antiguo. Filtros: `tipo`, `categoria`, `texto` (título o descripción), `banda` y el origen `lat`/`lon`, que agrega la banda de distancia (`@LimiteUbicacion`) |
| `GET` | `/api/marketplace/articulos/:id` | Detalle. Un artículo que no está disponible y vigente solo lo ven quien lo publicó y quien lo reservó; para el resto, `404` |
| `GET` | `/api/marketplace/articulos/:id/foto` | La foto, con la misma regla de visibilidad que el detalle (`404` si no hay foto) |
| `PATCH` | `/api/marketplace/articulos/:id/retirar` | Quien publicó lo retira. `403` si no es suyo, `409` si no está disponible |
| `GET` | `/api/marketplace/mis-articulos` | Lo publicado por la sesión, en cualquier estado |
| `PATCH` | `/api/marketplace/articulos/:id/reservar` | Quien publicó elige a un interesado (`{ conversacionId }`): pasa a `en_negociacion` y se genera el código de entrega de 6 dígitos, que solo ve quien recibe. `403` si no es suyo, `404` si el interesado no es de ese artículo, `409` si ya no está disponible o venció |
| `PATCH` | `/api/marketplace/articulos/:id/liberar` | Quien publicó rechaza al interesado: vuelve a `disponible`. `403` si no es suyo, `409` si no está reservado |
| `PATCH` | `/api/marketplace/articulos/:id/entregar` | Quien publicó cierra el intercambio: `completado`, con la fecha de entrega, y recibe los créditos de la entrega en la misma transacción. `403` si no es suyo, `409` si no está reservado |
| `POST` | `/api/marketplace/articulos/:id/calificacion` | Quien recibió califica a quien publicó: `{ puntuacion: 1-5, comentario? }` (hasta 1000 caracteres). Con 4 o 5 estrellas, quien publicó recibe el bono en la misma transacción. Responde `201` con `{ puntuacion, comentario, fecha }`. `403` si no es quien recibió, `409` si no está entregado o ya calificó |

### Chat del marketplace (HU-06)

Requieren sesión. Contrato completo: [spec `marketplace`](../../docs/specs/SPEC-marketplace.md) §5.2 y §5.4. La conversación se identifica con un `conversacionId` opaco, el id de la fila de interés (`?conversacion=`, solo lo indica quien publicó): el id del otro vecino nunca sale del servidor.

| Método | Ruta | Qué hace |
|---|---|---|
| `POST` | `/api/marketplace/articulos/:id/interes` | «Me interesa» / «Quiero intercambiar»: registra el interés, abre el chat y devuelve `{ conversacionId }`. Idempotente; tope de 20 intereses nuevos por vecino en 24 h (`429`) |
| `GET` | `/api/marketplace/articulos/:id/interesados` | Solo quien publicó: nombre de pila, estrellas, `identidadVerificada`, no leídos, último mensaje y si está reservado |
| `GET` | `/api/marketplace/conversaciones` | Bandeja de la sesión con el último mensaje y los no leídos |
| `GET` | `/api/marketplace/articulos/:id/mensajes` | Historial paginado (50; `antesDe`). Quien ya conversó lo ve en solo lectura aunque otro reserve el artículo |
| `POST` | `/api/marketplace/articulos/:id/mensajes` | Envía `{ contenido }` (hasta 1000 caracteres). `@LimiteChat()`: 30 por minuto por IP, y además 20 por minuto por vecino (`429`). Solo escribe quien tiene interés (`403`); quien publica puede iniciar la conversación con cualquier interesado. `409` si es de solo lectura |
| `PATCH` | `/api/marketplace/articulos/:id/mensajes/leidos` | Marca como leído lo recibido |

Tiempo real: `TiempoRealGateway` (`src/tiempo-real/`, socket.io en `/api/socket.io`, compartido por el chat y los avisos) solo empuja los eventos `mensaje`, `leidos` y `notificacion`; no define `@SubscribeMessage`, porque los guards globales son HTTP. En el handshake valida la cookie de sesión y el `Origin` y une al vecino a su sala. El gateway no tiene límite propio: la escritura pasa por el REST. Si el destinatario no tiene sockets conectados, `PushService` le manda un aviso con el título del artículo y «`<nombre> te escribió`», sin el texto del mensaje.

`ConservacionChatService` (`src/marketplace/chat/`) borra cada 24 h (y al arrancar) los mensajes e intereses de los artículos completados, retirados o vencidos hace más de 30 días, y deja una constancia de auditoría con los conteos.

### Campanita de avisos (HU-23, módulo `src/notificaciones/`)

Requieren sesión. Contrato y eventos: [`NOTIFICACIONES_CORREO.md`](../../docs/NOTIFICACIONES_CORREO.md) §6.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/notificaciones` | Avisos de la sesión, 30 por página (`antesDe`), con `noLeidos` y `hayMas` |
| `PATCH` | `/api/notificaciones/leidas` | Marca todos como leídos |

`NotificacionesService.notificar` guarda el aviso, lo emite por socket (`notificacion`) y, sin pestañas conectadas, manda push. Los mensajes de chat no crean avisos. Los avisos se borran a los 90 días (`ConservacionAvisosService`).

### Avisos push (módulo `src/push/`)

Requieren sesión. Sin claves `VAPID_*` el módulo queda deshabilitado (el log lo dice) y `clave-publica` devuelve `null`.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/push/clave-publica` | `{ clavePublica }` para suscribir el navegador |
| `POST` | `/api/push/suscripciones` | `{ endpoint, keys: { p256dh, auth } }`. Upsert atómico sobre `endpoint` (reasigna el dispositivo al vecino actual); tope de 5 por vecino. `400` si el servicio push no es uno conocido, `409` si no hay claves |
| `DELETE` | `/api/push/suscripciones` | `{ endpoint }`: borra la del vecino |

El `endpoint` debe ser `https:` y de una lista blanca de servicios push (FCM, Mozilla, Apple, Windows): `web-push` hace un POST a esa dirección, y sin la lista un vecino podría usar el servidor para llamar a cualquier otra (SSRF). Una suscripción que responde `404` o `410` se borra sola.

Cada cambio de estado es un solo `UPDATE` condicionado al estado esperado: si dos vecinos presionan
reservar a la vez, solo una pasa y la otra recibe `409`. Entregar exige el `codigo` de 6 dígitos (`400` si es incorrecto; con 5 errados, `409` hasta liberar y volver a reservar) y que el receptor siga siendo el mismo.

La respuesta nunca incluye la ubicación ni el id del publicador: solo `banda`, `esPropio` y un
nombre fijo ("Vecino de Santo Domingo"). `creditos` es el valor de prueba de
`src/creditos/reglas-creditos.ts`.

### Circular Credits (HU-10, HU-11)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/creditos` | `{ saldo, movimientos[] }` de la sesión. Cada movimiento: `{ id, monto, origen, motivo, saldoAnterior, saldoNuevo, fecha }`, del más reciente al más antiguo. `origen`: `entrega`, `estrellas`, `retirada` o `ajuste` |

Reglas (spec §7), con **valores de prueba** en `src/creditos/reglas-creditos.ts`:

- Los créditos van a **quien regaló**: 100 por la entrega; 50 más con 4 estrellas y 100 con 5.
- **Topes por mes calendario, en hora de Chile:** 1000 por vecino, y 400 entre los mismos dos
  vecinos, sumando los intercambios en ambas direcciones. Al llegar a un tope se otorga hasta
  completarlo y el movimiento queda igual, aunque sea de 0, con el motivo.
- El saldo nunca se edita: cada movimiento guarda el saldo anterior y el nuevo. Otorgar bloquea las
  filas de los dos vecinos (siempre en el mismo orden) antes de leer el saldo y los topes, así dos
  otorgamientos simultáneos no leen el mismo saldo.
- El 50 % por un retiro municipal se otorga **al pagarse la solicitud**
  (`CreditosService.otorgarPorPago`). Lo llama la confirmación de Webpay (HU-44), en la misma
  transacción que deja el pago en `pagado`. Confirmar dos veces no otorga dos veces.

La pantalla `/pago/:id` del frontend todavía es maqueta: no llama a estos endpoints. Sin el PR
de front enlazado a #136, HU-44 no se prueba de punta a punta. El listado de pagadas del panel
sigue filtrando por `fecha_solicitud`, aunque la fecha del cobro ya está en
`pagos_webpay.fecha_transaccion`.

`WEBPAY_ENV`: en desarrollo, vacío equivale a `integration` (credenciales públicas del SDK si
faltan código y llave). En producción es **obligatorio** (`integration` o `production`): sin él
la app no arranca. `production` exige `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY`.
`WEBPAY_RETURN_URL` es obligatoria en producción y debe ser `https`. Si el `commit` de Transbank
falla después de cobrar, se consulta `status` y se cierra el intento; una tarea concilia los
`iniciado` de más de 15 minutos.

### Endpoints de sesión

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/auth/clave-unica/login` | Redirige a ClaveÚnica (302) con el `state` en una cookie |
| `GET` | `/api/auth/clave-unica/callback` | Recibe la vuelta de ClaveÚnica, que llega a `/` (la Redirect URI registrada) y el `index.html` reenvía acá. Valida el `state`, obtiene la identidad, busca o crea al ciudadano por `clave_unica_id`, deja la cookie `arca_sesion`, audita `LOGIN` y redirige a `/`. Si el ingreso falla, cierra también la sesión de ClaveÚnica y vuelve a `/login?error=clave-unica` (cierre implícito) |
| `GET` | `/api/auth/clave-unica/logout` | Revoca la sesión, borra `arca_sesion` y redirige al logout de ClaveÚnica |
| `GET` | `/api/sesion` | `{ ciudadanoId, nombre, rol, devLogin }` de la sesión actual (401 sin sesión) |
| `POST` | `/api/auth/logout` | Revoca la sesión y borra la cookie (204) |
| `POST` | `/api/auth/dev/login` | Solo con `ALLOW_DEV_LOGIN=true` (si no, 404). Body `{ ciudadanoId, nombre? }`; crea la sesión y audita `LOGIN` con origen `dev`. `nombre` es opcional y queda en la sesión, como el que entrega ClaveÚnica |

### Endpoints del panel (`/api/admin/...`)

Antes vivían en `apps/backend-admin` (puerto 3001, backend aparte); desde `backend-unificado`
corren en este mismo proceso, puerto 3000, código en `src/admin/`.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/admin/solicitudes` | Listado global de solicitudes de retiro, filtro opcional por `estado` — **sin** filtro por dueño (a diferencia del equivalente del ciudadano). Con `estado=en_revision` ordena de la más antigua a la más nueva |
| `GET` | `/api/admin/solicitudes/:id` | Detalle, con `revisadoPor`, `tomadaPor` y `transicionesDisponibles` (estados a los que la sesión puede mover la solicitud con `PATCH`; no incluye las decisiones de revisión) |
| `PATCH` | `/api/admin/solicitudes/:id` | Cambiar estado. Body: solo `{ estado }`; lo valida `aplicarTransicion` de `src/core` (`403` si el rol no puede, `400` si la transición no existe o falta el pago). Cualquier otro campo responde `400`. Desde `en_revision`, aprobar, pedir modificación o rechazar responde `400`: van por `POST /revision` |
| `POST` / `DELETE` | `/api/admin/solicitudes/:id/toma` | Toma la solicitud por 15 minutos para revisarla (`409` si la tiene otro funcionario) o la libera |
| `POST` | `/api/admin/solicitudes/:id/revision` | Decisión de revisión: `{ decision, motivo?, comentario?, checklist? }`, validada con `validarRevision` y `aplicarTransicion`. Guarda la fila de historial en la misma transacción |
| `GET` | `/api/admin/solicitudes/:id/revisiones` | Historial de revisiones, de la más nueva a la más antigua |
| `PATCH` | `/api/admin/solicitudes/:id/categoria` | Corrige el residuo del catálogo (`{ residuoCatalogoId }`), solo en revisión |
| `GET` / `POST` | `/api/admin/solicitudes/:id/notas` | Notas internas del equipo municipal (`{ texto }`). La auditoría registra que existe la nota, nunca su texto |
| `GET` | `/api/admin/derivaciones/resumen` | `{ listas, bloqueadasPorPago }`: aprobadas que entran en el próximo lote y las que esperan pago |
| `GET` / `POST` | `/api/admin/derivaciones` | Historial de lotes / crea un lote: deriva en una transacción todas las aprobadas con el pago resuelto (`400` si no hay ninguna) |
| `GET` | `/api/admin/derivaciones/:id/excel` | Descarga el `.xlsx` del lote (sin fotos ni id del vecino), armado en memoria. Cada descarga se audita como `ACCESO` |
| `GET` | `/api/admin/metricas?dias=7\|30\|90` | Indicadores agregados (recibidas por día, cola, espera de revisión, decisiones y motivos, categorías, derivación, recaudación de la maqueta). Sin filas individuales |
| `GET` | `/api/admin/residuos` | Catálogo de residuos de solo lectura (`id`, `nombre`, `categoria`, `precio`) para corregir la categoría |
| `GET` | `/api/admin/mapa-calor` | Agregación de solicitudes por sector y métrica (`volumen` o `pendientes`), calculado en memoria con umbral de privacidad. Devuelve intensidad relativa y conteos |
| `GET` | `/api/admin/marketplace/pendientes` | Listado de artículos de marketplace pendientes de moderación municipal |
| `POST` | `/api/admin/marketplace/:id/aprobar` | Aprueba la publicación de un artículo en el marketplace (`disponible`) |
| `POST` | `/api/admin/marketplace/:id/rechazar` | Rechaza un artículo (`rechazado`) con `{ motivo? }` opcional |

> En `POST /api/admin/solicitudes/:id/revision`, la aprobación permite fijar un presupuesto final (`montoFinal`), que reemplaza el estimado del catálogo y se cobra al vecino.
> En `GET /api/admin/solicitudes/:id`, la respuesta incluye `coincidenciaMarketplace` con alerta si el mismo vecino tiene un artículo publicado o pendiente con título o categoría similar.

Protegidos con `RolesGuard` de `src/core`: `ADMIN` y `FUNCIONARIO`, salvo la auditoría, que es solo
`ADMIN`. Reabrir una solicitud `rechazada` o `retirada` también es solo de admin (lo decide el core).

> ✅ **Replanteo del 2026-09-17.** Ningún service asigna `estado` directamente: todo pasa por
> `aplicarTransicion` y `validarRevision` de `src/core`. La auditoría registra solo campos
> cambiados y códigos, nunca comentarios, notas ni el contenido del Excel.
> Detalle: [specs del panel](../../docs/specs/MAPA_PANEL_MUNICIPAL.md) ·
> [pendientes del equipo](../../docs/PENDIENTES_EQUIPO.md)

Estados de una solicitud (`EstadoSolicitudRetiro`):
`en_revision` · `requiere_modificacion` · `aprobada` · `rechazada` · `derivada` · `retirada` · `no_realizada` · `cancelada`

El retiro lo ejecuta una empresa **externa**: este backend no asigna operadores. El vecino crea la
solicitud en `en_revision` y puede cancelarla (vía `aplicarTransicion` del núcleo) mientras esté en
`en_revision`, `requiere_modificacion` o `aprobada` sin pago `pagado`. La revisión, derivación y
cambio de estado municipal viven en `src/admin/` (ver [Endpoints del panel](#endpoints-del-panel-apiadmin)).

Detalle: [pendientes del equipo](../../docs/PENDIENTES_EQUIPO.md) ·
[spec `ciclo-solicitud`](../../docs/specs/SPEC-ciclo-solicitud.md)

### Autenticación (HU-12, HU-13)

Las rutas protegidas exigen la cookie `arca_sesion` (`HttpOnly`, `SameSite=Lax`, `Path=/api`),
que emite el callback de ClaveÚnica. La base guarda solo el hash del secreto de la cookie. La
sesión dura 7 días para un vecino y 8 horas para funcionario o admin, que además la pierden tras
30 minutos sin actividad. Deja de valer también si el ciudadano se desactiva, y al volver a entrar
desde el mismo navegador se revoca la anterior. El header `Authorization` se ignora.
Detalle: [spec `sesion-unica`](../../docs/specs/SPEC-sesion-unica.md).

Cada inicio de sesión queda en auditoría como `LOGIN`, con el origen (`clave_unica` o `dev`), la IP
y el user-agent; nunca el RUN, el nombre ni la cookie.

En desarrollo, con `ALLOW_DEV_LOGIN=true` en `.env.local`, se entra sin ClaveÚnica con
`POST /api/auth/dev/login { ciudadanoId, nombre? }` usando los UUID de demo (migraciones): ciudadano
`…0001`, doble rol funcionario `…0002`, doble rol administrador `…0003`. Ese login también deja
la cookie `arca_sesion`: con curl, guardarla con `-c` y enviarla con `-b`.
La app **no arranca** si `ALLOW_DEV_LOGIN=true` y `NODE_ENV=production`.

Van los ids de **`usuarios_ciudadanos`**, no los de `usuarios_administradores`: la identidad es
siempre la ciudadana y el perfil municipal es una extensión sobre ella.

| UUID | Perfil | Alcance |
|---|---|---|
| `…0001` | Solo ciudadano | Sus propias solicitudes |
| `…0002` | Ciudadano + funcionario (Camila) | Lectura municipal de solicitudes (sin auditoría) |
| `…0003` | Ciudadano + admin (Carlos) | Lectura municipal **y** registro de auditoría |

| Ruta | Quién puede |
|---|---|
| `GET /health`, `GET /residuos/catalogo` | Público |
| `POST/GET solicitudes-retiro`, `PATCH …/reenviar`, `PATCH …/cancelar` | Ciudadano autenticado (solo propias) |
| `GET/POST marketplace/…` | Ciudadano autenticado. Retirar, liberar y entregar: solo quien publicó. Calificar: solo quien recibió |
| `marketplace/conversaciones`, `…/mensajes`, `push/…` | Ciudadano autenticado. Chat: solo los dos participantes de la conversación |
| `GET creditos` | Ciudadano autenticado (solo los propios) |

> **El cambio de estado municipal** (`admin`/`funcionario`) vive en `src/admin/`
> (`PATCH /api/admin/solicitudes/:id` y `POST …/revision`, mismo puerto 3000).
> `GET /api/operadores` se eliminó: ya no hay asignación de operadores en A.R.C.A.

---

## Estructura de `src/`

```
src/
├── main.ts                      # Bootstrap: CORS, cabeceras de seguridad, chequeo de Origin, prefijo /api, ValidationPipe global
├── app.module.ts                # Módulo raíz — importa AuthModule de src/core
├── core/                        # Núcleo compartido (ver sección de abajo)
├── database/
│   ├── data-source.ts           # DataSource de TypeORM (entities: ENTIDADES de src/core)
│   └── migrations/              # Migraciones versionadas, en orden de timestamp — único dueño del esquema
├── residuos/                    # Catálogo de residuos (entidad en src/core)
├── solicitudes-retiro/          # Solicitudes de retiro (controller, service, DTOs; entidad en src/core)
├── marketplace/                 # Artículos del marketplace (controller, service, DTOs)
│   ├── ubicacion/               # Grilla de 250 m, bandas de distancia y límite de orígenes
│   └── chat/                    # Chat (HU-06): controller REST, servicios y reglas
├── tiempo-real/                 # Gateway socket.io compartido (cookie + Origin, salas por vecino)
├── notificaciones/              # Campanita (HU-23): avisos, endpoints y conservación de 90 días
├── push/                        # Suscripciones Web Push y envío de avisos (web-push)
├── archivos/                    # Guardado y lectura de fotos subidas (UPLOADS_DIR)
├── creditos/                    # Circular Credits: reglas (valores de prueba), otorgamiento y GET /creditos
├── users/                       # UsersService/Controller/Module — entidades en src/core;
│                                   provee PERFIL_ACCESO_RESOLVER para AuthModule
└── admin/                       # Panel municipal (ex apps/backend-admin, movido en backend-unificado)
    ├── auditoria/
    ├── derivaciones/
    ├── mapa-calor/
    ├── metricas/
    ├── residuos/
    └── solicitudes/
```

## Núcleo (`src/core/`)

Hasta la reabsorción del paquete compartido (CORE-1), `auth/`, `health/`, `entities/` y
`solicitudes/` (reglas del ciclo de vida) vivían en el workspace aparte `packages/arca-core`,
consumido por `apps/backend` y por el extinto `apps/backend-admin`. Con un solo backend, ya no
había a quién compartírselo: el código se movió tal cual a `src/core/`, sin cambios de
comportamiento.

```
src/core/
├── entities/    ← usuarios, sesiones, catálogo, solicitudes-retiro, marketplace y
│                  movimientos de créditos (TypeORM)
│                  ENTIDADES (index.ts) es la lista explícita que usa
│                  src/database/data-source.ts para las migraciones.
├── auth/        ← AuthGuard, RolesGuard, ClaveÚnica, decorators (Public, Roles, CurrentUser),
│                  AuthService y su AuthModule.
├── health/      ← HealthModule (GET /api/health, chequea la conexión a MySQL).
└── solicitudes/ ← Reglas del ciclo de vida de una solicitud (validarTransicion,
                   transicionesDisponibles, aplicarTransicion) y de su revisión
                   (validarRevision, motivos y checklist). Funciones puras, con tests.
```

### Ciclo de vida de una solicitud

Los retiros los ejecuta una empresa externa: el municipio **revisa y deriva**, no asigna
operadores. Estados (`EstadoSolicitudRetiro`): `en_revision` · `requiere_modificacion` ·
`aprobada` · `rechazada` · `derivada` · `retirada` · `no_realizada` · `cancelada`. El pago
(maqueta) va aparte, en `EstadoPagoSolicitud`: `no_aplica` · `pendiente` · `pagado`. Roles
municipales (`RolAdministrador`): `admin` y `funcionario`.

**Ningún backend asigna `estado` directamente**: se llama a `aplicarTransicion`, que valida
quién puede hacer el cambio y aplica sus efectos (congelar el monto al aprobar, fecha de
revisión, fecha de cierre). Si la transición no es válida lanza `TransicionInvalidaError`, cuyo
`motivo` indica cómo responder: `actor` → `403`; `estado` o `pago` → `400`.

La tabla completa de transiciones está en `docs/specs/SPEC-ciclo-solicitud.md` §2.1. Lo que el
núcleo no puede saber —si el vecino es dueño de la solicitud, si viene un motivo— lo valida el
endpoint que llama.

Las **decisiones de revisión** (aprobar, pedir modificación, rechazar) además pasan por
`validarRevision` (`src/core/solicitudes/revision-solicitud.ts`): motivo de `MotivoRevision`
según la decisión, comentario obligatorio al pedir modificación o con motivo `otro`, y lista de
verificación completa (`ITEMS_CHECKLIST_APROBACION`) para aprobar. El historial queda en
`RevisionSolicitud` y las notas internas en `NotaSolicitud`. Ver
`docs/specs/SPEC-revision-solicitudes.md`.

Los lotes entregados a la empresa operadora quedan en `LoteDerivacion`, y cada solicitud guarda el
último lote en que salió (`loteDerivacionId`). Ver `docs/specs/SPEC-derivacion-excel.md`.

### Decisión de arquitectura: `PERFIL_ACCESO_RESOLVER`

`AuthService` necesita resolver el perfil de acceso de un ciudadano (¿es administrador?, ¿qué
rol tiene?), pero no puede importar `UsersService` directo: antes porque vivía en un paquete
compartido aparte, y ahora porque `src/core` se mantiene sin depender de módulos concretos de la
app (evita ciclos de importación y mantiene el núcleo reutilizable si el día de mañana vuelve a
compartirse).

Se resuelve con un token de inyección: `AuthService` pide `PERFIL_ACCESO_RESOLVER`
(`src/core/auth/interfaces/perfil-acceso-resolver.interface.ts`), y `AppModule` provee ese token
en un módulo `@Global()` propio: `src/users/users.module.ts` — `useExisting: UsersService`. Es
la única implementación desde `backend-unificado`: el panel (`src/admin/`) reutiliza este mismo
binding, ya no tiene el suyo propio.

Si `AuthModule` deja de arrancar con un error de dependencias no resueltas, es casi seguro que
falta este binding en la app que lo está importando.

## Migraciones

Se ejecutan en orden de timestamp. Ninguna se edita una vez aplicada: los cambios van
siempre en una migración nueva.

| Timestamp | Migración |
|---|---|
| `1782163200000` | `create-identity-tables` — ciudadanos, administradores y sesiones |
| `1782163300000` | `create-residuos-catalogo` — catálogo de residuos |
| `1782163400000` | `create-solicitudes-retiro` — solicitudes de retiro |
| `1782163500000` | `seed-operador-demo` — operador municipal de demo |
| `1782163600000` | `replace-catalogo-precios-reales` — catálogo con precios reales |
| `1782163700000` | `create-auditoria` — registro auditable de acciones (HU-14) |
| `1782163800000` | `seed-admin-demo` — funcionario con rol `admin` (Carlos Álvarez) |
| `1782164100000` | `ciclo-solicitud-revision` — estados nuevos, pago, rol `funcionario`, sin columnas de operador |
| `1782164200000` | `revision-solicitudes` — historial de revisiones, notas y toma |
| `1782164300000` | `lotes-derivacion` — lotes Excel hacia la empresa operadora |
| `1782164400000` | `marketplace-circular-credits` — artículos, calificaciones, mensajes y movimientos de créditos; `creditos` en el catálogo ([spec](../../docs/specs/SPEC-marketplace.md) §3) |
| `1782164500000` | `solicitud-direccion-fotos` — `direccion_retiro` en solicitudes + tabla `foto_retiro` (foto del vecino al solicitar) |
| `1782164600000` | `contacto-ciudadano` — teléfono y dirección de contacto del vecino en su propia tabla |
| `1782164700000` | `chat-marketplace` — `interesado_id` (NOT NULL, FK, dos índices) en `mensajes_marketplace` y tabla `suscripciones_push`. Completa las filas sembradas y borra las sin interlocutor |
| `1782164900000` | `notificaciones` — tabla de avisos de la campanita (HU-23) |
| `1782164800000` | `interes-reserva-marketplace` — tabla `interesados_marketplace` (su id es el `conversacionId`) y `codigo_entrega`, `intentos_codigo` y `fecha_reserva` en `articulos_marketplace` |

### Se escriben a mano — no usar `migration:generate`

El comando existe en TypeORM y **no hay que usarlo en este proyecto**. Genera el SQL comparando
las entidades contra la base, pero con *sus* convenciones: llaves foráneas con nombres
autogenerados (`FK_256b2c7703037151828570ad6f5` en vez de `fk_solicitudes_operador`), timestamps
con precisión de microsegundos, índices renombrados.

Como las migraciones de acá están escritas a mano con nombres legibles, TypeORM lee esas
diferencias de estilo como cambios pendientes y propone **reescribir el esquema completo**: no
solo la tabla nueva, sino las llaves foráneas y los timestamps de todas las tablas existentes.

No es que algo esté mal —la base funciona y las entidades mapean bien—, pero aplicar esa
migración sin leerla rompe el esquema. Si se necesita una tabla o columna nueva, se escribe la
migración a mano siguiendo el estilo de las anteriores.

> `migration:generate` sí sirve como **verificación**: si se genera y el archivo resultante no
> menciona la tabla en la que estás trabajando, esa entidad calza con la base. Hay que borrar el
> archivo generado después, nunca aplicarlo.

---

## Convenciones

- **Controladores delgados:** la lógica de negocio vive en los *services*.
- **DTOs con `class-validator`:** el `ValidationPipe` global corre con `whitelist: true` y
  `transform: true`, así que las propiedades no declaradas en el DTO se descartan.
- **Entidades TypeORM** con nombres de columna en `snake_case` vía `name:`, y propiedades
  TypeScript en `camelCase`.
- Tipos explícitos; `UPPER_SNAKE_CASE` para constantes, `camelCase` para variables y funciones.
