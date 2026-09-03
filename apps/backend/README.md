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
| `npm run lint` | ESLint con `--fix` |
| `npm run test` / `test:e2e` / `test:cov` | Jest (unit / e2e / coverage) |

---

## Endpoints implementados

Todos cuelgan del prefijo `/api`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/residuos/catalogo` | Catálogo de residuos (incluye `precio` real) |
| `POST` | `/api/solicitudes-retiro` | Crear solicitud de retiro |
| `GET` | `/api/solicitudes-retiro` | Listar solicitudes (filtrable por estado) |
| `GET` | `/api/solicitudes-retiro/:id` | Detalle de una solicitud |
| `PATCH` | `/api/solicitudes-retiro/:id/cancelar` | Cancelar solicitud (ciudadano) |
| `GET` | `/api/usuarios/:ciudadanoId/perfil-acceso` | Perfil de acceso — habilita el login diferido (**requiere auth**, solo el propio id) |

Estados de una solicitud (`EstadoSolicitudRetiro`):
`pendiente` · `asignada` · `en_proceso` · `completada` · `cancelada`

### Autenticación (HU-13 — desarrollo)

Hasta que Benjamín integre ClaveÚnica/JWT, las rutas protegidas exigen:

```
Authorization: Bearer <uuid-usuario-ciudadano>
```

UUIDs de demo (migraciones): ciudadano `…0001`, doble rol operador `…0002`,
doble rol administrador `…0003`.

Los tres se usan como `Authorization: Bearer <uuid>` mientras no exista el JWT. Van los ids de
**`usuarios_ciudadanos`**, no los de `usuarios_administradores`: la identidad es siempre la
ciudadana y el perfil municipal es una extensión sobre ella.

| UUID | Perfil | Alcance |
|---|---|---|
| `…0001` | Solo ciudadano | Sus propias solicitudes |
| `…0002` | Ciudadano + operador (Camila) | Panel municipal, **sin** acceso a la auditoría |
| `…0003` | Ciudadano + admin (Carlos) | Panel municipal **y** registro de auditoría |

| Ruta | Quién puede |
|---|---|
| `GET /health`, `GET /residuos/catalogo` | Público |
| `POST/GET solicitudes-retiro`, `PATCH …/cancelar` | Ciudadano autenticado (solo propias) |
| `GET perfil-acceso` | Solo el propio `ciudadanoId` |

> **`PATCH solicitudes-retiro/:id` (cambiar estado, `admin`/`operador`) se movió a
> `apps/backend-admin`** (`PATCH /api/admin/solicitudes/:id`, puerto 3001) en la migración de
> separación del panel admin (2026-09-01). Es el único endpoint que salió de este backend.

En `NODE_ENV=production` el Bearer UUID dev está deshabilitado hasta JWT real.

> **Integración frontend:** hasta que `arca.ts` envíe el header, la PWA obtiene `401` en
> rutas protegidas. Ver tarea para Maximiliano en el PR de HU-13.

---

## Estructura de `src/`

```
src/
├── main.ts                      # Bootstrap: CORS, prefijo /api, ValidationPipe global
├── app.module.ts                # Módulo raíz — importa AuthModule de @arca/core
├── database/
│   ├── data-source.ts           # DataSource de TypeORM (entities: ENTIDADES de @arca/core)
│   └── migrations/              # Migraciones versionadas, en orden de timestamp — único dueño del esquema
├── residuos/                    # Catálogo de residuos (entidad en @arca/core)
├── solicitudes-retiro/          # Solicitudes de retiro (controller, service, DTOs; entidad en @arca/core)
└── users/                       # UsersService/Controller/Module — entidades en @arca/core;
                                    provee PERFIL_ACCESO_RESOLVER para AuthModule
```

> **`auth/`, `health/` y las entidades TypeORM viven en `packages/arca-core`** desde la
> migración de separación del panel admin (2026-09-01) — las comparte con
> `apps/backend-admin`. `health/` se sumó después: era un `HealthController` sin ninguna
> lógica propia de este backend, así que compartirlo era mejor que duplicarlo. Detalle en
> [`../../packages/arca-core/README.md`](../../packages/arca-core/README.md).

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
