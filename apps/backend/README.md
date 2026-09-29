# A.R.C.A. — Backend (API REST)

API del proyecto A.R.C.A. Construida con **NestJS + TypeScript + TypeORM + MySQL**.

> Documentación detallada de la fase actual: [`docs/BACKEND_FASE1.md`](../../docs/BACKEND_FASE1.md)
> Setup local completo (Docker, migraciones, troubleshooting): [`docs/SETUP_LOCAL.md`](../../docs/SETUP_LOCAL.md)

---

## Arrancar en local

Si es la primera vez en este PC, corré el script de la raíz que deja todo listo
(MySQL en Docker, dependencias, `.env.local`, migraciones y ambos servidores):

```powershell
.\setup.ps1
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
| `FRONTEND_URL` | `http://localhost:5173` | Orígenes CORS permitidos (separados por coma) |

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
| `POST` | `/api/solicitudes-retiro` | Crear solicitud de retiro |
| `GET` | `/api/solicitudes-retiro` | Listar solicitudes (filtrable por estado) |
| `GET` | `/api/solicitudes-retiro/:id` | Detalle de una solicitud, con `ultimaRevision` (`{ decision, motivo, comentario, fecha }` o `null`): nunca el revisor, el checklist ni las notas internas |
| `PATCH` | `/api/solicitudes-retiro/:id/reenviar` | El dueño reenvía una solicitud en `requiere_modificacion` (vuelve a `en_revision` vía `aplicarTransicion`). Body opcional `{ descripcion?, residuoCatalogoId? }` con las correcciones. `400` desde otro estado, `403` si no es suya (o si está `rechazada`: solo un admin la reabre), `404` si la categoría no existe. La auditoría registra estado y categoría, nunca la descripción |
| `PATCH` | `/api/solicitudes-retiro/:id/cancelar` | Cancelar solicitud (ciudadano) |
| `GET` | `/api/usuarios/:ciudadanoId/perfil-acceso` | Perfil de acceso — habilita el login diferido (**requiere auth**, solo el propio id) |

### Endpoints de sesión

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/auth/clave-unica/login` | Redirige a ClaveÚnica (302) con el `state` en una cookie |
| `GET` | `/api/auth/clave-unica/callback` | Valida el `state`, obtiene la identidad, busca o crea al ciudadano por `clave_unica_id`, deja la cookie `arca_sesion`, audita `LOGIN` y redirige a `/` |
| `GET` | `/api/auth/clave-unica/logout` | Revoca la sesión, borra `arca_sesion` y redirige al logout de ClaveÚnica |
| `GET` | `/api/sesion` | `{ ciudadanoId, nombre, rol, devLogin }` de la sesión actual (401 sin sesión) |
| `POST` | `/api/auth/logout` | Revoca la sesión y borra la cookie (204) |
| `POST` | `/api/auth/dev/login` | Solo con `ALLOW_DEV_LOGIN=true` (si no, 404). Body `{ ciudadanoId }`; crea la sesión y audita `LOGIN` con origen `dev` |

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
`POST /api/auth/dev/login { ciudadanoId }` usando los UUID de demo (migraciones): ciudadano
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
| `GET perfil-acceso` | Solo el propio `ciudadanoId` |

> **El cambio de estado municipal** (`admin`/`funcionario`) vive en `src/admin/`
> (`PATCH /api/admin/solicitudes/:id` y `POST …/revision`, mismo puerto 3000).
> `GET /api/operadores` se eliminó: ya no hay asignación de operadores en A.R.C.A.

---

## Estructura de `src/`

```
src/
├── main.ts                      # Bootstrap: CORS, prefijo /api, ValidationPipe global
├── app.module.ts                # Módulo raíz — importa AuthModule de src/core
├── core/                        # Núcleo compartido (ver sección de abajo)
├── database/
│   ├── data-source.ts           # DataSource de TypeORM (entities: ENTIDADES de src/core)
│   └── migrations/              # Migraciones versionadas, en orden de timestamp — único dueño del esquema
├── residuos/                    # Catálogo de residuos (entidad en src/core)
├── solicitudes-retiro/          # Solicitudes de retiro (controller, service, DTOs; entidad en src/core)
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
