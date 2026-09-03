# A.R.C.A. — Backend admin

API del panel municipal. Puerto **3001**, misma base de datos MySQL que `apps/backend`
(el backend ciudadano), **sin migraciones propias** — `apps/backend/src/database/migrations/`
sigue siendo el único dueño del esquema.

Nació de la migración de separación del panel admin (2026-09-01), Fase 3.

## Scripts

```bash
npm run start:dev      # con watch
npm run build
npm run lint
```

`prebuild`/`prestart:dev` compilan `@arca/core` antes — ver
[`packages/arca-core/README.md`](../../packages/arca-core/README.md) si el core cambió y algo
quedó desincronizado.

## Variables de entorno

Copiar `.env.example` a `.env.local` — mismas credenciales de base de datos que
`apps/backend`. `FRONTEND_URL` apunta al panel (`http://localhost:5174`, no a la PWA).

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio + conexión a MySQL (`HealthModule` de `@arca/core`, público) |
| `GET` | `/api/admin/solicitudes` | Listado global de solicitudes de retiro, filtro opcional por `estado` — **sin** filtro por dueño (a diferencia del equivalente en `apps/backend`) |
| `GET` | `/api/admin/solicitudes/:id` | Detalle |
| `PATCH` | `/api/admin/solicitudes/:id` | Cambiar estado / asignar operador |
| `GET` | `/api/admin/mapa-calor` | Agregación de solicitudes por sector y métrica (`volumen` o `pendientes`), calculado en memoria con umbral de privacidad. Devuelve intensidad relativa y conteos. |

Protegidos con `RolesGuard` de `@arca/core` (lectura: ADMIN/OPERADOR/PATROCINADOR; el PATCH:
ADMIN/OPERADOR).

## Por qué existe `src/identity/`

`RolesGuard` necesita que `request.user` ya esté resuelto por `AuthGuard`, y `AuthGuard`
necesita un `PERFIL_ACCESO_RESOLVER` — ver
[`packages/arca-core/README.md`](../../packages/arca-core/README.md#decisión-de-arquitectura-perfil_acceso_resolver).
Este backend no puede importar `UsersService` de `apps/backend` (es otra app), así que
`src/identity/identity.service.ts` **duplica** `UsersService.getPerfilAcceso` contra la misma
base de datos.

**Deuda declarada:** si cambia el criterio de qué hace a alguien administrador en
`apps/backend/src/users/users.service.ts`, hay que replicarlo acá también. Fuente de verdad:
ese archivo.

## Deuda declarada: sin login propio en el frontend

`apps/admin-web` (el panel) todavía no tiene su propio login de ClaveÚnica ni un guard de
sesión — cualquiera con la URL entra a la interfaz. Sus llamadas a este backend sí exigen un
`Authorization: Bearer` válido (por `AuthGuard`), así que en la práctica devuelven `401` hasta
que exista ese login. No es un bug de este backend: es la tarea siguiente, reportada al equipo
en el PR de la migración.
