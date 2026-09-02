# Backend Fase 1 — Resumen de implementación

> **Autor:** Javier Figueroa (Back-End)  
> **Integrado en:** `develop` / `master` (el trabajo se hizo en la antigua `feature/backend`, ya eliminada)  
> **Fecha:** Junio 2026  
> **Equipo:** COM Tech — Feria de Software 2026

Documento de hito que resume la primera implementación del backend y la infraestructura local compartida.

---

## Objetivo de esta fase

Dejar operativa la **base del MVP backend (Fase 1)**:

- Entorno local reproducible (Docker + MySQL)
- API NestJS conectada a base de datos
- Tablas de **identidad** (auth futuro)
- Tablas y endpoints de **EP-01** (catálogo + solicitudes de retiro)
- CORS habilitado para integración con frontend en desarrollo

---

## Estructura del repositorio (nuevo)

```
A.R.C.A/
├── docker-compose.yml          # MySQL 8 local
├── .gitignore                  # node_modules, dist, .env.local
├── ARCA_database_schema.dbml   # Schema completo (22 tablas — referencia)
├── docs/
│   ├── BACKEND_FASE1.md        # Este archivo
│   └── SETUP_LOCAL.md          # Guía setup para el equipo
├── packages/
│   └── arca-core/              # Entidades TypeORM + auth + health (@arca/core) — ex apps/backend/src
└── apps/
    ├── backend/                # NestJS 11 + TypeORM — API ciudadana
    │   ├── .env.example
    │   ├── src/
    │   │   ├── database/       # data-source (único dueño de las migraciones) + migraciones
    │   │   ├── users/          # UsersService/Controller/Module (entidades viven en @arca/core)
    │   │   ├── residuos/       # Catálogo EP-01
    │   │   └── solicitudes-retiro/
    │   └── package.json
    └── backend-admin/          # NestJS — API del panel municipal (Benjamín, ver su README)
```

> **Migración de separación del panel admin (2026-09-01):** las entidades y `auth/` (Guards
> HU-13, ClaveÚnica HU-12) se movieron a `packages/arca-core`, un paquete compartido con
> `apps/backend-admin`. `health/` se sumó después: era un `HealthController` sin lógica propia
> de este backend, así que compartirlo evitó duplicarlo entero en `apps/backend-admin`. Detalle
> y decisiones en [`../packages/arca-core/README.md`](../packages/arca-core/README.md).

---

## Infraestructura

| Componente | Detalle |
|---|---|
| Docker Compose | MySQL 8, contenedor `arca-mysql`, puerto `3306` |
| Base de datos | `arca_dev` |
| Usuario BD | `arca_user` / `arca_pass` (solo desarrollo local) |
| Volumen | `arca_mysql_data` (persiste datos entre reinicios) |

---

## Migraciones ejecutadas

| Migración | Tablas / datos |
|---|---|
| `1782163200000-create-identity-tables` | `usuarios_ciudadanos`, `sesiones_ciudadano`, `usuarios_administradores`, `sesiones_administrador` |
| `1782163300000-create-residuos-catalogo` | `residuos_catalogo` + seed inicial (4 ítems genéricos, sin precio) |
| `1782163400000-create-solicitudes-retiro` | `solicitudes_retiro` + usuario dev de prueba |
| `1782163500000-seed-operador-demo` | Usuario demo **doble rol** (ciudadano `…0002` + operador `…00A2`) |
| `1782163600000-replace-catalogo-precios-reales` | Columna `precio` (CLP) en `residuos_catalogo`; catálogo reemplazado por los **26 ítems reales** de `costo retiro Voluminosos.xlsx` (Municipalidad de Santo Domingo). Borra las `solicitudes_retiro` existentes (datos de prueba dependientes del catálogo viejo por FK). |

**Comando:** `npm run migration:run` (desde `apps/backend/`)

---

## Entidades TypeORM

Desde la migración de separación del panel admin (2026-09-01), entidades y `auth/` viven en
`packages/arca-core` (`@arca/core`) — este backend las importa, no las define.

| Fuente | Entidades / exports |
|---|---|
| `@arca/core` (`entities/`) | `UsuarioCiudadano`, `SesionCiudadano`, `UsuarioAdministrador`, `SesionAdministrador`, `RolAdministrador`, `ResiduoCatalogo`, `SolicitudRetiro`, `EstadoSolicitudRetiro`, `ENTIDADES` (usado por `data-source.ts`) |
| `@arca/core` (`auth/`) | `AuthGuard`, `RolesGuard`, `AuthModule`, `AuthService`, `@Public`, `@Roles`, `@CurrentUser`, `PERFIL_ACCESO_RESOLVER` |
| `@arca/core` (`health/`) | `HealthModule` — sin lógica propia de este backend, compartido para no duplicarlo |
| `apps/backend/src/users/` | `UsersService`, `UsersController`, `UsersModule` — el módulo que provee `PERFIL_ACCESO_RESOLVER` para este backend (ver README del core) |

---

## Endpoints disponibles

Base URL local: `http://localhost:3000/api` (prefijo global `/api` desde `app.setGlobalPrefix('api')`
en `main.ts` — necesario para que frontend y backend compartan un único origen detrás de un
proxy; ver `docs/SETUP_LOCAL.md`).

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado API + conexión MySQL |
| `GET` | `/api` | Hello World (scaffold) |
| `GET` | `/api/residuos/catalogo` | Lista tipos de residuo (con `precio` real) |
| `POST` | `/api/solicitudes-retiro` | Crear solicitud de retiro |
| `GET` | `/api/solicitudes-retiro` | Listar solicitudes (con acceso municipal, sin filtro por dueño) |
| `GET` | `/api/solicitudes-retiro?usuarioCiudadanoId={uuid}` | Solicitudes de un ciudadano |
| `GET` | `/api/solicitudes-retiro/{id}` | Detalle (ciudadano + residuo + operador) |
| `PATCH` | `/api/solicitudes-retiro/{id}/cancelar` | **Ciudadano:** cancelar su propia solicitud |
| `GET` | `/api/usuarios/{ciudadanoId}/perfil-acceso` | Login diferido: `{ esAdministrador, administrador }` (**requiere auth**, solo el propio id) |

> **Movido a `apps/backend-admin` (2026-09-01):** `PATCH /api/solicitudes-retiro/{id}` (cambiar
> estado/operador/fecha/razón) vive ahora en `PATCH /api/admin/solicitudes/{id}`, puerto 3001.
> El método `update()` sigue en `solicitudes-retiro.service.ts` sin llamador — pendiente que
> Javier decida si se borra o se comparte con el service nuevo (no se tocó de paso, regla A.4).

### Control de acceso por roles (HU-13)

Rama `2026-08-31-javier-hu13-control-acceso` · módulo `src/auth/`.

Hasta que Benjamín integre ClaveÚnica/JWT (HU-12), en **desarrollo** las rutas protegidas
exigen:

```
Authorization: Bearer <uuid-usuario-ciudadano>
```

UUIDs de demo (migraciones): ciudadano `…0001`, doble rol operador `…0002`.

| Ruta | Acceso |
|---|---|
| `GET /health`, `GET /residuos/catalogo`, `GET /` | Público |
| `POST/GET solicitudes-retiro`, `PATCH …/cancelar` | Ciudadano autenticado (propias, o municipal sin filtro) |
| `GET perfil-acceso` | Solo el propio `ciudadanoId` |
| `PATCH admin/solicitudes/{id}` (en `apps/backend-admin`, :3001) | Rol `admin` u `operador` |

En `NODE_ENV=production` el Bearer UUID dev está deshabilitado hasta JWT real.

**Breaking change para el frontend:** `arca.ts` debe enviar el header `Authorization`
en las llamadas protegidas (PR aparte — Maximiliano). Sin eso, la PWA responde `401`.

Detalle de implementación: [`apps/backend/README.md`](../apps/backend/README.md) § Autenticación.

### Cambio de estado (PATCH admin)

> Esta lógica corre hoy en `apps/backend-admin` (`PATCH /api/admin/solicitudes/{id}`), no acá
> — se documenta igual porque el criterio de negocio es el mismo y sigue siendo válido.

El panel municipal puede fijar **cualquier** estado, incluido **revertir** (ej.
`completada → pendiente`), para operar y probar el flujo. El backend solo conserva
invariantes de datos:

- `asignada` exige `operadorAsignadoId` de un administrador **activo**.
- `completada` setea `fechaCompletada`; al **salir** de completada se limpia.
- La cancelación del ciudadano solo procede sobre **sus** solicitudes en estado
  `pendiente` o `asignada` (valida propiedad → `403` si es ajena).

> Nota: la máquina de estados estricta (`pendiente→asignada→en_proceso→completada`)
> se relajó a propósito para esta fase. Endurecerla queda como pendiente (flag/permiso).

### Login diferido

`GET /api/usuarios/{ciudadanoId}/perfil-acceso` resuelve si una identidad base además
tiene extensión de administrador activa. El frontend lo usa tras autenticar para
decidir el destino: funcionario → selección de contexto; solo ciudadano → PWA directa.

Desde HU-13, el endpoint exige autenticación y solo permite consultar el perfil del
usuario autenticado (mismo `ciudadanoId` que el Bearer).

### Ejemplo POST solicitud

```json
{
  "usuarioCiudadanoId": "00000000-0000-4000-8000-000000000001",
  "residuoCatalogoId": 5,
  "descripcion": "Refrigerador 2 puertas grande, funciona bien"
}
```

`residuoCatalogoId` tiene que ser un id real del catálogo vigente (`GET /api/residuos/catalogo`
— los ids cambiaron con la migración de precios reales, no asumir valores fijos).
Campos opcionales: `direccionAnonimizada`, `latitudCapturada`, `longitudCapturada`.

---

## Usuario de desarrollo (temporal)

Hasta que Benjamín integre auth (JWT / ClaveÚnica), existe un ciudadano de prueba insertado por migración:

| Campo | Valor |
|---|---|
| `id` | `00000000-0000-4000-8000-000000000001` |
| `clave_unica_id` | `dev-claveunica-test` |

Además, la migración `seed-operador-demo` agrega un **usuario demo con doble rol** (misma
persona como ciudadano y como operador municipal), para poder ejercitar el ciclo admin
completo `asignar → en_proceso → completada`:

| Campo | Valor |
|---|---|
| Ciudadano (identidad base) | `00000000-0000-4000-8000-000000000002` |
| Operador (`operadorAsignadoId`) | `00000000-0000-4000-8000-0000000000A2` · rol `operador` |

**No usar en producción.** Cuando auth esté listo, el `usuarioCiudadanoId` saldrá del token JWT, no del body.

---

## CORS

Configurado en `apps/backend/src/main.ts`:

- Orígenes permitidos: `FRONTEND_URL` (default `http://localhost:5173`), admite **lista
  separada por comas** si hace falta agregar más de un origen (ej. un dominio ngrok)
- Variable en `.env.example`: `FRONTEND_URL=http://localhost:5173`
- En el flujo normal (frontend vía el proxy `/api` de Vite) el navegador nunca cruza
  orígenes, así que CORS solo importa si algo llama al backend directo

---

## Commits principales (`feature/backend`)

```
c3024c7 fix(backend): habilitar CORS para frontend local
264086b feat(backend): catálogo de residuos y solicitudes de retiro (EP-01)
da6066f feat(backend): migración residuos_catalogo con seed inicial
d44f15f feat(backend): entidades TypeORM de identidad y UsersModule
42aa7da feat(backend): migración inicial tablas de identidad
3c37c97 feat(backend): conectar TypeORM con MySQL y endpoint /health
24f98eb feat(backend): scaffold inicial NestJS en apps/backend
4893f44 chore(devops): agregar docker-compose para MySQL local
```

---

## Pendiente (no incluido en Fase 1)

| Área | Responsable | Notas |
|---|---|---|
| Auth ClaveÚnica + JWT | Benjamín (HU-12) | Reemplazar Bearer UUID dev en `AuthService`; requiere aprobación organismo |
| Front: header `Authorization` | Maximiliano | PR aparte tras merge HU-13; sin esto la PWA da `401` en rutas protegidas |
| Frontend React PWA | Maximiliano | Ver `docs/SETUP_LOCAL.md` |
| Migraciones restantes del DBML | Javier | horarios, fotos, marketplace, credits, etc. |
| Subida de fotos | Javier | Fase posterior |
| ~~PATCH estado solicitud (operador)~~ | ✅ Hecho | Rama `admin-municipal` (máquina de estados) |
| ~~Cancelación por ciudadano~~ | ✅ Hecho | Rama `admin-municipal` (`PATCH /:id/cancelar`) |
| ~~Login diferido (perfil-acceso)~~ | ✅ Hecho | `GET /usuarios/:id/perfil-acceso` |
| ~~Control de acceso por roles (HU-13)~~ | ✅ Hecho | `auth/`: guards, `@Roles`, auth dev Bearer UUID |
| Endurecer máquina de estados | Pendiente | Hoy reversible para pruebas; reponer con flag/permiso |
| `GET /api/operadores` | Javier (HU-08) | Listar administradores activos para modal de asignación |
| PR merge HU-13 a `develop` | Javier | Rama `2026-08-31-javier-hu13-control-acceso` |

---

## Schema DBML vs implementado

El archivo `ARCA_database_schema.dbml` define **22 tablas**. En Fase 1 backend están creadas **6**:

- ✅ 4 identidad
- ✅ `residuos_catalogo`
- ✅ `solicitudes_retiro`

Las **16 restantes** se migrarán en fases siguientes según el roadmap del README.
