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

UUIDs de demo (migraciones): ciudadano `…0001`, doble rol operador `…0002`.

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

---

## Convenciones

- **Controladores delgados:** la lógica de negocio vive en los *services*.
- **DTOs con `class-validator`:** el `ValidationPipe` global corre con `whitelist: true` y
  `transform: true`, así que las propiedades no declaradas en el DTO se descartan.
- **Entidades TypeORM** con nombres de columna en `snake_case` vía `name:`, y propiedades
  TypeScript en `camelCase`.
- Tipos explícitos; `UPPER_SNAKE_CASE` para constantes, `camelCase` para variables y funciones.
