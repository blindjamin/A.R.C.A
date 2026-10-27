# Arquitectura de seguridad de A.R.C.A. — de dos sitios con núcleo compartido a un sitio único

> **Estado:** EN CURSO — se actualiza con cada tarea de la reunificación ([`tasks/todo.md`](../tasks/todo.md))
> **Fecha de inicio:** 2026-09-26 · **Autor:** Benjamín Paicil (con asistencia de IA)
> **Para:** Miguel Segovia — insumo para la tesis de ciberseguridad
> **Relacionado:** [`specs/MAPA_UNIFICACION.md`](specs/MAPA_UNIFICACION.md) ·
> [`specs/SPEC-sesion-unica.md`](specs/SPEC-sesion-unica.md)

Este documento explica **cómo cambia el modelo de seguridad** de A.R.C.A. al pasar de dos
aplicaciones separadas (ciudadana y municipal) que compartían un paquete `@arca/core`, a **una sola
aplicación** con vistas distintas según el rol. Cada afirmación indica el archivo donde se puede
verificar.

Leyenda de estado: ✅ implementado · 🔄 en implementación · ⏳ planificado (`control-acceso`, revisión
de seguridad posterior)

---

## 1. Por qué cambió la arquitectura

ClaveÚnica (Secretaría de Gobierno Digital, vía CeroFilas) registra **un solo sitio por
integración**: un `redirect_uri` y un Logout URI. Con dos sitios, solo uno podía autenticar. El
cambio no se origina en seguridad, pero la afecta en todos sus niveles: identidad, sesión,
autorización, superficie de ataque y trazabilidad.

## 2. Arquitectura anterior (separación del 2026-09-01 al 2026-09-26)

```
            Navegador del vecino                  Navegador del funcionario
                    │                                        │
         apps/frontend (:5173)                   apps/admin-web (:5174)
          PWA ciudadana                           panel, SIN login ni guard
                    │ Bearer <uuid>                          │ Bearer <uuid fijo de desarrollo>
                    ▼                                        ▼
         apps/backend (:3000)                    apps/backend-admin (:3001)
          AuthModule ◄──── packages/arca-core ────► AuthModule
          UsersService          (entidades,            IdentityService
          (resolver de perfil)   AuthGuard global,     (COPIA del resolver)
                                 RolesGuard,
                                 ClaveÚnica,
                                 auditoría,
                                 rate limiting)
                    └───────────────┬───────────────────────┘
                                 MySQL (misma base)
```

### 2.1 Qué protegía y cómo

| Control | Implementación | Dónde |
|---|---|---|
| Autenticación global | `AuthGuard` como `APP_GUARD`: toda ruta exige identidad salvo `@Public()` | `packages/arca-core/src/auth/guards/auth.guard.ts` |
| Autorización por rol | `RolesGuard` + `@Roles(ADMIN, FUNCIONARIO)` en controladores del panel | mismo archivo; controladores de `apps/backend-admin` |
| Dueño de los datos | El servicio ciudadano filtra por `usuarioCiudadanoId` del usuario autenticado | `apps/backend/src/solicitudes-retiro/solicitudes-retiro.service.ts` |
| OIDC con ClaveÚnica | `state` de 32 bytes (CSPRNG), cookie `HttpOnly` acotada, comparación en tiempo constante, código por token en el servidor | `packages/arca-core/src/auth/clave-unica.*` |
| Seudonimización del RUN | HMAC-SHA256 con *pepper* en variable de entorno; el RUN en claro no se persiste | `clave-unica.service.ts#derivarIdentificador` |
| Auditoría | `AuditoriaService` registra acciones críticas sin volcar comentarios ni notas | `packages/arca-core/src/auditoria/` |
| Validación de entrada | `ValidationPipe` global con `whitelist` (el panel además `forbidNonWhitelisted`) | `apps/*/src/main.ts` |
| Rate limiting | `@nestjs/throttler` global, más estricto en el login (PR #52) | `packages/arca-core/src/seguridad/` |

### 2.2 Debilidades de ese modelo

| # | Debilidad | Consecuencia | Categoría |
|---|---|---|---|
| D1 | **La identidad era un UUID en claro** (`Authorization: Bearer <uuid-ciudadano>`), sin firma ni secreto | Quien conociera o adivinara un UUID se hacía pasar por esa persona, incluido un funcionario. En producción el backend rechazaba todo (`auth.service.ts`), así que no había forma segura de operar | OWASP Top 10 2021 **A07** (fallas de identificación y autenticación) |
| D2 | La identidad se guardaba en `localStorage` | Cualquier XSS podía leerla y enviarla a un tercero | A07 / exposición de credenciales |
| D3 | **El panel no tenía login ni guard** en el front, y usaba identidades de desarrollo fijas en el código | La interfaz era accesible con la URL; la protección dependía solo del backend | A01 (control de acceso roto) — mitigado por el backend |
| D4 | **Lógica de autorización duplicada** (`UsersService` y `IdentityService`) | Si un criterio cambiaba en un backend y no en el otro, los permisos divergían en silencio | Riesgo de diseño |
| D5 | **Dos superficies expuestas** (dos APIs, dos orígenes, dos configuraciones de CORS) con límites de tasa independientes por proceso | Más puntos que endurecer y auditar; un atacante tenía el doble de cuota de rate limiting | Superficie de ataque |
| D6 | El callback de ClaveÚnica no emitía sesión (`NotImplementedException`) | No existía el paso más sensible del flujo | Funcionalidad incompleta |
| D7 | Dos `redirect_uri` posibles contra una integración que admite uno | Incompatible con la certificación de ClaveÚnica | Cumplimiento |

**El núcleo compartido tenía una razón de ser:** evitar que las reglas de negocio y seguridad
divergieran entre dos backends. Al quedar uno solo, esa razón desaparece, y mantenerlo solo agrega
un paso de compilación y una frontera artificial (la inyección `PERFIL_ACCESO_RESOLVER` existía
únicamente para que un paquete no dependiera de una app).

## 3. Arquitectura nueva (sitio único)

```
                 Navegador (vecino, funcionario o admin)
                                  │  cookie arca_sesion (HttpOnly, SameSite=Lax, Secure)
                    apps/frontend (:5173 / dominio único)
                      /            → PWA
                      /admin/*     → panel (chunk lazy, solo con rol municipal)
                                  │  /api  (mismo origen: sin CORS)
                                  ▼
                    apps/backend (:3000) — ÚNICO proceso
                      src/core/     ← antes packages/arca-core
                        auth/       AuthGuard (cookie) · RolesGuard · ClaveÚnica · SesionService
                        auditoria/  · seguridad/ (rate limiting) · entities/
                      src/admin/    ← antes apps/backend-admin (@Roles municipal)
                      src/…         rutas del vecino (chequeo de dueño)
                                  │
                                MySQL
```

### 3.1 Cambios de seguridad, uno por uno

| # | Cambio | Resuelve | Estado | Tarea |
|---|---|---|---|---|
| C1 | **Un solo backend y un solo punto de entrada**: una API, un proceso, un origen | D5, D7 | ✅ backend (4533e73) y front (FU-1, FU-3): un sitio, `apps/admin-web` eliminado, CORS solo con el origen del sitio | BU-1..3 |
| C2 | **Una sola implementación del perfil de acceso** (`UsersService`); se elimina `IdentityService` | D4 | ✅ | BU-2 |
| C3 | **Núcleo reabsorbido** en `apps/backend/src/core/`: los controles de seguridad viven en el mismo árbol que los usa, sin paquete intermedio ni compilación previa | Simplifica la auditoría del código | ✅ (4fd2d57): 58 archivos movidos sin cambios de contenido, 230 tests iguales antes y después | CORE-1 |
| C4 | **Sesión de servidor con cookie** (§3.2) en lugar del UUID en claro | D1, D2, D6 | ✅ servicio (SU-1), guard + endpoints (SU-2), callback y logout de ClaveÚnica (SU-3, PR #66); la validación revisa además la baja del ciudadano y `fecha_expiracion` (sesión 2b) | SU-1..3 |
| C5 | **Login de desarrollo aislado**: solo con `ALLOW_DEV_LOGIN=true` (texto exacto); la app **no arranca** si además `NODE_ENV=production` | Evita dejar una puerta trasera en producción | ✅ `verificarLoginDev` en `main.ts` (SU-2): con `NODE_ENV=production` + `ALLOW_DEV_LOGIN=true` el proceso termina con código 1; sin el flag, `/api/auth/dev/login` responde 404. El Bearer da 401 siempre, con o sin el flag (SU-4) | SU-1, SU-2 |
| C6 | **Panel detrás del rol en el front** (`RequireRol`) y **código del panel en un chunk aparte**: un vecino no descarga ni ve las pantallas municipales | D3 (defensa en profundidad; la barrera real sigue en el backend) | ✅ chunk aparte (FU-1) y `RequireRol` con el rol que devuelve `GET /api/sesion` (FU-2) | FU-1, FU-2 |
| C7 | **Sin identidad en `localStorage`** | D2 | ✅ FU-2: la identidad solo vive en la cookie HttpOnly; `localStorage` solo guarda qué solicitudes ocultó el vecino | FU-2 |
| C8 | **Eliminación del Bearer de desarrollo** | D1 (cierre definitivo) | ✅ el `AuthGuard` solo acepta la cookie; `resolveFromAuthorizationHeader` ya no existe. Verificado: `Authorization: Bearer <uuid del funcionario>` contra `/api/admin/metricas` da 401 con `ALLOW_DEV_LOGIN=true` | SU-4 |
| C9 | **Validación estricta de entrada unificada** (`forbidNonWhitelisted` en toda la API) | Campos inesperados se rechazan (400) en vez de ignorarse | ✅ | BU-2 |
| C10 | **Rate limiting de un solo proceso**: una cuota por cliente para toda la API | D5 | ✅ (`SeguridadModule` una vez, antes de `AuthModule`) | BU-2 |

### 3.2 Diseño de la sesión (C4)

**Decisión:** sesión en servidor con cookie, no JWT (MAPA_UNIFICACION, decisión 1).

| Criterio | Sesión en servidor (elegida) | JWT |
|---|---|---|
| Revocación | Inmediata: `activa = false` en la base | Requiere lista de revocación (que ya es estado en servidor) o esperar la expiración |
| Robo por XSS | La cookie es `HttpOnly`: no es legible desde JS | Si se guarda en `localStorage`, es legible |
| Cierre por inactividad | Directo (`updated_at`) | Requiere tokens cortos + refresh tokens |
| Escalabilidad | El estado vive en MySQL: funciona con uno o varios procesos | Sin estado, pero pierde la revocación |
| Dependencias | Ninguna nueva (`node:crypto`) | `@nestjs/jwt` |

**Formato y almacenamiento:**

```
cookie arca_sesion = <session_id>.<secreto>      secreto = 32 bytes aleatorios (hex)
base de datos      = sesiones_ciudadano.jwt_token_hash = SHA-256(secreto)
```

- **Un volcado de la base no permite suplantar a nadie:** contiene el hash del secreto, no el
  secreto (mismo principio que el almacenamiento de contraseñas, aunque aquí basta SHA-256 porque el
  secreto tiene 256 bits de entropía y no es adivinable, a diferencia de una contraseña).
- La búsqueda es por clave primaria (`session_id`) y la comparación del hash, en **tiempo constante**
  (`timingSafeEqual`), para no filtrar información por tiempos de respuesta.
- Atributos de la cookie: `HttpOnly` (no la lee JS), `SameSite=Lax` (no viaja en peticiones POST
  iniciadas desde otro sitio: primera barrera contra CSRF), `Secure` en producción (solo HTTPS),
  `Path=/api` (no viaja con los archivos estáticos).
- **Duración según el riesgo del rol** (decisión 2): vecino, 7 días desde el inicio; funcionario y
  admin, 8 horas desde el inicio y **cierre a los 30 minutos sin actividad**. El límite se calcula con
  el rol *actual*: si alguien pasa a ser funcionario, su sesión se acorta de inmediato. Ningún
  cambio de rol la alarga más allá de la `fecha_expiracion` fijada al emitirla.
- **La baja manda sobre la sesión:** si se desactiva a un ciudadano, sus sesiones abiertas dejan de
  valer en la siguiente petición y quedan revocadas (no reviven si lo reactivan).
- **Una sesión por inicio de sesión:** al volver a entrar desde el mismo navegador, la sesión anterior
  se revoca antes de emitir la nueva, en vez de quedar activa hasta expirar.
- **Cierre de sesión en dos niveles:** se revoca la sesión de ARCA **y** se redirige al logout de
  ClaveÚnica (si no, ClaveÚnica mantiene la suya y la persona vuelve a entrar sin escribir su clave).
- **Cierre implícito:** si el ingreso no se completa (ciudadano desactivado, `state` inválido, error o
  caída de ClaveÚnica), el callback no responde un 401: revoca la sesión de ARCA que trajera el
  navegador, pasa por el logout de ClaveÚnica y devuelve a `/login?error=clave-unica`. Es requisito de
  la certificación ("cuando un RUN autenticado no se encuentra en la base del sitio integrador").
- Todo inicio de sesión se audita como `LOGIN` (origen, IP y user-agent; nunca el RUN, el nombre ni
  la cookie).

### 3.3 Modelo de amenazas resumido (después del cambio)

| Amenaza | Vector | Control | Estado |
|---|---|---|---|
| Suplantación de identidad | Adivinar o robar el identificador | C4 (secreto de 256 bits, hash en la base), C7, C8 | ✅ |
| Robo de sesión por XSS | Script inyectado lee la credencial | Cookie `HttpOnly` (C4) | ✅ |
| CSRF | Sitio externo provoca una acción con la cookie de la víctima | `SameSite=Lax` (C4); chequeo de `Origin` en métodos que modifican (`core/seguridad/origen.ts`) | ✅ |
| Escalada de privilegios (vecino → panel) | Llamar directamente a `/api/admin/*` | `RolesGuard` en el backend; test que recorre todas las rutas `/admin` (`seguridad-rutas-admin.spec.ts`) | ✅ |
| Acceso a datos de otro vecino (IDOR) | Cambiar el id en la URL | Chequeo de dueño en el servicio | ✅ · ⏳ test |
| Sesión abandonada en un equipo municipal | Terminal compartido | Cierre por inactividad de 30 minutos (C4) | ✅ |
| Cuenta dada de baja que sigue operando | Sesión abierta antes de la baja | La validación exige `usuarios_ciudadanos.activo` y revoca la sesión (C4) | ✅ |
| Fuerza bruta o abuso | Muchas peticiones | Rate limiting (C10), más estricto en login | ✅ |
| Puerta trasera de desarrollo en producción | `ALLOW_DEV_LOGIN` olvidado | La app no arranca (C5) | ✅ |
| Filtración por volcado de la base | Robo del respaldo | Hash de secretos (C4); RUN seudonimizado con pepper fuera de la base | ✅ |
| Exposición de datos internos | Respuestas con campos de más | Notas internas nunca en la API ciudadana; lista blanca de campos | ✅ notas · ⏳ lista blanca |

### 3.5 Implementación de la sesión (evidencia)

`apps/backend/src/core/auth/sesion.service.ts` (SU-1 en `packages/arca-core`; movido con CORE-1):

- **Validación del formato antes de tocar la base:** una sola expresión regular exige UUID v4 en
  minúscula, un punto y 64 caracteres hex. Cualquier otra cosa se descarta sin consultar MySQL, lo
  que reduce la superficie para inyecciones y el costo de peticiones basura.
- **Comparación en tiempo constante** del hash (`timingSafeEqual`), con chequeo de largo previo.
- **Revocar exige el secreto,** no solo el id: conocer un `session_id` (que podría aparecer en un
  log o en un volcado) no basta para cerrarle la sesión a otra persona.
- **La inactividad del funcionario revoca la sesión** (`activa = false`), para que no "reviva" si
  cambia el rol. La expiración por duración solo rechaza.
- **Reloj único de la aplicación:** `fecha_inicio` y `updated_at` se escriben con el mismo reloj que
  después los compara, para que no haya desfases entre la base y la aplicación.
- **Primer ingreso simultáneo:** si dos callbacks del mismo vecino nuevo llegan a la vez, el índice
  único de `clave_unica_id` frena el segundo insert y el servicio reusa la fila del primero, en vez
  de responder 500.
- **Pruebas:** `sesion.service.spec.ts` cubre secreto incorrecto, formato inválido, sesión revocada,
  vencimiento de 7 días y de 8 horas, `fecha_expiracion` vencida, ciudadano dado de baja,
  inactividad municipal frente a la del vecino, ascenso de rol durante la sesión, revocación,
  auditoría del `LOGIN` y primer ingreso simultáneo; `login-dev.spec.ts` tiene 5 casos.

**Hallazgos de la revisión que pasan a la siguiente tarea (SU-2):**
- Una cookie con `%` malformado haría lanzar `decodeURIComponent` → error 500. El guard debe
  convertirlo en 401: un error distinto según el contenido de la cookie es una fuga de información y
  una forma barata de ensuciar los logs.
- La cookie debe llevar `maxAge` igual a la duración de la sesión del rol.

### 3.4 Riesgos residuales y trabajo pendiente (`control-acceso`)

Quedan para la revisión de seguridad acordada después de reunificar:

- Test de IDOR sobre las rutas del vecino.
- Respuestas con lista blanca de campos (serialización explícita).
- Cabeceras de seguridad del **frontend** (CSP de la página, en el `.htaccess`). Las de la API ya están.
- Limpieza periódica de sesiones vencidas; eliminar `sesiones_administrador` (sin uso).
- Renombrar `jwt_token_hash` → `token_hash` cuando haya una migración que lo justifique.
- Versión del pepper junto al identificador, para poder rotarlo (§3.6, D-PEP-4).

### 3.6 Decisión: gestión del pepper del RUN por municipalidad

> **Decidido:** 2026-10-13 · **Responsable:** Miguel Segovia (encargado de seguridad)
> **Contexto:** A.R.C.A. hoy opera solo en Santo Domingo, pero se ofrecerá a otras municipalidades.

El RUN se guarda como `HMAC-SHA256(pepper, "numero-DV")` en `usuarios_ciudadanos.clave_unica_id`
(`clave-unica.service.ts#derivarIdentificador`). El código es público y el mismo en todas las
instalaciones; **la protección depende solo de que el pepper sea secreto.** Sin él, quien obtenga un
volcado de la base no puede recorrer los ~30 millones de RUN válidos para revertir los
identificadores.

| # | Decisión | Por qué |
|---|---|---|
| D-PEP-1 | **Un pepper distinto por municipalidad**, generado al instalarla. Nunca se copia el de otra instalación | Si se compromete una instalación, las demás no quedan expuestas. Además, la misma persona tiene identificadores distintos en cada comuna, así que no se pueden cruzar bases para seguirla entre municipios (minimización, Ley 21.719) |
| D-PEP-2 | **Se genera en el propio servidor** (`randomBytes(32)`, ver [`DEPLOY_CPANEL.md`](DEPLOY_CPANEL.md)) y se pega directo en la configuración. No viaja por chat, correo ni drive compartido | Cada copia en tránsito es una filtración posible |
| D-PEP-3 | **Custodia acotada:** lo conocen solo quien administra el servidor de esa municipalidad y un respaldo sellado (gestor de contraseñas o sobre en la municipalidad) a cargo de una o dos personas designadas. El equipo de desarrollo no lo necesita: en local cada uno usa un pepper de prueba propio | Si se pierde, nadie vuelve a ser reconocido y todos pierden su historial; si se filtra, el identificador deja de proteger el RUN |
| D-PEP-4 | **Pendiente, antes de sumar la segunda municipalidad:** guardar junto al identificador qué versión de pepper se usó | Hoy el pepper no se puede rotar sin desconocer a todos. Con la versión guardada, se rota recalculando el identificador de cada persona en su siguiente ingreso. Es un cambio barato ahora y caro con muchos usuarios registrados |

**Lo que el pepper no cubre:** quien tenga acceso completo al servidor puede leer el pepper y la base
a la vez. El pepper protege frente a volcados, respaldos filtrados e inyección SQL, no frente a un
administrador del servidor comprometido. Por eso el acceso al cPanel de cada municipalidad también es
parte de este control.

**Costo aceptado:** con peppers separados, el historial de una persona no se puede reconocer entre
comunas. Si algún día se quiere eso, hay que decidirlo de forma explícita, porque implica un
identificador común entre municipalidades.

**Checklist al instalar en una municipalidad nueva:**

- [ ] Generar un pepper nuevo en su servidor (nunca reutilizar el de Santo Domingo ni el de pruebas).
- [ ] Respaldarlo con su custodia designada antes de abrir el registro de vecinos.
- [ ] Revisar quién tiene acceso al cPanel de esa instalación.
- [ ] Confirmar que D-PEP-4 ya está implementada.

### 3.7 Qué registra la auditoría y qué no (minimización)

> **Por qué está acá:** el criterio vivía en comentarios del código y se perdió al reordenar
> `solicitudes-retiro.service.ts` (#101). Se documenta aparte para que no dependa de cómo esté
> escrito el código. Decisión 016 del PO.

La tabla `auditoria` **no se borra**: es la constancia de quién hizo qué, y por eso nunca puede ser
el lugar donde queden datos personales del vecino. La regla general es **registrar que algo cambió,
no qué dice**: códigos, estados, ids y cantidades sí; texto libre y datos de contacto, no. Así los
datos personales quedan solo en su tabla, donde el borrado (baja, plazos de conservación) los
alcanza.

| Acción | Se registra | No se registra, y por qué |
|---|---|---|
| Vecino crea una solicitud | `CREATE` con el `estado` inicial | Descripción, coordenadas, dirección de retiro, foto: datos personales que quedan en `solicitudes_retiro` / `foto_retiro`, donde el plazo los alcanza |
| Vecino reenvía una solicitud corregida | `estado` y `residuoCatalogoId` si cambió (igual que cuando lo corrige el panel) | Descripción y dirección nueva: texto libre que puede llevar datos personales |
| Vecino cancela | `estado` antes y después | El motivo que escribe (`razonRechazo`): texto libre; queda en la solicitud, que se puede borrar |
| Vecino edita su perfil | `UPDATE` sobre `contacto_ciudadano` con `camposCambiados` (`telefono`, `direccion`) | Los valores: son el dato personal mismo |
| Funcionario decide una revisión | Campos cambiados, `decision` y `motivo` (es un código) | El comentario al vecino: texto libre |
| Funcionario corrige la categoría | `residuoCatalogoId` antes y después | — |
| Funcionario agrega una nota interna | `CREATE` sobre `notas_solicitud` con el id de la solicitud | El contenido de la nota |
| Cambios del panel sobre una solicitud | Solo los campos de la lista explícita `CAMPOS_AUDITADOS` (`admin/solicitudes/auditoria-solicitud.ts`): estado, pago, monto, revisor, cierre, categoría | Cualquier columna nueva: no entra sola; se suma a la lista de forma deliberada |
| Lote de derivación | `CREATE` con la cantidad; cada solicitud derivada con sus campos cambiados | El contenido del Excel |
| Descargas (Excel de derivación, pagadas, exportar auditoría, consultar auditoría) | `ACCESO` con formato, filtros y cantidad de filas | Las filas descargadas |
| Inicio de sesión | `LOGIN` con el origen (`clave_unica` o `dev`) | RUN, nombre, cookie |
| Plazo de la dirección de retiro (tarea diaria) | `UPDATE` como `sistema` con la cantidad borrada y el plazo | Ids y direcciones |

**Cómo se aplica en el código:**
- Los campos de la solicitud que se auditan son una **lista explícita**, no la fila completa.
- `AuditoriaService.registrar` **no lanza**: si la escritura falla, la operación sigue y el fallo queda
  en el log, **sin** volcar `datosAnteriores` ni `datosNuevos` (los logs no tienen el mismo control de
  acceso que la tabla). Es *fail-open*, una decisión discutible: si el municipio exige que ninguna
  acción crítica quede sin registro, ese es el punto donde se invierte (pregunta abierta n.º 3 de la
  tesina).
- Los vecinos aparecen en la auditoría por su id opaco, no por nombre ni RUN.

**Al agregar una acción auditada nueva:** registrar estados, códigos, ids o cantidades; si hay texto
libre o un dato de contacto, registrar solo que cambió. Sumar la fila a esta tabla.

### 3.8 Superficie del chat del Marketplace (HU-06)

El chat suma tres superficies. Las tres reutilizan los controles existentes en vez de crear otros.

| Superficie | Cómo se protege | Qué no cubre |
|---|---|---|
| **REST** (`/api/marketplace/.../mensajes`, `/conversaciones`) | Sesión por cookie, `Origin` en las escrituras y validación global, como el resto de la API. El envío lleva `@LimiteChat()` (30 por minuto por IP; se cuenta por IP y varios vecinos pueden compartirla) | El límite es por IP, no por vecino |
| **Socket** (`/api/socket.io`) | El handshake valida la **cookie de sesión** (`SesionService.validar`) y el **`Origin`** (se acepta ausente, como en `verificarOrigen`, o igual a `FRONTEND_URL`). El gateway no tiene `@SubscribeMessage`: solo empuja del servidor al cliente. Todo lo que se escribe pasa por REST, con sus guards. Cada vecino entra solo a su sala `usuario:<id>` | **Sin rate limit propio**: los guards globales (`AuthGuard`, `ThrottlerGuard`) son HTTP y fallarían con un contexto ws. Un socket abierto **no se revalida**: sigue en su sala aunque la sesión venza o se cierre en otra pestaña, y solo recibiría avisos del mismo vecino |
| **Push** (`/api/push/...`) | `web-push` hace un POST al `endpoint` que manda el cliente, así que se exige `https:`, sin puerto ni credenciales en la URL, y un host de una **lista blanca** de servicios push (FCM, Mozilla, Apple, Windows): evita el SSRF. Tope de 5 suscripciones por vecino. El endpoint no se escribe en los logs (es una URL-capacidad) | La lista blanca hay que actualizarla si aparece otro servicio push |

Otras decisiones de este módulo:

- **Ids opacos.** El interesado de una conversación nunca sale del servidor: la conversación se identifica con `conversacionId` (el menor `id` de sus mensajes) y los mensajes llevan `esMio` en vez del remitente. El test de la lista blanca de la respuesta verifica que no aparece ningún UUID. Es la misma regla que ya cumple el artículo público (`marketplace/articulo-publico.ts`).
- **Visibilidad.** Quien ya conversó puede leer su historial en solo lectura aunque otro vecino reserve el artículo (decisión 9 extendida, [spec](specs/SPEC-marketplace.md) §2). Solo recibe título, estado y si puede escribir, y la foto solo si el artículo le sigue siendo visible.
- **Dispositivo compartido.** El alta de una suscripción reasigna el dispositivo al vecino que entra después (el `endpoint` es único), y al cerrar sesión el frontend la borra, para que el vecino siguiente no reciba avisos ajenos.
- **Contenido en el aviso.** El aviso push incluye el título del artículo y los primeros 80 caracteres del mensaje, y pasa por el servicio push del navegador (Google, Mozilla, Apple o Microsoft), cifrado de extremo a extremo con las claves de la suscripción.
- **Cookie y ruta.** La cookie de sesión tiene `Path=/api`; por eso el socket vive en `/api/socket.io` y no en `/socket.io`. Eso obliga a pedir al municipio la excepción de WAF para esa ruta ([`DEPLOY_CPANEL.md`](DEPLOY_CPANEL.md) §4.1).
- **Un solo proceso.** Las salas viven en la memoria del proceso, igual que el límite de consultas.

## 4. Registro de cambios de este documento

| Fecha | Cambio |
|---|---|
| 2026-09-26 | Versión inicial: arquitectura anterior, debilidades, diseño objetivo |
| 2026-09-26 | SU-1: `SesionService` implementado (§3.5) |
| 2026-09-26 | BU-1..3: un solo backend; verificado que un vecino recibe 403 y un funcionario 200 en `/api/admin/*` |
| 2026-09-26 | FU-1: panel en `apps/frontend/src/admin` bajo `/admin/*`, cargado en un chunk aparte. El bundle inicial del vecino no incluye las pantallas municipales ni `api/admin.ts` (verificado en el build: `index-*.css` sin `leaflet-container`, `AdminApp-*.js` separado). Es reducción de superficie, no control de acceso: la barrera sigue siendo el `RolesGuard` |
| 2026-09-26 | CORE-1: el núcleo (`@arca/core`) se reabsorbe en `apps/backend/src/core/`. Para la auditoría: los guards, `SesionService`, el rate limiting y la pseudonimización del RUN ahora están en el mismo árbol y el mismo lint que el código que protegen; ya no hay una compilación previa (`build:core`) que pudiera dejar corriendo una versión vieja de los controles. Efecto colateral detectado: el código del núcleo nunca había pasado por eslint (12 hallazgos menores, ninguno de seguridad) |
| 2026-09-26 | SU-2: el `AuthGuard` autentica con la cookie; el Bearer queda solo en modo desarrollo. Tres hallazgos de la revisión corregidos: (1) una cookie con `%` malformado provocaba una excepción no controlada (posible 500 con traza), ahora es 401; (2) la cookie no tenía `Max-Age` y moría al cerrar el navegador; (3) **desfase de zona horaria**: el driver guardaba la hora local (UTC-3) como si fuera UTC, Node leía y escribía con el mismo criterio, así que la sesión funcionaba, pero las fechas quedaban 3 h corridas respecto del reloj de MySQL: cualquier consulta SQL con `NOW()` (limpieza de sesiones, métricas, auditoría) y cualquier cambio de zona horaria del servidor (el municipal podría estar en UTC) habrían alargado o acortado todas las sesiones vigentes en 3 h. Se corrigió con `timezone: 'Z'`. Es un buen ejemplo para la tesis de cómo un control correcto en el código puede fallar por la configuración del entorno |
| 2026-09-26 | FU-2/FU-3: el front ya no guarda ni envía identidad (sin `localStorage`, sin `Authorization`); ante cualquier 401 descarta la sesión y vuelve a `/login`. `apps/admin-web` eliminado. **Estado al abrir el PR:** C1, C2, C3, C5, C6, C7, C9 y C10 ✅; C4 🔄 (falta el callback de ClaveÚnica, SU-3); C8 ⏳ (SU-4). Mientras SU-3 no esté, el único acceso es el login de desarrollo, que no arranca en producción |
| 2026-09-26 | SU-3 (PR #66): el callback de ClaveÚnica crea o reusa al ciudadano (un desactivado recibe 401), emite la sesión y audita el `LOGIN`; el logout de ClaveÚnica revoca la sesión. C4 ✅ |
| 2026-09-27 | Sesión 2b + SU-4: la validación exige ciudadano activo (y revoca si no lo está) y respeta `fecha_expiracion`; volver a entrar revoca la sesión anterior del navegador; el primer ingreso simultáneo ya no da 500; se elimina el Bearer de desarrollo. **C8 ✅: D1 queda cerrada.** Verificado en ejecución: Bearer → 401 con `ALLOW_DEV_LOGIN=true`, cookie anterior → 401 tras un nuevo login, `fecha_expiracion` vencida → 401, ciudadano desactivado → 401 y sesión revocada |
| 2026-10-06 | Revisión previa a la certificación de ClaveÚnica (credenciales recibidas): se agrega el **cierre implícito** en el callback. Antes, un ingreso rechazado (p. ej. ciudadano desactivado) respondía 401 en JSON y dejaba abierta la sesión de ClaveÚnica, que el manual exige cerrar |
| 2026-10-13 | §3.6: decisión de gestión del pepper del RUN de cara a otras municipalidades (un pepper por instalación, generado en el servidor, custodia acotada, versión del pepper pendiente antes de la segunda municipalidad) |
| 2026-10-13 | Revisión de seguridad: **chequeo de `Origin`** en POST/PUT/PATCH/DELETE (un subdominio de `santodomingo.cl` es "el mismo sitio" para `SameSite=Lax`; ahora solo pasa `FRONTEND_URL`, la vuelta de Webpay deberá quedar exenta); **cabeceras de seguridad** en la API (nosniff, `X-Frame-Options`, `Referrer-Policy`, CSP `default-src 'none'`, CORP y HSTS en producción); **test de escalada** que recorre todos los controladores y falla si una ruta `/admin` no exige rol municipal (verificado quitando `@Roles` a un controlador: el test falla); se elimina `GET /api/usuarios/:id/perfil-acceso`, sin uso desde `GET /api/sesion` |
| 2026-10-16 | Auditoría (Sprint 4): filtros por fecha y por funcionario, y **exportación a CSV y XLSX** (`GET /api/admin/auditoria/exportar`, solo rol `admin`). Cada exportación queda registrada como `ACCESO` con el formato, los filtros y la cantidad de filas, igual que la descarga del Excel de derivación: es una salida masiva de datos. El CSV neutraliza la **inyección de fórmulas** (celdas que empiezan con `=`, `+`, `-`, `@`, tabulación o retorno de carro llevan un apóstrofo delante, OWASP *CSV Injection*); el XLSX no la necesita porque los valores se escriben como texto. Los filtros se validan con DTO (fechas ISO, rango de 1 año como máximo, `actor` restringido a un id, `vecinos` o `sistema`, sin parámetros desconocidos) y la exportación tiene un tope de 50 000 filas. Los vecinos siguen sin nombre en el registro: se filtran como grupo, no uno por uno |
| 2026-10-16 | Listado de solicitudes pagadas (Sprint 4): `GET /api/admin/pagadas`, `/sectores` y `/exportar` (admin y funcionario). Cada descarga queda registrada como `ACCESO` sobre `solicitudes_retiro` con el formato, los filtros y la cantidad de filas, sin copiar el contenido. Usa la misma protección contra **inyección de fórmulas** que la auditoría (`admin/comun/exportar-tabla.ts`). El listado no incluye nombre, RUN ni contacto del vecino. Los filtros se validan con DTO (rango de 1 año como máximo, sin parámetros desconocidos) y la exportación tiene un tope de 50 000 filas |
| 2026-10-16 | §3.7: qué registra la auditoría y qué no, acción por acción (regla de minimización). Recupera el criterio que estaba en comentarios del código y se perdió al reordenar el service de solicitudes (#101). Incluye la auditoría del perfil y del plazo de la dirección de retiro (decisión 016) |
| 2026-10-24 | §3.8: superficie del chat (HU-06). Handshake del socket con cookie y `Origin`, sin `@SubscribeMessage` ni rate limit propio (los guards globales son HTTP); push con lista blanca de hosts contra SSRF y tope de 5 suscripciones por vecino; `conversacionId` opaco para no exponer al interesado; suscripción push borrada al cerrar sesión. Residual: el socket abierto no se revalida |
