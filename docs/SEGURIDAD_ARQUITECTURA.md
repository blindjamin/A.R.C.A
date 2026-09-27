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
- Todo inicio de sesión se audita como `LOGIN` (origen, IP y user-agent; nunca el RUN, el nombre ni
  la cookie).

### 3.3 Modelo de amenazas resumido (después del cambio)

| Amenaza | Vector | Control | Estado |
|---|---|---|---|
| Suplantación de identidad | Adivinar o robar el identificador | C4 (secreto de 256 bits, hash en la base), C7, C8 | ✅ |
| Robo de sesión por XSS | Script inyectado lee la credencial | Cookie `HttpOnly` (C4) | ✅ |
| CSRF | Sitio externo provoca una acción con la cookie de la víctima | `SameSite=Lax` (C4); chequeo de `Origin` en métodos que modifican | ✅ parcial (Lax) · ⏳ `Origin` |
| Escalada de privilegios (vecino → panel) | Llamar directamente a `/api/admin/*` | `RolesGuard` en el backend; test que recorre todas las rutas `/admin` | ✅ guard · ⏳ test |
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

- Chequeo de `Origin` en POST/PATCH/DELETE (complementa `SameSite=Lax`).
- Test automático que recorra **todas** las rutas `/api/admin/*` y falle si alguna queda sin rol.
- Test de IDOR sobre las rutas del vecino.
- Respuestas con lista blanca de campos (serialización explícita).
- Cabeceras de seguridad (CSP, HSTS, `X-Content-Type-Options`), en el proxy inverso o en la app.
- Limpieza periódica de sesiones vencidas; eliminar `sesiones_administrador` (sin uso) y
  `GET /api/usuarios/:id/perfil-acceso` (reemplazado por `GET /api/sesion`).
- Renombrar `jwt_token_hash` → `token_hash` cuando haya una migración que lo justifique.

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
