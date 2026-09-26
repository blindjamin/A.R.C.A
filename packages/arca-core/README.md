# @arca/core

Paquete compartido: entidades TypeORM y el `AuthModule` que consume `apps/backend`. Nació de
la migración de separación del panel admin (2026-09-01) — antes vivía dentro de
`apps/backend/src`. Desde la unificación de los dos backends (`backend-unificado`), es
`apps/backend` el único consumidor; el panel vive en `apps/backend/src/admin/`.

## Qué contiene

```
src/
├── entities/   ← usuarios, sesiones, catálogo, solicitudes-retiro (TypeORM)
│                 ENTIDADES (index.ts) es la lista explícita que usa
│                 apps/backend/src/database/data-source.ts para las migraciones.
├── auth/       ← AuthGuard, RolesGuard, ClaveÚnica, decorators (Public, Roles, CurrentUser),
│                 AuthService y su AuthModule.
├── health/     ← HealthModule (GET /api/health, chequea la conexión a MySQL). Sin lógica
│                 propia de ningún backend — se comparte para no duplicarlo.
└── solicitudes/ ← Reglas del ciclo de vida de una solicitud (validarTransicion,
                   transicionesDisponibles, aplicarTransicion) y de su revisión
                   (validarRevision, motivos y checklist). Funciones puras, con tests.
```

## Ciclo de vida de una solicitud

Los retiros los ejecuta una empresa externa: el municipio **revisa y deriva**, no asigna
operadores. Estados (`EstadoSolicitudRetiro`): `en_revision` · `requiere_modificacion` ·
`aprobada` · `rechazada` · `derivada` · `retirada` · `no_realizada` · `cancelada`. El pago
(maqueta) va aparte, en `EstadoPagoSolicitud`: `no_aplica` · `pendiente` · `pagado`. Roles
municipales (`RolAdministrador`): `admin` y `funcionario`.

**Ningún backend asigna `estado` directamente**: se llama a `aplicarTransicion`, que valida
quién puede hacer el cambio y aplica sus efectos (congelar el monto al aprobar, fecha de
revisión, fecha de cierre). Si la transición no es válida lanza `TransicionInvalidaError`, cuyo
`motivo` indica cómo responder: `actor` → `403`; `estado` o `pago` → `400`.

La tabla completa de transiciones está en `docs/specs/SPEC-ciclo-solicitud.md` §2.1. Lo que el
núcleo no puede saber —si el vecino es dueño de la solicitud, si viene un motivo— lo valida el
endpoint que llama.

Las **decisiones de revisión** (aprobar, pedir modificación, rechazar) además pasan por
`validarRevision` (`src/solicitudes/revision-solicitud.ts`): motivo de `MotivoRevision` según la
decisión, comentario obligatorio al pedir modificación o con motivo `otro`, y lista de verificación
completa (`ITEMS_CHECKLIST_APROBACION`) para aprobar. El historial queda en `RevisionSolicitud`
y las notas internas en `NotaSolicitud`. Ver `docs/specs/SPEC-revision-solicitudes.md`.

Los lotes entregados a la empresa operadora quedan en `LoteDerivacion`, y cada solicitud guarda el
último lote en que salió (`loteDerivacionId`). Ver `docs/specs/SPEC-derivacion-excel.md`.

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

Los scripts `prebuild`/`prestart:dev` de `apps/backend` ya llaman a `build:core` solos — no
hace falta acordarse de correrlo a mano salvo que algo quede desincronizado.

## Tests

```bash
npm test
```

Son los specs de auth de HU-12/HU-13 (`auth.service`, `AuthGuard`/`RolesGuard`,
`ClaveUnicaController`/`Service`), que se movieron acá tal cual desde `apps/backend/src/auth/`, más
los de las reglas de `src/solicitudes/` (ciclo de vida y revisión).

## Decisión de arquitectura: `PERFIL_ACCESO_RESOLVER`

`AuthService` necesita resolver el perfil de acceso de un ciudadano (¿es administrador?, ¿qué
rol tiene?), pero no puede importar `UsersService` directo — esa clase vive en `apps/backend`,
y un paquete compartido no puede depender de una app específica sin invertir la dependencia
(y sin que eso rompa la compilación).

Se resuelve con un token de inyección: `AuthService` pide `PERFIL_ACCESO_RESOLVER`
(`src/auth/interfaces/perfil-acceso-resolver.interface.ts`), y la app que importa `AuthModule`
provee ese token en un módulo `@Global()` propio: `apps/backend/src/users/users.module.ts` —
`useExisting: UsersService`. Es la única implementación desde `backend-unificado`: el panel
(`apps/backend/src/admin/`) reutiliza este mismo binding, ya no tiene el suyo propio.

Si `AuthModule` deja de arrancar con un error de dependencias no resueltas, es casi seguro que
falta este binding en la app que lo está importando.
