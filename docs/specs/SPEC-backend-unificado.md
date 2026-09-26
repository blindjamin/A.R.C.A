# Spec: `backend-unificado` — Un solo backend

> **Estado:** BORRADOR · **Fecha:** 2026-09-26
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`backend-unificado`](MAPA_UNIFICACION.md#3-módulos) · **Depende de:** —

> **Requisito previo (✅ cumplido 2026-09-26, PR #52):** integrada la rama `2026-09-25-miguel-seguridad-rate-limit`, que modifica
> `apps/backend-admin/src/{app.module,main}.ts`. El movimiento incluye su `SeguridadModule`, importado
> **una sola vez** y antes de `AuthModule` (su comentario explica por qué).

## 1. Objetivo

Que `apps/backend` atienda **toda** la API: la del vecino y la del panel (`/api/admin/*`), en un
solo proceso en el puerto 3000. `apps/backend-admin` desaparece.

Es un **movimiento, no una reescritura**: ningún endpoint cambia de ruta, de contrato ni de
permisos. Lo que cambie de comportamiento no va en este PR.

### Criterios de aceptación

1. Todos los endpoints de la tabla de `apps/backend-admin/README.md` responden en `:3000` con la misma
   ruta, el mismo cuerpo y los mismos códigos que hoy en `:3001`.
2. Los endpoints del vecino (`/api/solicitudes-retiro`, `/api/residuos/catalogo`, `/api/usuarios/...`,
   `/api/auth/clave-unica/*`, `/api/health`) no cambian.
3. Los 10 archivos `*.spec.ts` (5 del backend ciudadano, incluidos marketplace y rate limiting, y 5 del
   panel) pasan en `apps/backend`.
4. `apps/backend-admin/` no existe, y no aparece en `workspaces` ni en los scripts del `package.json`
   raíz.
5. Existe **una sola** implementación de `PERFIL_ACCESO_RESOLVER` (`UsersService`).
   `IdentityService` se elimina: hoy es una copia idéntica (verificado el 2026-09-26).
6. `npm run lint && npm run test && npm run build` en verde en `apps/backend`.
7. El panel (`apps/admin-web`, mientras exista) sigue funcionando apuntando a `:3000`.

## 2. Diseño

### 2.1 Estructura

```
apps/backend/src/
├── admin/                    ← nuevo: todo lo que era apps/backend-admin/src
│   ├── auditoria/            (sin cambios internos)
│   ├── derivaciones/
│   ├── mapa-calor/
│   ├── metricas/
│   ├── residuos/
│   └── solicitudes/
├── database/                 (sin cambios: sigue siendo el dueño del esquema)
├── residuos/                 (vecino, sin cambios)
├── solicitudes-retiro/       (vecino, sin cambios)
├── users/                    (vecino; su UsersService pasa a ser el único resolver)
├── app.module.ts
└── main.ts
```

Una carpeta `admin/` deja a la vista qué es del panel. Es la frontera que revisará `control-acceso`.
Los nombres de archivo y de clase (`*-admin.*`) no cambian: renombrar en el mismo PR vuelve
imposible revisar el movimiento.

**No se mueven** a `apps/backend`: `app.controller.ts`/`app.service.ts` del panel (duplicados del
ciudadano), `identity/` (reemplazado por `UsersModule`) ni `.env.example` (queda el del ciudadano).

### 2.2 `app.module.ts`

- Importa además `SolicitudesAdminModule`, `MapaCalorModule`, `AuditoriaAdminModule`,
  `ResiduosAdminModule`, `DerivacionesAdminModule` y `MetricasAdminModule` desde `./admin/...`.
- TypeORM pasa de `autoLoadEntities: true` a `entities: ENTIDADES` (de `@arca/core`). El panel ya lo
  usa, y su comentario explica por qué `autoLoadEntities` revienta cuando algún módulo no registra
  todas las entidades relacionadas.

### 2.3 `main.ts`

Se unifican las diferencias:

| Opción | Ciudadano hoy | Panel hoy | Unificado |
|---|---|---|---|
| Puerto | 3000 | 3001 | **3000** |
| `forbidNonWhitelisted` | no | sí | **sí**: la PWA solo envía campos declarados en los DTO (verificado en `CrearSolicitudInput` y en cancelar) |
| CORS `FRONTEND_URL` | `:5173` | `:5174` | `:5173,:5174` mientras exista `admin-web`; en la práctica los dos front entran por el proxy de Vite (mismo origen) |

### 2.4 Dependencias

- Si la rama de rate limiting quedó integrada, `@nestjs/throttler` ya está en `@arca/core`; no se duplica.

- `exceljs` pasa a `apps/backend/package.json`. Ya está autorizada (decisión 3 del mapa del panel);
  no es una dependencia nueva del proyecto.
- `package.json` raíz: sale `apps/backend-admin` de `workspaces` y sale el script
  `dev:backend-admin`. Se regenera `package-lock.json` con `npm install` en la raíz.

### 2.5 PR acompañantes (otra área, regla A.7)

Para que nada quede roto entre la integración de este módulo y la de `frontend-unificado`:

| PR | Área | Cambio |
|---|---|---|
| Proxy del panel | Frontend | `apps/admin-web/vite.config.ts`: `target` `http://localhost:3001` → `http://localhost:3000` (una línea) |
| Setup | DevOps | `setup.ps1`: quitar `.env.local`, arranque, `Stop-PortOwner 3001` y health check de `backend-admin` |

Se integran **junto** con este PR. La reescritura completa de la documentación de setup y despliegue
es de `setup-unificado`.

## 3. Comandos

```bash
npm install                      # raíz: workspaces
npm run build:core
cd apps/backend
npm run lint
npm run test                     # los 10 spec
npm run build
npm run start:dev                # :3000
```

Verificación manual (con `docker compose up -d` y migraciones corridas):

```bash
curl -s localhost:3000/api/health
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/admin/solicitudes   # 401 sin Bearer
curl -s -H "Authorization: Bearer <uuid funcionario demo>" localhost:3000/api/admin/metricas?dias=7
curl -s -H "Authorization: Bearer <uuid vecino demo>" -o /dev/null -w "%{http_code}\n" localhost:3000/api/admin/solicitudes   # 403
```

Y en el navegador: flujo de retiro en la PWA (`:5173`), y en el panel (`:5174`) Solicitudes →
revisar una, Derivación → generar y descargar el Excel, Métricas y Mapa de calor.

## 4. Pruebas

- Los 10 spec existentes se mueven con su módulo y **no se editan**, salvo rutas de import si cambian.
  Si un test necesita cambiar su lógica para pasar, es señal de que el movimiento cambió
  comportamiento: parar y revisar.
- No se agregan tests nuevos en este módulo. Los de permisos por ruta los trae `control-acceso`.

## 5. Límites

- **Siempre:** `git mv` para mover archivos, así el historial y el diff del PR muestran movimientos y
  no archivos nuevos.
- **Preguntar antes:** cualquier cambio en `packages/arca-core` (no debería hacer falta).
- **Nunca:** cambiar rutas, DTOs, guards o respuestas en este PR; tocar migraciones.

## 6. Tareas

- [ ] **T1 — Mover módulos del panel.** `git mv apps/backend-admin/src/{auditoria,derivaciones,mapa-calor,metricas,residuos,solicitudes} apps/backend/src/admin/`; ajustar imports relativos.
  - Verify: `npm run build` en `apps/backend`.
- [ ] **T2 — Cablear `app.module.ts` y `main.ts`** según §2.2 y §2.3. Borrar `identity/`.
  - Verify: `npm run start:dev` arranca; curl de §3 responde 200/401/403 como se espera.
- [ ] **T3 — Dependencias y workspace.** `exceljs` a `apps/backend`; quitar `apps/backend-admin` de la raíz; borrar la carpeta; `npm install`.
  - Verify: `npm run lint && npm run test && npm run build` en `apps/backend`; los 10 spec en verde.
- [ ] **T4 — Documentación del backend.** Fusionar la tabla de endpoints de `backend-admin/README.md` en `apps/backend/README.md`; quitar la deuda de `IdentityService` en `packages/arca-core/README.md`; en `PENDIENTES_EQUIPO.md` y en las specs del panel, cambiar las rutas `apps/backend-admin/src/...` a `apps/backend/src/admin/...`.
  - Verify: `grep -rn "backend-admin" --include=*.md . | grep -v node_modules` solo deja menciones históricas o de `setup-unificado`.
- [ ] **T5 — PR acompañantes** (§2.5), abiertos antes de pedir revisión de este.
  - Verify: prueba manual en el navegador (§3).

## 7. Preguntas abiertas

Ninguna que bloquee.
