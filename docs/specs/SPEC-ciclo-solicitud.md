# Spec: `ciclo-solicitud` — Nuevo ciclo de vida de la solicitud de retiro

> **Estado:** APROBADO (2026-09-17) — pendiente de implementación
> **Fecha:** 2026-09-17 · **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`ciclo-solicitud`](MAPA_PANEL_MUNICIPAL.md#4-módulos) · **Depende de:** —

## 1. Objetivo

Reemplazar el ciclo de vida actual de la solicitud, pensado para **asignar operadores**
(`pendiente → asignada → en_proceso → completada`), por el ciclo aprobado en el mapa. En el nuevo
ciclo el municipio **revisa** y **deriva** a una empresa externa.

Este módulo es la **base** del resto: define los estados, el campo de pago, quién puede mover
cada estado y la migración de datos. **No** incluye pantallas de revisión, Excel ni pago (son
otros módulos). Solo deja el sistema funcionando con el ciclo nuevo y sin restos del modelo de
operadores.

**Para quién:** el equipo de desarrollo (los dos backends y los dos frontends consumen estos
estados) y, de forma indirecta, funcionarios y vecinos, que verán los estados nuevos.

### Criterios de aceptación

1. `EstadoSolicitudRetiro` tiene exactamente: `en_revision`, `requiere_modificacion`, `aprobada`,
   `rechazada`, `derivada`, `retirada`, `no_realizada`, `cancelada`.
2. Existe `EstadoPagoSolicitud`: `no_aplica`, `pendiente`, `pagado`.
3. `RolAdministrador` tiene exactamente: `admin`, `funcionario`.
4. Las reglas de transición viven en **una sola función pura** de `@arca/core`, con tests. Ningún
   backend cambia `estado` sin pasar por ella.
5. Toda solicitud nueva nace en `en_revision` con `estado_pago = no_aplica`.
6. Al pasar a `aprobada` se congela `monto` con el precio del catálogo y se fija `estado_pago`
   (`pendiente` si `monto > 0`, `no_aplica` si es 0).
7. El vecino solo puede cancelar en `en_revision`, `requiere_modificacion` o `aprobada`, y nunca con pago `pagado`.
8. No queda código ni columnas de asignación de operadores: `operador_asignado_id`,
   `fecha_programada`, `GET /api/operadores`, `AsignarRetiroModal`, `OPERADORES_DEMO`.
9. La migración convierte los datos existentes sin perder filas y tiene un `down` funcional.

## 2. Diseño

### 2.1 Tabla de transiciones

`actor` es **con qué sombrero** actúa la persona, igual que en auditoría. Admin hereda todo lo del
funcionario.

| Desde | Hacia | Actor mínimo | Condición validada por el core |
|---|---|---|---|
| `en_revision` | `aprobada` | funcionario | — |
| `en_revision` | `requiere_modificacion` | funcionario | — |
| `en_revision` | `rechazada` | funcionario | — |
| `requiere_modificacion` | `en_revision` | vecino (dueño) | — |
| `aprobada` | `derivada` | funcionario | `estado_pago ∈ {no_aplica, pagado}` |
| `derivada` | `retirada` | funcionario | — |
| `derivada` | `no_realizada` | funcionario | — |
| `no_realizada` | `aprobada` | funcionario | — |
| `rechazada` | `en_revision` | **admin** | — |
| `retirada` | `en_revision` | **admin** | — |
| `en_revision` · `requiere_modificacion` · `aprobada` | `cancelada` | vecino (dueño) | `estado_pago ≠ pagado` |

Cualquier par que no esté en la tabla es inválido. El core valida **estado, actor y pago**. Lo que
dependa del contenido de la petición (motivo obligatorio, checklist) lo valida el endpoint de cada
módulo, porque esos datos todavía no existen en este módulo.

### 2.2 Efectos de cada transición (aplicados por el core)

| Hacia | Efecto |
|---|---|
| `aprobada` (desde `en_revision`) | `monto = catálogo.precio`; `estado_pago = monto > 0 ? pendiente : no_aplica` |
| `aprobada` (desde `no_realizada`) | No toca `monto` ni `estado_pago` (ya se pagó) |
| `aprobada` · `rechazada` · `requiere_modificacion` | `fecha_revision = ahora`; `revisado_por_id = administradorId` |
| `retirada` · `no_realizada` | `fecha_cierre = ahora` |
| `en_revision` (reabrir) | `fecha_cierre = null` |

### 2.3 API propuesta en `@arca/core`

```ts
// packages/arca-core/src/solicitudes/ciclo-solicitud.ts
export type ActorCiclo = 'vecino' | 'funcionario' | 'admin';

export interface ContextoTransicion {
  actor: ActorCiclo;
  estadoPago: EstadoPagoSolicitud;
}

/** Lanza TransicionInvalidaError con un mensaje legible si el cambio no está permitido. */
export function validarTransicion(
  desde: EstadoSolicitudRetiro,
  hacia: EstadoSolicitudRetiro,
  contexto: ContextoTransicion,
): void;

/** Destinos válidos desde `desde` para ese contexto. El panel los usa para decidir qué botones mostrar. */
export function transicionesDisponibles(
  desde: EstadoSolicitudRetiro,
  contexto: ContextoTransicion,
): EstadoSolicitudRetiro[];

/** Estados en que el vecino puede cancelar. */
export const ESTADOS_CANCELABLES_POR_VECINO: readonly EstadoSolicitudRetiro[];

export const ESTADOS_FINALES: readonly EstadoSolicitudRetiro[]; // rechazada, retirada, cancelada
```

Los frontends **no** son workspaces y no pueden importar `@arca/core`:
- **Panel:** no duplica la tabla. `GET /api/admin/solicitudes/:id` devuelve `transicionesDisponibles`, calculadas por el core para el usuario de la sesión.
- **PWA:** mantiene una copia local de `ESTADOS_CANCELABLES_POR_VECINO`, con un comentario que apunta al core. Es una lista corta y el backend igual valida.

`TransicionInvalidaError` es un error propio del core (sin depender de Nest). Cada backend lo
traduce a `400 Bad Request`, y a `403` si el problema es el actor.

### 2.4 Cambios de esquema (una migración en `apps/backend`)

**`solicitudes_retiro`**

| Cambio | Detalle |
|---|---|
| `estado` | ENUM nuevo, default `en_revision` |
| + `estado_pago` | `ENUM('no_aplica','pendiente','pagado') NOT NULL DEFAULT 'no_aplica'` |
| + `monto` | `INT NULL` — CLP congelado al aprobar |
| + `fecha_revision` | `TIMESTAMP NULL` — última decisión de revisión |
| + `revisado_por_id` | `VARCHAR(36) NULL`, FK → `usuarios_administradores.id` |
| `fecha_completada` → `fecha_cierre` | Renombrar: ahora cubre `retirada` y `no_realizada` |
| − `operador_asignado_id` | Quitar la FK `fk_solicitudes_operador` y la columna |
| − `fecha_programada` | Quitar |
| `razon_rechazo` | **Se mantiene** sin cambios; `revision-solicitudes` define motivos y comentarios |

**`usuarios_administradores.rol`:** `ENUM('admin','funcionario')`.

**Conversión de datos.** Primero se amplía el ENUM con los valores viejos y nuevos, luego se
actualizan las filas y al final se quitan los valores viejos (mismo patrón que
`1782164000000-remove-rol-patrocinador.ts`):

| Estado viejo | Estado nuevo |
|---|---|
| `pendiente` | `en_revision` |
| `asignada` | `aprobada` |
| `en_proceso` | `derivada` |
| `completada` | `retirada` |
| `cancelada` | `cancelada` |

`operador` → `funcionario`. Las filas convertidas quedan con `estado_pago = no_aplica` y
`monto = NULL` (datos de demo).

**`down`:** hace la conversión inversa. Es **con pérdida**: `requiere_modificacion` →
`pendiente`, `rechazada` → `cancelada`, `no_realizada` → `asignada`, y se pierden `monto`, pago y
revisor. Se documenta en el comentario de la migración.

Los seeds antiguos **no se editan** (ya corrieron). Los funcionarios de prueba A2 y A4–A6
simplemente quedan como `funcionario`.

## 3. Impacto por área y división en PRs

Por la regla A.7, cada área va en su propio PR. Como el cambio de ENUM rompe a quien lea los
valores viejos, **los PR se integran a `develop` en secuencia el mismo día**, en este orden:

| PR | Área | Archivos principales |
|---|---|---|
| **1** | Núcleo + BD (revisión de back ciudadano) | `packages/arca-core/src/entities/{estado-solicitud-retiro.enum,rol-administrador.enum,solicitud-retiro.entity}.ts`, nuevo `estado-pago-solicitud.enum.ts`, nuevo `src/solicitudes/ciclo-solicitud.ts` + `.spec.ts`, `src/index.ts`; `apps/backend/src/database/migrations/<ts>-ciclo-solicitud-revision.ts`; `ARCA_database_schema.dbml` |
| **2** | Backend ciudadano | `solicitudes-retiro.service.ts` (crear en `en_revision`, cancelar vía core, quitar `update()` y `validarOperador` sin uso, `OPERADOR`→`FUNCIONARIO`), quitar `dto/update-solicitud-retiro.dto.ts`, quitar `src/operadores/` y su registro en `app.module.ts`, borrar carpetas vacías `asignacion/`, `core/`, `workflow/` |
| **3** | Backend admin + Frontend admin | `backend-admin`: roles en los 3 controladores, `PATCH /admin/solicitudes/:id` solo acepta `{ estado }` y valida con el core, `GET /admin/solicitudes/:id` agrega `transicionesDisponibles`, `mapa-calor.service.ts` (qué cuenta como pendiente), `auditoria-admin.service.ts` (etiqueta de rol). `admin-web`: `api/admin.ts`, `components/ui/estadoMeta.ts`, `pages/Solicitudes.tsx` (filtros y botones solo con transiciones válidas), quitar `AsignarRetiroModal.tsx`, etiqueta "Funcionario" en `IDENTIDADES_DEV` |
| **4** | Frontend ciudadano | `api/arca.ts` (tipos), `components/ui/estadoMeta.ts` (etiquetas para el vecino), `pages/MisSolicitudes.tsx` (`CANCELABLES`) |

**"Pendiente" en el mapa de calor** pasa a ser: `en_revision`, `requiere_modificacion`,
`aprobada` y `derivada` (todo lo que todavía no se cierra).

**Etiquetas propuestas**

| Estado | Panel | App del vecino |
|---|---|---|
| `en_revision` | En revisión | En revisión |
| `requiere_modificacion` | Modificación pedida | Requiere cambios |
| `aprobada` | Aprobada | Aprobada |
| `rechazada` | Rechazada | Rechazada |
| `derivada` | Derivada | Retiro en coordinación |
| `retirada` | Retirada | Retirada |
| `no_realizada` | No realizada | Retiro no realizado |
| `cancelada` | Cancelada | Cancelada |

## 4. Tech stack

Sin dependencias nuevas. NestJS 11, TypeORM 1.x, MySQL, Jest (core y backends), React + Vite
(frontends).

## 5. Comandos

```bash
npm run build:core
cd packages/arca-core && npm run test
```

```bash
cd apps/backend && npm run migration:run
```

```bash
cd apps/backend && npm run migration:revert
```

```bash
cd apps/backend && npm run lint && npm run test && npm run build
```

```bash
cd apps/backend-admin && npm run lint && npm run test && npm run build
```

```bash
cd apps/admin-web && npm run lint && npm run build
```

```bash
cd apps/frontend && npm run lint && npm run build
```

## 6. Estructura

```
packages/arca-core/src/
  entities/estado-pago-solicitud.enum.ts      (nuevo)
  solicitudes/ciclo-solicitud.ts              (nuevo — reglas puras)
  solicitudes/ciclo-solicitud.spec.ts         (nuevo)
  solicitudes/index.ts                        (nuevo — reexporta)
apps/backend/src/database/migrations/
  <timestamp>-ciclo-solicitud-revision.ts     (nuevo)
```

## 7. Estilo de código

Igual al repo: comentarios en español solo para lo no obvio, `UPPER_SNAKE_CASE` en constantes y
la tabla de transiciones como **datos**, no como cadenas de `if`.

```ts
const TRANSICIONES: ReadonlyArray<{
  desde: EstadoSolicitudRetiro;
  hacia: EstadoSolicitudRetiro;
  actorMinimo: ActorCiclo;
}> = [
  { desde: EN_REVISION, hacia: APROBADA, actorMinimo: 'funcionario' },
  // ...
];
```

## 8. Estrategia de pruebas

| Nivel | Qué | Dónde |
|---|---|---|
| Unitario (obligatorio) | **Cada fila** de la tabla §2.1 permitida; un caso inválido por estado; vecino intentando acción de funcionario (403); funcionario intentando reabrir (403); derivar con pago `pendiente` (400) | `packages/arca-core/src/solicitudes/ciclo-solicitud.spec.ts` |
| Unitario | `PATCH /admin/solicitudes/:id` rechaza una transición inválida y registra auditoría en una válida | `apps/backend-admin/src/solicitudes/solicitudes-admin.service.spec.ts` (nuevo: hoy no hay tests) |
| Unitario | Crear nace en `en_revision`; cancelar en `derivada` falla | `apps/backend` (spec del service) |
| Migración (manual) | Con datos de demo: `migration:run` convierte todos los estados y roles; `migration:revert` vuelve sin errores; conteo de filas igual antes y después | MySQL local (Docker) |
| Manual | Panel y PWA muestran las etiquetas nuevas; el panel no ofrece botones de transiciones inválidas | Navegador |

## 9. Límites

- **Siempre:** pasar todo cambio de `estado` por `validarTransicion`; auditar cambios de estado,
  pago y revisor con la regla de minimización; correr los comandos de §5 antes de pedir revisión.
- **Preguntar antes:** cualquier columna o valor de ENUM fuera de §2.4; tocar áreas fuera del PR
  en curso; commit, merge o push.
- **Nunca:** editar migraciones ya ejecutadas; cambiar `estado` directo en un service sin el core;
  copiar texto libre del vecino (`razon_rechazo`, `descripcion`) a la auditoría.

## 10. Criterios de éxito verificables

- [ ] `npm run test` en `arca-core` pasa, con al menos un test por cada fila de §2.1.
- [ ] `grep -rn "operador_asignado\|operadorAsignado\|fechaProgramada\|OPERADORES_DEMO\|RolAdministrador.OPERADOR" apps packages` (sin `node_modules`, `dist` ni migraciones antiguas) no devuelve resultados.
- [ ] `migration:run` y `migration:revert` corren sin errores sobre la base de demo.
- [ ] Lint y build de los 5 proyectos pasan.
- [ ] En el panel, una solicitud `en_revision` solo ofrece Aprobar, Pedir modificación y Rechazar.
- [ ] En la PWA, el botón Cancelar aparece solo en los estados de §2.1.

## 11. Decisiones (antes preguntas abiertas)

| # | Decisión | Fecha |
|---|---|---|
| 1 | El vecino **no** puede cancelar una solicitud con pago `pagado` | 2026-09-17 |
| 2 | Una solicitud `cancelada` **no** se puede reabrir | 2026-09-17 |
| 3 | PR 2 (backend ciudadano) lo implementa **Miguel o Javier**; PR 4 (PWA) lo implementa **Ana o Maxi**. PR 1 y PR 3, Benjamín | 2026-09-17 |
| 4 | Cada rama se nombra al crearla, con el patrón `fecha-persona-descripcion` | 2026-09-17 |
