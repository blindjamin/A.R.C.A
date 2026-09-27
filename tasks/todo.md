# Tareas: Reunificación en un solo sitio

> Plan: [`plan.md`](plan.md) · Specs: [`docs/specs/MAPA_UNIFICACION.md`](../docs/specs/MAPA_UNIFICACION.md)
> Cada tarea = un agente, una rama y un worktree. Brief y reglas: `plan.md` → "Protocolo para cada agente".

## Registro de ejecución

**Integración local (sin push):** rama `2026-09-26-benjamin-integracion-unificacion`, creada desde `origin/develop` (44adc39). Cada rama de tarea se integra ahí con `--no-ff` después de la revisión del orquestador; la ola siguiente parte de ella. Los PR a `develop` se abren después, en orden, con la skill `abrir-pr`.

**Línea base (2026-09-26, después de `npm install`):** núcleo 128 tests ✓ · backend 32 ✓ · panel 38 ✓ · builds ✓ · frontend build ✓. Lint: 2 errores de formato **preexistentes** en `apps/backend/src/database/migrations/1782163900000-seed-operadores-prueba.ts` (área BD, fuera de alcance: no se tocan).

| Tarea | Rama | Estado | Nota |
|---|---|---|---|
| BU-1..3 | `2026-09-26-benjamin-backend-unificado` | ✅ integrada localmente (4533e73) | Agente Sonnet. 4 commits; movimiento con 0 líneas cambiadas; backend 10 suites / 70 tests ✓; curls 401/403/200 ✓; lint solo con los 2 errores preexistentes. Combinada con SU-1: core 160 ✓, backend 70 ✓ |
| BU-4 | `…-admin-web-proxy-3000` + `…-setup-sin-backend-admin` | ✅ integradas localmente (fc991ff, 29ee664) | Hechas por el orquestador (2 cambios chicos). `setup.ps1` sin menciones a backend-admin, sintaxis validada |
| SU-1 | `2026-09-26-benjamin-sesion-servicio` | ✅ integrada localmente (20d3d9f) | Agente Opus. El worktree partió de una base vieja (299aa8d): el orquestador rebasó sobre la integración, resolvió 1 conflicto en `clave-unica.controller.ts` (import de `leerCookie` + comentario de Miguel de 13 paquetes) y corrigió `OPERADOR→FUNCIONARIO` en el spec (daa9de9). Core 160 tests ✓ (128 + 32 nuevos), backend 32 ✓, build ✓ |
| FU-1 | `2026-09-26-benjamin-frontend-panel-admin` | ✅ integrada localmente (133c26a) | Agente Sonnet. 2 commits (git mv 100% + cableado). Chunk `AdminApp` separado (JS 196 kB, CSS 15 kB con leaflet solo ahí); `RequireAdmin` de interfaz; lint ✓, build ✓. `apps/admin-web` queda como cáscara rota hasta FU-3 (esperado). Pendiente de texto: `apps/frontend/README.md` aún menciona `VITE_ADMIN_URL` (va en FU-3/SE) |
| CORE-1 | `2026-09-26-benjamin-core-reabsorbido` | ✅ integrada localmente (4fd2d57) | Agente Sonnet. `git mv` de 58 archivos sin cambios de contenido; 44 imports `@arca/core` → rutas relativas; `@nestjs/throttler` pasa a `apps/backend`; sin workspace `packages/arca-core` ni `build:core`. Backend **20 suites / 230 tests** ✓ (160 del núcleo + 70), build ✓, health y `/api/admin/metricas` 200, `migration:show` ✓. Lint: 12 errores preexistentes en el código del núcleo, que nunca había pasado por eslint (CRLF, imports sin usar, `any` en specs). Quedan para una tarea de lint aparte |
| SE-1 (parcial) | `2026-09-26-benjamin-setup-sin-build-core` | ✅ integrada localmente (c502247) | Orquestador. `setup.ps1` ya no llama a `build:core` (habría roto el setup tras CORE-1). El resto de SE-1/SE-2 (CLAUDE.md, AGENTS.md, README, SETUP_LOCAL, DEPLOY_CPANEL con menciones a `packages/arca-core`/`build:core`) sigue pendiente |
| SU-2 | `2026-09-26-benjamin-sesion-endpoints` | ✅ integrada localmente (2c1bc4d) | Agente Sonnet. `AuthGuard` lee `arca_sesion`; el Bearer solo con `ALLOW_DEV_LOGIN=true`; `GET /sesion`, `POST /auth/logout`, `POST /auth/dev/login` (404 sin flag, `@LimiteLogin`); `verificarLoginDev` en `main.ts`. Arrastres de SU-1 resueltos: `%` malformado → 401; `Max-Age` 28800 / 604800 según rol; **bug de zona horaria real**: mysql2 guardaba la hora local de Chile como UTC (3 h de desfase), corregido con `timezone: 'Z'`. Backend **21 suites / 244 tests** ✓, build ✓, los 8 curl de SPEC-sesion-unica §3 ✓ |
| FU-2 + FU-3 | `2026-09-26-benjamin-frontend-sesion-cookie` | ✅ integrada localmente (6491646) | Agente Sonnet. `SessionContext` sobre `GET /api/sesion`; `apiFetch` único sin `Authorization` que ante un 401 limpia la sesión; `RequireRol`; botones dev (Vecino/Funcionario/Admin) solo con `import.meta.env.DEV`; "Salir" según `devLogin`; borrados `DEV_USERS`, `IDENTIDADES_DEV`, `perfilDevActual`, `SelectorPerfilDev`. `apps/admin-web` eliminado, `setup.ps1` sin el panel en 5174, CORS por defecto solo 5173. Lint ✓, build ✓ (chunk `AdminApp` aparte), backend 244 ✓. **Recorrido en navegador de SPEC-frontend-unificado §3 pendiente** (se hace en la revisión del PR) |

**Corte por cuota (2026-09-26):** la ventana de 5 h llegó al 92% después de SU-2; se terminó FU-2/FU-3 (en curso) y se abrió el PR con lo hecho. Lo que sigue está en la sección siguiente.

### Pendiente después del PR de reunificación

| Tarea | Qué falta | Nota |
|---|---|---|
| **SU-3** | ✅ Hecho (2026-09-26, Javier, rama `2026-09-26-javier-sesion-clave-unica`). Callback: upsert por `clave_unica_id` (desactivado → 401), sesión, cookie, `LOGIN` auditado, `302 /`; logout de ClaveÚnica revoca la sesión. El login de desarrollo también audita `LOGIN` (origen `dev`, criterio 7) | Backend 255 tests ✓. Falta probar el callback contra ClaveÚnica real: requiere credenciales de sandbox y el Redirect URI registrado |
| **SU-4** | ✅ Hecho (2026-09-27, Javier, rama `2026-09-27-javier-sesion-su4`, junto con la sesión 2b). Sin `resolveFromAuthorizationHeader` ni rama Bearer en el guard: `Authorization` da 401 también con `ALLOW_DEV_LOGIN=true`. Sesión 2b (observaciones 1 a 4 de Miguel en #66): `validar()` exige ciudadano activo (si no, revoca) y respeta `fecha_expiracion`; al volver a entrar se revoca la `arca_sesion` anterior; el primer ingreso simultáneo reusa la fila en vez de dar 500 | Backend 260 tests ✓, lint 0, build ✓, curl ✓. Cierra D1 del documento de seguridad. La observación 5 (logout por GET) queda para `control-acceso` |
| **Recorrido §3** | Probar en navegador los 5 pasos de SPEC-frontend-unificado §3 (vecino, funcionario, admin, salir, DevTools) | Con `ALLOW_DEV_LOGIN=true` en `apps/backend/.env.local` |
| **SE-1/SE-2** | CLAUDE.md, AGENTS.md (tabla A.7), README raíz, `docs/SETUP_LOCAL.md`: quitar `packages/arca-core`, `build:core`, `apps/backend-admin`, `apps/admin-web`, puerto 5174 | `setup.ps1` ya está al día |
| **SE-3** | Reescribir `docs/DEPLOY_CPANEL.md`: 2 piezas (backend + estáticos) en un dominio, cookie, `ALLOW_DEV_LOGIN` nunca en producción, un solo Redirect/Logout URI | La sección de empaquetado de `@arca/core` quedó obsoleta |
| Lint del núcleo | ✅ Hecho (2026-09-26 en #67; los 4 últimos errores de `sesion.service.spec.ts`, 2026-09-27 con SU-4): `npm run lint` en 0 | `npm run lint` ya no usa `--fix` (queda `lint:fix`) y excluye las migraciones |
| `data-source.ts` | ✅ Hecho (2026-09-26, Javier): `timezone: 'Z'` también en la config del CLI de migraciones | `migration:show` verificado |
| Endpoint huérfano | `GET /usuarios/:id/perfil-acceso` ya no tiene consumidor en el front | Evaluar si se borra |
| `control-acceso` | Módulo de seguridad adicional diferido (decisión 3 del mapa) | Revisar con Miguel. Incluir la observación 5 de Miguel en #66: el logout de ClaveÚnica por GET permite que otro sitio cierre la sesión con un enlace (severidad baja) |

## Fase 0 — Preparación (personas, no agentes)

- [x] **P-1** (2026-09-26, PR #51 y #52) Integrar `2026-09-25-miguel-seguridad-rate-limit` y `2026-09-26-miguel-estados-mis-solicitudes` a `develop`.
- [ ] **P-2** Avisar al equipo que se congela `apps/backend-admin` y `apps/admin-web` hasta el checkpoint 3, y a Miguel que `DEPLOY_CPANEL.md` se reescribe (SE-3).
- [ ] **P-3** Aprobar las 4 specs (`SPEC-backend-unificado`, `-sesion-unica`, `-frontend-unificado`, `-setup-unificado`) e integrar el PR de documentación del plan.

---

## Ola 1 — en paralelo: [A] backend-unificado ║ [B] SU-1

### BU-1: Mover los módulos del panel a `apps/backend/src/admin/`
**Agente A · Rama:** `AAAA-MM-DD-<persona>-backend-unificado` · **Área:** Backend · **HU:** ninguna · **Revisor:** Javier
**Spec:** SPEC-backend-unificado §2.1, §5

**Descripción:** `git mv` de `auditoria`, `derivaciones`, `mapa-calor`, `metricas`, `residuos` y `solicitudes` (con sus `*.spec.ts`) desde `apps/backend-admin/src/` a `apps/backend/src/admin/`. Sin editar contenido; los módulos no importan fuera de su carpeta (verificado).

**Aceptación:**
- [ ] Los 6 directorios están en `apps/backend/src/admin/` y `git status` los muestra como renombrados.
- [ ] Ningún archivo movido cambió de contenido (`git diff -M --stat` sin líneas modificadas).

**Verificación:** `npx tsc --noEmit -p apps/backend` compila los archivos movidos (el cableado viene en BU-2).
**Dependencias:** ninguna · **Archivos:** 6 directorios (movimiento) · **Tamaño:** S (mecánico)

### BU-2: Cablear `app.module.ts` y `main.ts`; borrar `identity/`
**Agente A (misma rama)** · **Spec:** SPEC-backend-unificado §2.2, §2.3

**Descripción:** Importar los 6 módulos del panel en `AppModule`; TypeORM con `entities: ENTIDADES`; `SeguridadModule` una sola vez y antes de `AuthModule`; `main.ts` con `forbidNonWhitelisted: true` y CORS `:5173,:5174`. `UsersModule` queda como único `PERFIL_ACCESO_RESOLVER`.

**Aceptación:**
- [ ] `npm run start:dev` en `apps/backend` arranca en `:3000` sin errores de metadatos de TypeORM.
- [ ] `/api/admin/solicitudes`: 401 sin Bearer, 403 con el vecino demo y 200 con el funcionario demo.
- [ ] Los endpoints del vecino responden igual que antes.

**Verificación:** curl de SPEC-backend-unificado §3.
**Dependencias:** BU-1 · **Archivos:** `apps/backend/src/app.module.ts`, `apps/backend/src/main.ts` · **Tamaño:** S

### BU-3: Dependencias, workspace, borrar `apps/backend-admin` y documentar
**Agente A (misma rama)** · **Spec:** SPEC-backend-unificado §2.4, T3, T4

**Descripción:** `exceljs` a `apps/backend/package.json`; sacar `apps/backend-admin` de `workspaces` y `dev:backend-admin` del `package.json` raíz; borrar la carpeta; `npm install` en la raíz. Fusionar la tabla de endpoints en `apps/backend/README.md`; actualizar rutas en `PENDIENTES_EQUIPO.md` y en las specs del panel; quitar la deuda de `IdentityService` del README del core.

**Aceptación:**
- [ ] `apps/backend-admin/` no existe.
- [ ] Lint, test y build del backend en verde, con los 10 spec pasando.
- [ ] El grep de T4 solo deja menciones históricas.

**Verificación:** `npm install && npm run build:core && cd apps/backend && npm run lint && npm run test && npm run build`
**Dependencias:** BU-2 · **Archivos:** `package.json`, `package-lock.json`, `apps/backend/package.json`, `apps/backend/README.md`, docs (T4) · **Tamaño:** M

### BU-4: PR acompañantes (proxy del panel y `setup.ps1`)
**Agente A · Dos ramas aparte:** `…-admin-web-proxy-3000` (Frontend, revisor Maxi) y `…-setup-sin-backend-admin` (DevOps, revisor Miguel) · **Spec:** SPEC-backend-unificado §2.5

**Aceptación:**
- [ ] `apps/admin-web/vite.config.ts` apunta a `:3000`.
- [ ] `setup.ps1` no crea `.env.local`, no arranca y no hace health check de `backend-admin`.

**Verificación:** `setup.ps1` levanta 3 ventanas (backend, frontend, admin-web); el panel en `:5174` carga Solicitudes con datos.
**Dependencias:** BU-3 (se integran juntos) · **Archivos:** 2 · **Tamaño:** XS

### SU-1: `SesionService`, cookie y guarda del login de desarrollo
**Agente B · Rama:** `…-sesion-servicio` · **Área:** Núcleo · **HU:** HU-12 · **Revisor:** Javier
**Spec:** SPEC-sesion-unica §2.1, §2.2, §2.3, §2.5, §4

**Descripción:** Archivos nuevos en `packages/arca-core/src/auth/`: `sesion.service.ts` (crear, validar, revocar), `cookies.ts` (`leerCookie` y opciones de `arca_sesion`), `login-dev.ts` (`verificarLoginDev`) y sus tests. Registrar los repositorios en `AuthModule`. **No** se conecta al guard todavía.

**Aceptación:**
- [ ] Pasan todos los casos de SPEC-sesion-unica §4.
- [ ] La base guarda el hash y nunca el secreto; comparación con `timingSafeEqual`.
- [ ] El comportamiento de la app no cambia (el guard sigue igual).

**Verificación:** `npm run build:core && cd packages/arca-core && npm run test`
**Dependencias:** ninguna · **Archivos:** 4 a 5 en `packages/arca-core/src/auth/` · **Tamaño:** M

### CORE-1: Reabsorber `packages/arca-core` en `apps/backend/src/core/`
**Agente · Rama:** `…-core-reabsorbido` · **Área:** Núcleo + Backend · **HU:** ninguna · **Revisor:** Javier
**Decisión:** MAPA_UNIFICACION decisión 4

**Descripción:** `git mv packages/arca-core/src apps/backend/src/core` (con sus spec). Reemplazar cada import `'@arca/core'` por la ruta relativa al `index.ts` o al archivo concreto en `apps/backend/src`. Mover las dependencias de producción del core que falten a `apps/backend/package.json`. Quitar el workspace `packages/arca-core`, el script `build:core` y los `prebuild`/`prestart:dev` que lo llaman. Borrar `packages/`. Sin cambios de comportamiento.

**Aceptación:**
- [ ] `grep -rn "@arca/core" apps packages` sin resultados en código (`*.ts`, `package.json`, configuración de jest).
- [ ] `apps/backend` pasa lint, test y build: 128 tests del core + los del backend, sin tests perdidos.
- [ ] `packages/` no existe y `npm install` en la raíz funciona.

**Verificación:** `npm install && cd apps/backend && npm run lint && npm run test && npm run build && npm run start:dev` (health 200).
**Dependencias:** BU-3 y SU-1 integrados · **Tamaño:** M (mecánico, muchos archivos movidos; lo editado son imports)

### ✅ Checkpoint 1
- [ ] PR de BU (+ los 2 acompañantes), SU-1 y CORE-1 revisados e integrados.
- [ ] Recorrido manual: flujo de retiro en la PWA; en el panel (`:5174`), revisar, derivar y descargar el Excel, más Métricas y Mapa.
- [ ] `develop`: lint, test y build del backend y del core en verde.

---

## Ola 2 — en paralelo: [A] SU-2 → SU-3 ║ [B] FU-1

### SU-2: Guard por cookie y endpoints de sesión

> **Arrastrado de SU-1 (revisión):** (a) `leerCookie` hace `decodeURIComponent` y lanza `URIError` con `%` malformado: el guard debe capturarlo y responder 401, no 500 (con test). (b) La cookie no tiene `maxAge`: fijarlo en la emisión a la duración del rol (7 d vecino, 8 h municipal), si no muere al cerrar el navegador. (c) Verificar en la prueba manual que la zona horaria de MySQL y Node no desfase `fecha_inicio`/`updated_at`.
**Agente A · Rama:** `…-sesion-endpoints` · **Área:** Núcleo + Backend · **HU:** HU-12, HU-13 · **Revisor:** Javier
**Spec:** SPEC-sesion-unica §2.3, §2.4, criterios 3, 5, 6, 9

**Descripción:** `AuthGuard` lee `arca_sesion`; el Bearer se acepta solo con `ALLOW_DEV_LOGIN=true`. Nuevo `sesion.controller.ts` (`GET /sesion`, `POST /auth/logout`, `POST /auth/dev/login` con 404 si no hay dev login, y el límite de login de Miguel). `verificarLoginDev` en `apps/backend/src/main.ts`. `ALLOW_DEV_LOGIN` en `.env.example`.

**Aceptación:**
- [ ] Todos los curl de SPEC-sesion-unica §3 dan lo esperado, incluido que la app no arranca con producción + dev.
- [ ] Sin `ALLOW_DEV_LOGIN`, un `Bearer <uuid>` da 401.
- [ ] Los tests del backend siguen verdes.

**Verificación:** curl de §3 + `cd apps/backend && npm run lint && npm run test && npm run build`
**Dependencias:** Checkpoint 1 · **Archivos:** `auth.guard.ts`, `auth.module.ts`, `sesion.controller.ts`, `apps/backend/src/main.ts`, `.env.example` · **Tamaño:** M

### SU-3: Callback y logout de ClaveÚnica con sesión
**Agente A (rama nueva desde SU-2 integrada, o la misma si el revisor lo prefiere)** · **HU:** HU-12 · **Revisor:** Javier
**Spec:** SPEC-sesion-unica criterios 1, 5, 7; §2.4

**Descripción:** El callback hace upsert del ciudadano por `clave_unica_id`, crea la sesión, deja la cookie, audita `LOGIN` (sin RUN ni nombre) y redirige a `/`. El logout de ClaveÚnica revoca la sesión antes de redirigir.

**Aceptación:**
- [x] El test del controlador (con `ClaveUnicaService` simulado) verifica cookie + 302 `/` + fila de auditoría sin datos personales.
- [x] El logout marca `activa = false` y borra la cookie.
- [x] No queda ninguna `NotImplementedException` en el callback.

**Verificación:** `cd apps/backend && npx jest && npm run build` (el núcleo ya vive en `apps/backend/src/core`).
**Dependencias:** SU-2 · **Archivos:** `clave-unica.controller.ts`, su spec, `sesion.service.ts` (upsert) · **Tamaño:** S

### FU-1: Mover el panel a `apps/frontend/src/admin/` con ruta lazy
**Agente B · Rama:** `…-frontend-panel-admin` · **Área:** Frontend · **HU:** ninguna · **Revisor:** Maxi
**Spec:** SPEC-frontend-unificado §2.1, §2.2, FU1

**Descripción:** `git mv` del panel a `src/admin/` (sin `SelectorPerfilDev`, que se mueve tal cual y se borra en FU-2). `AdminApp` con rutas relativas; `/admin/*` lazy en `App.tsx`, protegido por `esAdministrador` (sesión actual); enlaces a `/admin/...`; componentes UI idénticos reutilizados; leaflet y su CSS dentro del chunk del panel; `SeleccionInicio` → `navigate('/admin')`.

**Aceptación:**
- [ ] Las 5 pantallas funcionan en `:5173/admin/...` con las identidades de desarrollo del panel.
- [ ] `npm run build` genera un chunk separado para el panel, y leaflet no está en el chunk de entrada.
- [ ] Con el vecino de desarrollo, `/admin` redirige a `/inicio`.

**Verificación:** `cd apps/frontend && npm install && npm run lint && npm run build`; recorrido 1 a 3 de SPEC-frontend-unificado §3, con captura.
**Dependencias:** Checkpoint 1 · **Archivos:** movimiento del panel + `App.tsx`, `SeleccionInicio.tsx`, `package.json` · **Tamaño:** M (mecánico; lo nuevo es `App.tsx` y `AdminApp.tsx`)

### ✅ Checkpoint 2
- [ ] PR de SU-2, SU-3 y FU-1 integrados.
- [ ] `curl` con dev login por cookie → `/api/sesion` correcto por rol.
- [ ] El panel funciona dentro de `:5173/admin` (todavía con identidades de desarrollo).

---

## Ola 3 — secuencial

### FU-2: Sesión por cookie en el front
**Agente · Rama:** `…-frontend-sesion-cookie` · **Área:** Frontend · **HU:** HU-12, HU-13 · **Revisor:** Maxi
**Spec:** SPEC-frontend-unificado §2.3, criterios 2, 5, 6, 7

**Descripción:** Reescribir `SessionContext` sobre `GET /api/sesion`; un único `apiFetch` sin `Authorization`, que avisa al contexto ante un 401; `RequireRol`; botones de desarrollo (Vecino, Funcionario, Admin) solo con `import.meta.env.DEV`; "Salir" según `devLogin`; `AdminShell` y Auditoría usan el rol de la sesión. Borrar `DEV_USERS`, `STORAGE_KEY_SESION`, `IDENTIDADES_DEV`, `perfilDevActual` y `SelectorPerfilDev`.

**Aceptación:**
- [ ] Recorrido completo de SPEC-frontend-unificado §3 (5 pasos) OK.
- [ ] `grep -rn "Authorization\|arca.usuarioCiudadanoId\|perfilDev" apps/frontend/src` sin resultados.
- [ ] Una sesión vencida (se puede forzar con `UPDATE sesiones_ciudadano SET activa=0`) lleva a `/login` en la siguiente acción.

**Verificación:** lint + build + recorrido con capturas.
**Dependencias:** Checkpoint 2 · **Archivos:** `SessionContext.tsx`, `api/arca.ts`, `admin/api/admin.ts`, `AppShell.tsx`, `Login.tsx`, `AdminShell.tsx`, `AdminApp.tsx` · **Tamaño:** M-L. Si crece, dividir: (a) contexto y `apiFetch`; (b) guards y panel.

### FU-3: Borrar `apps/admin-web`
**Agente (misma rama que FU-2 o una nueva)** · **Revisor:** Maxi
**Aceptación:** [ ] `apps/admin-web/` no existe; [ ] `grep -rn "admin-web\|VITE_ADMIN_URL\|5174" apps setup.ps1` sin resultados.
**Verificación:** build del front; `setup.ps1` sin la ventana del panel.
**Dependencias:** FU-2 · **Tamaño:** XS

### SU-4: Quitar el Bearer de desarrollo
**Agente · Rama:** `…-sesion-sin-bearer` · **Área:** Núcleo · **HU:** HU-12 · **Revisor:** Javier
**Spec:** SPEC-sesion-unica SU4
**Aceptación:** [x] No existe `resolveFromAuthorizationHeader`; [x] cualquier `Authorization: Bearer` da 401, también con `ALLOW_DEV_LOGIN=true`.
**Verificación:** tests del core y del backend; curl con Bearer → 401.
**Dependencias:** FU-2 integrado · **Archivos:** `auth.service.ts`, `auth.guard.ts` · **Tamaño:** XS

### ✅ Checkpoint 3
- [ ] Un sitio (`:5173`), un backend (`:3000`), un login. Sin Bearer ni identidad en `localStorage`.
- [ ] Criterios de éxito 1 a 8 del mapa verificados (el 4 y el 5 a mano; sus tests llegan con `control-acceso`).
- [ ] Se levanta el congelamiento de P-2.

---

## Ola 4 — en paralelo (documentación y despliegue)

### SE-1: `setup.ps1` y `package.json` raíz
**Rama:** `…-setup-unificado` · **Área:** DevOps · **Revisor:** Miguel · **Spec:** SPEC-setup-unificado SE1
**Aceptación:** [ ] Criterio 1 en un clon limpio (2 ventanas, health check OK, `ALLOW_DEV_LOGIN=true` solo en el `.env.local`).
**Dependencias:** Checkpoint 3 · **Tamaño:** S

### SE-2: Documentación del repositorio
**Rama:** `…-docs-sitio-unico` · **Área:** Docs · **Revisor:** Miguel · **Spec:** SPEC-setup-unificado SE2
**Aceptación:** [ ] `CLAUDE.md`, `README.md`, `AGENTS.md` (tabla A.7), `SETUP_LOCAL.md`, `PENDIENTES_EQUIPO.md` y el README del core describen 2 proyectos; [ ] el grep del criterio 5 está limpio.
**Dependencias:** Checkpoint 3 · **Tamaño:** M (6 archivos, solo texto)

### SE-3: `DEPLOY_CPANEL.md` para un solo dominio
**Rama:** `…-deploy-sitio-unico` · **Área:** Docs/DevOps · **Revisor:** Miguel · **Spec:** SPEC-setup-unificado SE3
**Aceptación:** [ ] 2 piezas en `arca.santodomingo.cl`; [ ] sesión con cookie, no JWT; [ ] advertencia de `ALLOW_DEV_LOGIN`; [ ] un Redirect URI y un Logout URI.
**Dependencias:** Checkpoint 3 · **Tamaño:** S

### ✅ Checkpoint final
- [ ] `setup.ps1` en un clon limpio + recorrido completo (vecino, funcionario, admin, salir).
- [ ] Mapa y specs marcados como IMPLEMENTADO; `PENDIENTES_EQUIPO.md` al día (regla A.10).
- [ ] Siguiente: escribir `SPEC-control-acceso.md` (revisión de seguridad).
