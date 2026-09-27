# Spec: `sesion-unica` — Sesión de ARCA después de ClaveÚnica

> **Estado:** IMPLEMENTADO (SU-1..SU-4, 2026-09-27) · **Fecha:** 2026-09-26
> Falta solo probar el callback contra ClaveÚnica real (credenciales de sandbox y dominio público).
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`sesion-unica`](MAPA_UNIFICACION.md#3-módulos) · **Depende de:** — · **HU:** HU-12, HU-13

## 1. Objetivo

Cerrar el flujo de ClaveÚnica: después de validar la identidad, **emitir una sesión de ARCA** que
sirva para vecinos, funcionarios y admins por igual, y reemplazar la identidad de desarrollo
(`Authorization: Bearer <uuid>`), con la que cualquiera se hace pasar por otro conociendo un UUID.

Decisiones del mapa: sesión en servidor con cookie (decisión 1); vecino 7 días, municipal 8 horas y
30 minutos sin actividad (decisión 2).

### Criterios de aceptación

1. El callback de ClaveÚnica crea o encuentra al ciudadano por `clave_unica_id` (el HMAC que ya
   deriva `normalizarIdentidad`), crea la sesión, deja la cookie y redirige a `/`. Ya no responde 501.
2. La cookie `arca_sesion` es `HttpOnly`, `SameSite=Lax`, `Path=/api` y `Secure` con
   `NODE_ENV=production`. Su valor nunca aparece en la base ni en los logs.
3. `GET /api/sesion` devuelve `{ ciudadanoId, nombre, rol, devLogin }` con
   `rol ∈ vecino | funcionario | admin`, o 401 sin sesión válida.
4. Una sesión deja de valer (401) cuando pasa cualquiera de estas cosas:
   - está revocada;
   - el secreto no coincide;
   - se cumplió su duración: 7 días desde el inicio para el vecino y 8 horas para funcionario o admin;
   - pasó su `fecha_expiracion` (sesión 2b);
   - el ciudadano está desactivado; en ese caso además se revoca (sesión 2b);
   - si es de rol municipal, lleva más de 30 minutos sin actividad.
5. `GET /api/auth/clave-unica/logout` revoca la sesión (`activa = false`), borra la cookie y
   redirige al logout de ClaveÚnica. `POST /api/auth/logout` hace lo mismo sin redirigir (204): es
   para el login de desarrollo.
6. El login de desarrollo (`POST /api/auth/dev/login { ciudadanoId }`) existe solo con
   `ALLOW_DEV_LOGIN=true`. Si además `NODE_ENV=production`, **la app no arranca**.
7. Cada inicio de sesión se audita como `LOGIN`: actor, origen (`clave_unica` o `dev`), IP y
   user-agent. Nunca el RUN, el nombre ni la cookie.
8. `AuthUser` mantiene su forma: ningún controlador ni servicio existente cambia.
9. ~~**Transición:** el `Bearer <uuid>` sigue aceptándose **solo** con `ALLOW_DEV_LOGIN=true`, hasta que
   `frontend-unificado` pase a la cookie.~~ Eliminado en SU4 (§6): el `Bearer` da 401 siempre.

## 2. Diseño

### 2.1 Sin migraciones

Se usa lo que ya existe en `sesiones_ciudadano`:

| Necesidad | Columna existente |
|---|---|
| Id de la sesión | `session_id` (UUID, PK) |
| Hash del secreto | `jwt_token_hash`: guarda `sha256(secreto)` en hex. El nombre es heredado; renombrarlo queda para cuando haya una migración que lo justifique |
| Nombre para saludar | `nombre_sesion` / `apellido_sesion` (de ClaveÚnica; `null` en el login de desarrollo) |
| Duración | `fecha_inicio`, `fecha_expiracion` |
| Última actividad | `updated_at` (se actualiza como mucho 1 vez por minuto) |
| Revocación | `activa` |
| Trazabilidad | `ip_sesion`, `user_agent` |

**Todos** inician sesión en `sesiones_ciudadano`, porque todo funcionario es primero ciudadano
(`usuarios_administradores.usuario_ciudadano_id`). `sesiones_administrador` queda sin uso: se evalúa
eliminarla en `control-acceso`.

### 2.2 La cookie

```
arca_sesion = <session_id>.<secreto>
secreto     = randomBytes(32) en hex
en la base  = sha256(secreto) en hex
```

Al validar se busca por PK (`session_id`), sin índice nuevo. Después se compara `sha256(secreto)` con
`jwt_token_hash` usando `timingSafeEqual`. Quien obtenga un volcado de la base no puede armar una
cookie válida.

### 2.3 Validación en cada petición

`AuthGuard` (global, en `@arca/core`) cambia su fuente de identidad:

```
cookie arca_sesion ─► SesionService.validar() ─► AuthUser   (misma forma que hoy)
```

Desde SU4, el header `Authorization` se ignora aunque `ALLOW_DEV_LOGIN=true`.

`SesionService.validar(valorCookie)`:
1. Separa `session_id` y secreto. Si el formato es inválido → `null`.
2. Busca la fila con `activa = true`. Si no existe → `null`.
3. Compara el hash en tiempo constante. Si no coincide → `null`.
4. Si `ahora > fecha_expiracion` → `null` (sesión 2b).
5. Si el ciudadano no existe o está desactivado → marca `activa = false` → `null` (sesión 2b).
6. Resuelve el perfil (`PERFIL_ACCESO_RESOLVER`). Límite: 8 horas si es municipal y 7 días si no,
   contado desde `fecha_inicio`. Si se pasó del límite → `null`.
7. Si es municipal y `ahora − updated_at > 30 min` → marca `activa = false` → `null`.
8. Si `ahora − updated_at > 60 s` → actualiza `updated_at`.
9. Devuelve `AuthUser`.

Al iniciar sesión (callback de ClaveÚnica o login de desarrollo), la `arca_sesion` que ya traía el
navegador se revoca antes de emitir la nueva (sesión 2b).

`null` → `UnauthorizedException` con un mensaje único, que no dice por qué falló.

El límite se calcula con el rol **actual**, no con el que tenía al iniciar: si a un vecino lo hacen
funcionario, su sesión pasa a durar 8 horas desde ese momento.

### 2.4 Endpoints

| Método | Ruta | Público | Qué hace |
|---|---|:-:|---|
| `GET` | `/api/auth/clave-unica/login` | ✓ | Sin cambios |
| `GET` | `/api/auth/clave-unica/callback` | ✓ | Valida (como hoy) → upsert de `usuarios_ciudadanos` (`fecha_ultima_actividad`) → crea sesión → cookie → audita `LOGIN` → `302 /` |
| `GET` | `/api/auth/clave-unica/logout` | ✓ | Revoca la sesión actual si hay cookie → borra la cookie → `302` al logout de ClaveÚnica |
| `POST` | `/api/auth/logout` | ✓ | Revoca y borra la cookie → `204` |
| `POST` | `/api/auth/dev/login` | ✓ | Solo con `ALLOW_DEV_LOGIN=true` (si no, 404). Body `{ ciudadanoId }` (UUID existente) → crea sesión → `204` |
| `GET` | `/api/sesion` | — | `{ ciudadanoId, nombre, rol, devLogin }` |

`nombre`: el de `usuarios_administradores` si es municipal; si no, `nombre_sesion`; si no hay, `null`.
`devLogin`: el valor de `ALLOW_DEV_LOGIN`. Con él, el front decide si "Salir" navega al logout de
ClaveÚnica o llama a `POST /api/auth/logout`.

### 2.5 Dónde vive el código

SU-1 se escribe en `packages/arca-core/src/auth/` (en paralelo con `backend-unificado`); CORE-1 mueve
el núcleo a `apps/backend/src/core/` y desde SU-2 todo se escribe en `apps/backend/src/core/auth/`
(decisión 4 del mapa):

- `sesion.service.ts`: crear, validar y revocar. Usa los repositorios de `SesionCiudadano` y
  `UsuarioCiudadano` (se agregan con `TypeOrmModule.forFeature` en `AuthModule`).
- `sesion.controller.ts`: `GET /sesion`, `POST /auth/logout` y `POST /auth/dev/login`.
- `cookies.ts`: `leerCookie` (se mueve desde `clave-unica.controller.ts`) y las opciones de
  `arca_sesion`, en un solo lugar para que crear y borrar usen los mismos atributos.
- `login-dev.ts`: `verificarLoginDev(env)`. Lanza si `ALLOW_DEV_LOGIN=true` y
  `NODE_ENV=production`. Se llama en `main.ts` antes de `listen`.

Sin dependencias nuevas: `node:crypto` y lo que ya usa `AuthModule`.

### 2.6 Fuera de alcance (va a `control-acceso`)

Chequeo de `Origin` en métodos que modifican datos (hoy cubre `SameSite=Lax`), límite de intentos,
cabeceras de seguridad, limpieza periódica de sesiones vencidas, eliminar `sesiones_administrador`
y `GET /usuarios/:id/perfil-acceso`.

## 3. Comandos

```bash
npm run build:core
cd packages/arca-core && npm run test
cd apps/backend && npm run lint && npm run test && npm run build
```

Manual (con `ALLOW_DEV_LOGIN=true` en `apps/backend/.env.local`):

```bash
curl -s -c j.txt -X POST localhost:3000/api/auth/dev/login -H "Content-Type: application/json" -d '{"ciudadanoId":"00000000-0000-4000-8000-000000000002"}'
curl -s -b j.txt localhost:3000/api/sesion                        # rol funcionario
curl -s -b j.txt -o /dev/null -w "%{http_code}\n" localhost:3000/api/admin/metricas?dias=7   # 200
curl -s -b j.txt -X POST localhost:3000/api/auth/logout
curl -s -b j.txt -o /dev/null -w "%{http_code}\n" localhost:3000/api/sesion                  # 401
NODE_ENV=production ALLOW_DEV_LOGIN=true node dist/main          # no arranca
```

El callback real con ClaveÚnica se prueba cuando estén las credenciales de sandbox y un dominio
público (el manual prohíbe `localhost`).

## 4. Pruebas

Unitarias en `packages/arca-core` (`sesion.service.spec.ts`, `login-dev.spec.ts`), con repositorios
simulados:

- `crear` guarda el hash y no el secreto; la cookie tiene el formato `uuid.hex64`.
- `validar`: cookie válida → `AuthUser`. Devuelve `null` con secreto incorrecto, formato inválido,
  sesión revocada, vecino a los 7 días + 1 s, funcionario a las 8 horas + 1 s, o funcionario con
  31 minutos sin actividad (y en este caso marca `activa = false`).
- `validar`: un vecino con 31 minutos sin actividad **sigue** válido.
- `verificarLoginDev`: lanza con producción + dev; no lanza en los otros tres casos.

## 5. Límites

- **Siempre:** comparar secretos en tiempo constante; mensajes 401 genéricos.
- **Preguntar antes:** cualquier migración (no debería hacer falta) y cualquier dependencia nueva.
- **Nunca:** poner identidad o cookie en la URL; registrar el RUN, la cookie ni el secreto; aceptar
  `Bearer` si `ALLOW_DEV_LOGIN` no es `true`.

## 6. Tareas

- [x] **SU1 — `SesionService` y cookie.** `sesion.service.ts`, `cookies.ts`, `login-dev.ts` con sus tests. Aún no se conecta al guard.
  - Verify: `npm run test` en `packages/arca-core`.
- [x] **SU2 — Guard y endpoints de sesión.** `AuthGuard` lee la cookie (Bearer solo con dev); `sesion.controller.ts`; `verificarLoginDev` en `main.ts`; `ALLOW_DEV_LOGIN` en `.env.example`.
  - Verify: los curl de §3; los tests del backend siguen verdes.
- [x] **SU3 — Callback y logout de ClaveÚnica.** (PR #66) Upsert del ciudadano, sesión, cookie, auditoría `LOGIN`, `302 /`; el logout revoca la sesión.
  - Verify: test del controlador con `ClaveUnicaService` simulado (callback → cookie + 302; logout → revoca).
- [x] **SU4 — Quitar el Bearer de desarrollo** (después de FU2 en `frontend-unificado`). Borrar `resolveFromAuthorizationHeader` y la rama Bearer del guard.
  - Verify: `grep -rn "Bearer" apps/backend/src` solo deja la llamada saliente a ClaveÚnica (`clave-unica.service.ts`); los curl con `Authorization` dan 401, también con `ALLOW_DEV_LOGIN=true`.

## 7. Preguntas abiertas

Ninguna que bloquee. Las credenciales de sandbox de ClaveÚnica solo bloquean la prueba del callback
real, no la implementación.
