# @arca/core

Paquete compartido entre `apps/backend` y `apps/backend-admin`: entidades TypeORM y el
`AuthModule` que ambos importan. Nació de la migración de separación del panel admin
(2026-09-01) — antes vivía dentro de `apps/backend/src`.

## Qué contiene

```
src/
├── entities/   ← usuarios, sesiones, catálogo, solicitudes-retiro (TypeORM)
│                 ENTIDADES (index.ts) es la lista explícita que usa
│                 apps/backend/src/database/data-source.ts para las migraciones.
├── auth/       ← AuthGuard, RolesGuard, ClaveÚnica, decorators (Public, Roles, CurrentUser),
│                 AuthService y su AuthModule.
└── health/     ← HealthModule (GET /api/health, chequea la conexión a MySQL). Sin lógica
                  propia de ningún backend — se comparte para no duplicarlo.
```

## Regla para tocar este paquete

**Cambia solo por PR revisado por alguien de backend ciudadano** (Miguel o Javier) — es código
de HU-12/HU-13 y lo consumen dos apps a la vez. No se mete un cambio acá en la misma rama que
otra cosa; ver regla A.7 de `AGENTS.md`.

## Cómo se construye

No es un paquete publicado: los backends lo consumen compilado desde `dist/`.

```bash
npm run build:core          # una vez, desde la raíz del repo
npm run build:watch -w @arca/core   # en otra terminal, mientras se itera
```

Los scripts `prebuild`/`prestart:dev` de `apps/backend` y `apps/backend-admin` ya llaman a
`build:core` solos — no hace falta acordarse de correrlo a mano salvo que algo quede
desincronizado.

## Tests

```bash
npm test
```

Son los specs de auth de HU-12/HU-13 (`auth.service`, `AuthGuard`/`RolesGuard`,
`ClaveUnicaController`/`Service`) — se movieron acá tal cual desde `apps/backend/src/auth/`.

## Decisión de arquitectura: `PERFIL_ACCESO_RESOLVER`

`AuthService` necesita resolver el perfil de acceso de un ciudadano (¿es administrador?, ¿qué
rol tiene?), pero no puede importar `UsersService` directo — esa clase vive en `apps/backend`,
y un paquete compartido no puede depender de una app específica sin invertir la dependencia
(y sin que eso rompa la compilación).

Se resuelve con un token de inyección: `AuthService` pide `PERFIL_ACCESO_RESOLVER`
(`src/auth/interfaces/perfil-acceso-resolver.interface.ts`), y cada app que importa
`AuthModule` provee ese token en algún módulo `@Global()` propio:

- `apps/backend/src/users/users.module.ts` — `useExisting: UsersService`.
- `apps/backend-admin/src/identity/identity.module.ts` — su propio `IdentityService`,
  duplicado de la misma lógica (ver deuda declarada en `apps/backend-admin/README.md`).

Si `AuthModule` deja de arrancar con un error de dependencias no resueltas, es casi seguro que
falta este binding en la app que lo está importando.

## Deuda declarada

- **Duplicación de `getPerfilAcceso`:** la lógica vive una vez en
  `apps/backend/src/users/users.service.ts` (fuente de verdad) y otra vez en
  `apps/backend-admin/src/identity/identity.service.ts`. Si cambia el criterio de qué hace
  administrador a alguien, hay que cambiarlo en los dos lugares.
