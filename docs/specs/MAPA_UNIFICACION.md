# Mapa de capacidades — Reunificación en un solo sitio

> **Estado:** APROBADO (2026-09-26) · decisiones 1 y 2 cerradas; seguridad (`control-acceso`) se revisa después de reunificar
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Revierte en la práctica:** la separación del panel (PR #34, 2026-09-01), **sin perder** lo construido después
> (ciclo de solicitud, revisión, derivación con Excel, métricas, mapa de calor, auditoría).

## 1. Qué cambió y por qué

ClaveÚnica (CeroFilas) registra **un solo sitio**: un `redirect_uri` y un logout por integración. Con
dos sitios (PWA + panel) y dos backends, solo uno de los dos puede iniciar sesión. Además, lo que se
pidió a la municipalidad (`entrega-municipalidad/Requerimientos_Servidor_ARCA.md` §4) es **un proceso
Node en `127.0.0.1:3000` detrás de `/api/`**, que tampoco calza con dos backends.

Todavía no hay nada desplegado: es una reintegración de código en local, sin migración de datos ni
cortes de servicio.

**Resultado esperado:** un sitio, un backend, un login. Después de ClaveÚnica, la vista depende del
rol (el "login diferido" que ya existe en `SeleccionInicio`):

| Rol | Ve |
|---|---|
| Vecino | PWA (`/inicio`, `/mis-solicitudes`, flujo de retiro) |
| Funcionario | Selección de contexto → PWA o panel `/admin/*` (sin Auditoría) |
| Admin | Igual que funcionario + Auditoría y acciones que revierten |

Ocultar pantallas en el front **no** protege datos: la barrera es el backend. El front solo evita
mostrar y descargar lo que el rol no puede usar.

## 2. Estado de partida (2026-09-26)

| Pieza | Hoy | Después |
|---|---|---|
| Backend ciudadano | `apps/backend` · :3000 | `apps/backend` · :3000 (único) |
| Backend panel | `apps/backend-admin` · :3001, sin migraciones, `IdentityService` duplicado | Sus módulos pasan a `apps/backend/src/admin/`; la app se elimina |
| PWA | `apps/frontend` · :5173 | `apps/frontend` · :5173 (único) |
| Panel | `apps/admin-web` · :5174, sin login ni guard | Sus páginas pasan a `apps/frontend/src/admin/` bajo `/admin/*`; la app se elimina |
| Núcleo | `packages/arca-core` | Se reabsorbe en `apps/backend/src/core/` (decisión 4) |
| Sesión | `Bearer <uuid-ciudadano>` en `localStorage`; el callback de ClaveÚnica no emite sesión | Cookie `HttpOnly` con id de sesión opaco, guardado con hash en `sesiones_*` |

Lo que choca al juntar (revisado en el código):

- **Rutas:** no hay colisiones. El panel ya usa el prefijo `admin/` en todos sus controladores.
- **Dependencias backend:** el panel suma `exceljs` (ya autorizada, decisión 3 del mapa del panel).
- **`ValidationPipe`:** el panel usa `forbidNonWhitelisted: true` y el ciudadano no. Se unifica en
  `true` y se prueba que la PWA no envíe campos de más.
- **TypeORM:** el ciudadano usa `autoLoadEntities` y el panel `entities: ENTIDADES`. Se unifica en
  `ENTIDADES` (el panel explica por qué `autoLoadEntities` revienta).
- **Dependencias frontend:** el panel suma `leaflet`, `react-leaflet` y `@types/leaflet`.
- **UI duplicada que divergió:** `EstadoPill` y `estadoMeta` tienen etiquetas distintas para el
  vecino y para el panel (SPEC-ciclo-solicitud §3). Se conservan las dos, cada una en su vista; no se
  fusionan.

## 3. Módulos

| Módulo | Responsabilidad | Depende de | Área |
|---|---|---|---|
| `backend-unificado` | Mover los módulos de `backend-admin` a `apps/backend/src/admin/`, borrar `IdentityService` (usa `UsersService`), unificar `main.ts` y TypeORM, borrar `apps/backend-admin` y su workspace. **Sin cambio de comportamiento.** | — | Backend |
| `sesion-unica` | El callback de ClaveÚnica crea o busca al ciudadano y emite la sesión en una cookie `HttpOnly; Secure; SameSite=Lax`. `GET /api/sesion` devuelve perfil y rol. El logout revoca la sesión y cierra ClaveÚnica. Login de desarrollo solo con `ALLOW_DEV_LOGIN=true`, y **la app no arranca** si además `NODE_ENV=production`. Registro de `LOGIN`/`LOGOUT` en auditoría. | — | Backend + núcleo |
| `control-acceso` | Denegación por defecto en `/api/admin/*` (`@Roles` a nivel de clase) y un test que recorra todas las rutas y falle si alguna de `/admin` queda sin rol. Chequeo de dueño en todo lo ciudadano. Chequeo de `Origin` en POST/PATCH/DELETE (CSRF, ahora que hay cookie). Sin CORS (mismo origen). Respuestas con lista blanca de campos. (El límite de intentos ya viene en la rama de rate limiting de Miguel.) | backend-unificado, sesion-unica | Backend |
| `frontend-unificado` | Mover páginas, `RevisionSolicitud` y `api/admin.ts` a `apps/frontend/src/admin/` con `React.lazy`, guard por rol en `/admin/*`, `SeleccionInicio` navega a `/admin` en vez de `VITE_ADMIN_URL`. Eliminar la identidad de `localStorage`, `DEV_USERS` y `SelectorPerfilDev`: todo sale de `/api/sesion`. Borrar `apps/admin-web`. | sesion-unica (contrato de `/api/sesion`) | Frontend |
| `setup-unificado` | `setup.ps1`, `SETUP_LOCAL.md`, `DEPLOY_CPANEL.md` (hoy describe 4 piezas y el subdominio `admin.`), `CLAUDE.md`, `README.md` y `.env.example` para 2 proyectos en vez de 4. Un solo `redirect_uri` en CeroFilas. Cabeceras de seguridad en el proxy inverso anotadas en el documento del servidor. | todos | DevOps + Docs |

**Orden de construcción**

```
backend-unificado ─┐
                   ├─► control-acceso ─┐
sesion-unica ──────┤                   ├─► setup-unificado
                   └─► frontend-unificado ┘
```

- ✅ **Integradas el 2026-09-26 (PR #51 y #52)** las dos ramas que tocan lo que se mueve:
  `2026-09-25-miguel-seguridad-rate-limit` (toca `apps/backend-admin` y el controlador de ClaveÚnica;
  suma `@nestjs/throttler`) y `2026-09-26-miguel-estados-mis-solicitudes` (toca `api/arca.ts`,
  `SessionContext` y `estadoMeta` de la PWA). Si se integran después, chocan con el movimiento.
- `backend-unificado` va primero porque es mecánico y lo cubren los tests que ya existen. Mientras no
  se integre, **nadie abre PR nuevos contra `apps/backend-admin` ni `apps/admin-web`**: se congela
  para no perder cambios en el movimiento.
- `sesion-unica` puede avanzar en paralelo: toca el núcleo y el callback, no los módulos movidos.
- `frontend-unificado` puede empezar moviendo pantallas con el login de desarrollo actual y cambiar a
  `/api/sesion` cuando esté `sesion-unica`.
- `control-acceso` se especifica **después** de reunificar, en la revisión de seguridad acordada
  (2026-09-26). Hasta entonces rige lo que ya existe: `RolesGuard` en `/admin` y chequeo de dueño.
- Cada módulo es una rama y un PR por área (regla A.7), con su spec `SPEC-<módulo>.md`.

## 4. Criterios de éxito globales

1. Existe un solo proceso Node (`:3000`) y un solo front (`:5173`). `apps/backend-admin` y
   `apps/admin-web` ya no existen.
2. Siguen en verde los tests que hoy tienen los dos backends (10 archivos `*.spec.ts`: 5 ciudadanos y 5
   del panel, al 2026-09-26), ahora bajo `apps/backend`.
3. Un solo `redirect_uri` de ClaveÚnica sirve para vecinos, funcionarios y admins.
4. Un vecino autenticado recibe **403** en **todas** las rutas `/api/admin/*` (test que las recorre).
5. Un vecino no puede leer, listar ni cancelar solicitudes de otro, aunque conozca el id (test).
6. No hay identidades ni tokens en `localStorage`, y la cookie de sesión no es legible desde JS.
7. Con `NODE_ENV=production` y `ALLOW_DEV_LOGIN=true`, la app **no arranca**.
8. Cerrar sesión invalida la sesión en la base (una petición posterior con la misma cookie da 401) y
   redirige al logout de ClaveÚnica.
9. Un vecino nunca descarga el código del panel (chunk lazy que solo se pide con rol municipal).

## 5. Límites

- **Siempre:** mover código sin reescribirlo en `backend-unificado`/`frontend-unificado` (un PR que
  mueve y cambia a la vez no se puede revisar); correr lint, tests y build del backend antes de cada PR.
- **Preguntar antes:** migraciones de esquema (p. ej., columna de hash de sesión), dependencias
  nuevas, cambios a `packages/arca-core` (lo revisa backend ciudadano, regla A.7).
- **Nunca:** dejar un login de desarrollo alcanzable en producción; guardar el RUN en claro; devolver
  identidad o token por la URL (el error de Atención Vecino que documenta `clave-unica.controller.ts`).

## 6. Decisiones

| # | Decisión | Fecha |
|---|---|---|
| 1 | **Sesión en servidor con cookie `HttpOnly`**, no JWT. Más cómoda (sin refresh tokens en el front), más segura (revocación inmediata, no legible desde JS) y escalable (el estado vive en MySQL, no en el proceso; funciona con uno o varios procesos). Reemplaza la mención a JWT de `DEPLOY_CPANEL.md` §1. | 2026-09-26 |
| 2 | Duración: vecino 7 días; funcionario y admin 8 horas, con cierre a los 30 minutos sin actividad | 2026-09-26 |
| 3 | Dependencias y endurecimiento de seguridad se deciden en la revisión posterior (`control-acceso`) | 2026-09-26 |
| 4 | **Se reabsorbe `packages/arca-core` en `apps/backend/src/core/`** (tarea CORE-1). Con un solo backend, el núcleo compartido no tiene a quién compartir; se elimina el workspace y el paso `build:core`. El código de sesión nuevo se escribe directamente en `apps/backend`. Cambios de seguridad documentados en [`docs/SEGURIDAD_ARQUITECTURA.md`](../SEGURIDAD_ARQUITECTURA.md) | 2026-09-26 |

### Abiertas

| # | Pregunta | Propuesta |
|---|---|---|
| 1 | Responsables por módulo | Por definir en la planificación del sprint. |

## 7. Specs por módulo

| Módulo | Spec | Estado |
|---|---|---|
| `backend-unificado` | [SPEC-backend-unificado.md](SPEC-backend-unificado.md) | BORRADOR |
| `sesion-unica` | [SPEC-sesion-unica.md](SPEC-sesion-unica.md) | BORRADOR |
| `control-acceso` | `SPEC-control-acceso.md` | Después de reunificar (decisión 3) |
| `frontend-unificado` | [SPEC-frontend-unificado.md](SPEC-frontend-unificado.md) | BORRADOR |
| `setup-unificado` | [SPEC-setup-unificado.md](SPEC-setup-unificado.md) | BORRADOR |

Plan de ejecución con agentes: [`tasks/plan.md`](../../tasks/plan.md) · [`tasks/todo.md`](../../tasks/todo.md)
