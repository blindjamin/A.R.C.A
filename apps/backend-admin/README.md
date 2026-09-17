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
| `GET` | `/api/admin/solicitudes` | Listado global de solicitudes de retiro, filtro opcional por `estado` — **sin** filtro por dueño (a diferencia del equivalente en `apps/backend`). Con `estado=en_revision` ordena de la más antigua a la más nueva |
| `GET` | `/api/admin/solicitudes/:id` | Detalle, con `revisadoPor`, `tomadaPor` y `transicionesDisponibles` (estados a los que la sesión puede mover la solicitud con `PATCH`; no incluye las decisiones de revisión) |
| `PATCH` | `/api/admin/solicitudes/:id` | Cambiar estado. Body: solo `{ estado }`; lo valida `aplicarTransicion` de `@arca/core` (`403` si el rol no puede, `400` si la transición no existe o falta el pago). Cualquier otro campo responde `400`. Desde `en_revision`, aprobar, pedir modificación o rechazar responde `400`: van por `POST /revision` |
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
| `GET` | `/api/admin/mapa-calor` | Agregación de solicitudes por sector y métrica (`volumen` o `pendientes`), calculado en memoria con umbral de privacidad. Devuelve intensidad relativa y conteos. |

Protegidos con `RolesGuard` de `@arca/core`: `ADMIN` y `FUNCIONARIO`, salvo la auditoría, que es solo
`ADMIN`. Reabrir una solicitud `rechazada` o `retirada` también es solo de admin (lo decide el core).

> ✅ **Replanteo del 2026-09-17 implementado en este backend.** Ningún service asigna `estado`
> directamente: todo pasa por `aplicarTransicion` y `validarRevision` de `@arca/core`. La auditoría
> registra solo campos cambiados y códigos, nunca comentarios, notas ni el contenido del Excel.
> Detalle: [specs del panel](../../docs/specs/MAPA_PANEL_MUNICIPAL.md) ·
> [pendientes del equipo](../../docs/PENDIENTES_EQUIPO.md)

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
