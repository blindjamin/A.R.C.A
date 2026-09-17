# Tareas: `ciclo-solicitud`

> Plan: [tasks/plan.md](plan.md) · Spec: [docs/specs/SPEC-ciclo-solicitud.md](../docs/specs/SPEC-ciclo-solicitud.md)
> Antes de cada commit: mostrar cambios y esperar visto bueno (regla A.9). Trailers `IA:`, `HU:` y `Revisor:` obligatorios.

---

# Fase 1 — Núcleo + BD (PR 1)

## T1: Enums y entidad `SolicitudRetiro` nuevos en el core

**Descripción:** Definir en `@arca/core` los tipos del ciclo nuevo: `EstadoSolicitudRetiro` con
los 8 estados, `EstadoPagoSolicitud` nuevo, `RolAdministrador` con `admin` y `funcionario`, y
columnas de `SolicitudRetiro` según el spec §2.4:
- Agregar `estadoPago`, `monto`, `fechaRevision`, `revisadoPorId` y la relación `revisadoPor`.
- Renombrar `fechaCompletada` → `fechaCierre`.
- Quitar `operadorAsignadoId`, `operadorAsignado` y `fechaProgramada`.

**Criterios de aceptación:**
- [ ] Los 3 enums tienen exactamente los valores del spec §1.
- [ ] La entidad refleja §2.4, con `estado` por defecto `en_revision` y `estadoPago` por defecto `no_aplica`.
- [ ] `EstadoPagoSolicitud` se exporta desde `entities/index.ts`.

**Verificación:**
- [ ] `npm run build:core` compila.

**Dependencias:** ninguna

**Archivos:**
- `packages/arca-core/src/entities/estado-solicitud-retiro.enum.ts`
- `packages/arca-core/src/entities/estado-pago-solicitud.enum.ts` (nuevo)
- `packages/arca-core/src/entities/rol-administrador.enum.ts`
- `packages/arca-core/src/entities/solicitud-retiro.entity.ts`
- `packages/arca-core/src/entities/index.ts`

**Tamaño:** M

---

## T2: Migración de estados, pago y rol + DBML

**Descripción:** Crear la migración que lleva la base al esquema de T1 y convierte los datos
existentes (tabla de conversión del spec §2.4), con un `down` funcional y documentado como con
pérdida. Actualizar `ARCA_database_schema.dbml`.

**Criterios de aceptación:**
- [ ] `up` hace: ampliar los ENUM con valores viejos y nuevos → `UPDATE` de estados y roles → verificar que no queden valores viejos → reducir los ENUM.
- [ ] `up` borra la FK del operador leyendo su nombre desde `information_schema`, y después borra `operador_asignado_id` y `fecha_programada`; renombra `fecha_completada` → `fecha_cierre`; agrega `estado_pago`, `monto`, `fecha_revision` y `revisado_por_id` (con FK).
- [ ] `down` revierte el esquema y convierte los estados con la tabla inversa del spec.

**Verificación:**
- [ ] Con MySQL de Docker y datos de demo: `cd apps/backend && npm run migration:run` sin errores.
- [ ] `SELECT estado, COUNT(*) FROM solicitudes_retiro GROUP BY estado` antes y después: mismo total, solo valores nuevos.
- [ ] `npm run migration:revert` y luego `npm run migration:run` de nuevo, sin errores.

**Dependencias:** T1

**Archivos:**
- `apps/backend/src/database/migrations/<timestamp>-ciclo-solicitud-revision.ts` (nuevo)
- `ARCA_database_schema.dbml`

**Tamaño:** M · **Riesgo:** alto (hacerla temprano)

---

## T3: Actualizar tests existentes del core al rol `funcionario`

**Descripción:** Los tests actuales del core usan `RolAdministrador.OPERADOR`, `'operador'` y el
estado `'asignada'`. Pasarlos a `FUNCIONARIO`, `'funcionario'` y `'aprobada'` sin cambiar lo que
prueban.

**Criterios de aceptación:**
- [ ] Ningún test del core menciona `OPERADOR`, `'operador'` ni `'asignada'`.
- [ ] Los tests cubren los mismos casos que antes.

**Verificación:**
- [ ] `cd packages/arca-core && npm run test` en verde.

**Dependencias:** T1

**Archivos:**
- `packages/arca-core/src/auth/auth.service.spec.ts`
- `packages/arca-core/src/auth/guards/auth.guard.spec.ts`
- `packages/arca-core/src/auditoria/auditoria.service.spec.ts`

**Tamaño:** S

---

## T4: `validarTransicion` y `transicionesDisponibles` con tests

**Descripción:** Implementar la tabla de transiciones del spec §2.1 como datos, y las funciones
puras `validarTransicion`, `transicionesDisponibles`, `ESTADOS_CANCELABLES_POR_VECINO`,
`ESTADOS_FINALES` y `TransicionInvalidaError`, que indica si el problema es de **estado** o de
**actor**. Escribir los tests primero.

**Criterios de aceptación:**
- [ ] Hay un test por **cada fila** permitida de §2.1 y al menos un caso inválido por estado.
- [ ] Hay casos de actor: vecino intentando aprobar, funcionario intentando reabrir, y admin reabriendo `rechazada` y `retirada`.
- [ ] Derivar con pago `pendiente` falla y con `no_aplica` o `pagado` pasa.
- [ ] Cancelar con pago `pagado` falla; reabrir `cancelada` falla para cualquier actor.
- [ ] Todo se exporta desde `@arca/core`.

**Verificación:**
- [ ] `cd packages/arca-core && npm run test` en verde.
- [ ] `npm run build:core` compila.

**Dependencias:** T1

**Archivos:**
- `packages/arca-core/src/solicitudes/ciclo-solicitud.ts` (nuevo)
- `packages/arca-core/src/solicitudes/ciclo-solicitud.spec.ts` (nuevo)
- `packages/arca-core/src/solicitudes/index.ts` (nuevo)
- `packages/arca-core/src/index.ts`

**Tamaño:** M

---

## T5: `aplicarTransicion` (efectos) con tests

**Descripción:** Función que valida con `validarTransicion` y aplica a la entidad los efectos del
spec §2.2: congelar `monto` y fijar `estadoPago` al aprobar desde `en_revision`, fijar
`fechaRevision` y `revisadoPorId` al decidir, fijar `fechaCierre` al cerrar y limpiarla al
reabrir. Recibe `ahora` como parámetro para que sea testeable.

**Criterios de aceptación:**
- [ ] Aprobar con precio > 0 → `estadoPago = pendiente` y `monto = precio`; con precio 0 → `no_aplica`.
- [ ] Volver de `no_realizada` a `aprobada` no toca `monto` ni `estadoPago`.
- [ ] Si la transición es inválida, la entidad no se modifica.

**Verificación:**
- [ ] `cd packages/arca-core && npm run test` en verde.

**Dependencias:** T4

**Archivos:**
- `packages/arca-core/src/solicitudes/ciclo-solicitud.ts`
- `packages/arca-core/src/solicitudes/ciclo-solicitud.spec.ts`

**Tamaño:** S

---

## ✅ Checkpoint 1 — Núcleo + BD
- [ ] `npm run build:core` y `cd packages/arca-core && npm run test` en verde
- [ ] Migración: `run` → `revert` → `run` limpia sobre datos de demo
- [ ] Revisión humana; PR 1 abierto y asignado a alguien de back ciudadano (regla A.7)

---

# Fase 2 — Backend ciudadano (PR 2 — implementa Miguel o Javier)

## T6: Crear y cancelar solicitudes con el ciclo nuevo

**Descripción:** En `SolicitudesRetiroService`:
- `create` deja la solicitud en `en_revision`.
- `cancelarPorCiudadano` usa `aplicarTransicion` con actor `vecino` y traduce `TransicionInvalidaError` a 400 o 403.
- Se borran `update()`, `aplicarCambioEstado`, `validarOperador` y `UpdateSolicitudRetiroDto`, que no tienen uso.
- `tieneAccesoLecturaMunicipal` usa `FUNCIONARIO`.
- Se quita `operadorAsignado` del `findOne`.

**Criterios de aceptación:**
- [ ] Crear responde con `estado: en_revision`.
- [ ] Cancelar en `derivada` responde 400; cancelar la solicitud de otro vecino responde 403.
- [ ] La auditoría de crear y cancelar sigue registrando solo el `estado`.

**Verificación:**
- [ ] Nuevo `solicitudes-retiro.service.spec.ts` con los casos anteriores.
- [ ] `cd apps/backend && npm run lint && npm run test && npm run build`

**Dependencias:** T5

**Archivos:**
- `apps/backend/src/solicitudes-retiro/solicitudes-retiro.service.ts`
- `apps/backend/src/solicitudes-retiro/solicitudes-retiro.service.spec.ts` (nuevo)
- `apps/backend/src/solicitudes-retiro/dto/update-solicitud-retiro.dto.ts` (borrar)
- `apps/backend/src/solicitudes-retiro/solicitudes-retiro.controller.ts` (quitar el comentario del PATCH movido)

**Tamaño:** M

---

## T7: Eliminar el módulo de operadores

**Descripción:** Borrar `GET /api/operadores` y su módulo, sacarlo de `app.module.ts` y borrar
las carpetas vacías `asignacion/`, `core/` y `workflow/` de `solicitudes-retiro`.

**Criterios de aceptación:**
- [ ] No existe `apps/backend/src/operadores/`.
- [ ] `GET /api/operadores` responde 404.

**Verificación:**
- [ ] `cd apps/backend && npm run lint && npm run test && npm run build`
- [ ] Manual: levantar backend y `curl` a `/api/operadores` → 404; `/api/health` → 200.

**Dependencias:** T6

**Archivos:**
- `apps/backend/src/operadores/` (4 archivos, borrar)
- `apps/backend/src/app.module.ts`

**Tamaño:** S

---

## ✅ Checkpoint 2 — Backend ciudadano
- [ ] `cd apps/backend && npm run lint && npm run test && npm run build` en verde
- [ ] Manual: crear una solicitud desde la API con el token de demo → `en_revision`
- [ ] Revisión humana; PR 2 abierto (revisan Miguel o Javier)

---

# Fase 3 — Panel admin (PR 3)

## T8: Rol `funcionario` en backend-admin

**Descripción:** Reemplazar `RolAdministrador.OPERADOR` por `FUNCIONARIO` en los controladores y
en `ETIQUETA_ROL` de la auditoría (etiqueta "Funcionario").

**Criterios de aceptación:**
- [ ] `grep -rn "OPERADOR" apps/backend-admin/src` no devuelve resultados.
- [ ] El funcionario de demo (UUID `...0002`) accede a solicitudes y al mapa, y recibe 403 en auditoría.

**Verificación:**
- [ ] `cd apps/backend-admin && npm run lint && npm run build`

**Dependencias:** T1 (y PR 1 integrado)

**Archivos:**
- `apps/backend-admin/src/solicitudes/solicitudes-admin.controller.ts`
- `apps/backend-admin/src/mapa-calor/mapa-calor.controller.ts`
- `apps/backend-admin/src/auditoria/auditoria-admin.service.ts`

**Tamaño:** S

---

## T9: `PATCH /admin/solicitudes/:id` validado por el core

**Descripción:** El DTO solo acepta `estado`:
- El service carga la solicitud con `residuoCatalogo`, arma el actor (`admin` o `funcionario` según `user.rol`), aplica `aplicarTransicion` y traduce `TransicionInvalidaError` a 400 o 403.
- `CAMPOS_AUDITADOS` pasa a `estado`, `estadoPago`, `monto`, `revisadoPorId` y `fechaCierre`.
- Se borran `validarOperador` y el repositorio de `UsuarioAdministrador` si queda sin uso.

**Criterios de aceptación:**
- [ ] Un body con `operadorAsignadoId` o `fechaProgramada` responde 400 (`whitelist` + `forbidNonWhitelisted`, o validación explícita).
- [ ] `en_revision` → `aprobada` responde 200, guarda `monto` y `estadoPago`, y deja una fila de auditoría.
- [ ] Un funcionario que reabre `rechazada` recibe 403; un admin, 200.

**Verificación:**
- [ ] Nuevo `solicitudes-admin.service.spec.ts` con los casos anteriores (primer test de backend-admin).
- [ ] `cd apps/backend-admin && npm run lint && npm run test && npm run build`

**Dependencias:** T8

**Archivos:**
- `apps/backend-admin/src/solicitudes/solicitudes-admin.service.ts`
- `apps/backend-admin/src/solicitudes/solicitudes-admin.service.spec.ts` (nuevo)
- `apps/backend-admin/src/solicitudes/dto/update-solicitud-admin.dto.ts`
- `apps/backend-admin/src/solicitudes/solicitudes-admin.module.ts`

**Tamaño:** M

---

## T10: `GET /admin/solicitudes/:id` con `transicionesDisponibles`

**Descripción:** El detalle agrega `transicionesDisponibles: EstadoSolicitudRetiro[]`, calculado
con `transicionesDisponibles(estado, { actor, estadoPago })` para el usuario de la sesión, y quita
`operadorAsignado` de las relaciones.

**Criterios de aceptación:**
- [ ] Solicitud `en_revision` → `[aprobada, requiere_modificacion, rechazada]` para funcionario y admin.
- [ ] Solicitud `rechazada` → `[]` para funcionario y `[en_revision]` para admin.

**Verificación:**
- [ ] Casos agregados a `solicitudes-admin.service.spec.ts`.
- [ ] `cd apps/backend-admin && npm run test && npm run build`

**Dependencias:** T9

**Archivos:**
- `apps/backend-admin/src/solicitudes/solicitudes-admin.controller.ts`
- `apps/backend-admin/src/solicitudes/solicitudes-admin.service.ts`
- `apps/backend-admin/src/solicitudes/solicitudes-admin.service.spec.ts`

**Tamaño:** S

---

## T11: Mapa de calor con la nueva definición de "pendiente"

**Descripción:** En `mapa-calor.service.ts`, "pendiente" pasa a ser `en_revision`,
`requiere_modificacion`, `aprobada` o `derivada`.

**Criterios de aceptación:**
- [ ] La métrica `pendientes` cuenta esos 4 estados y ninguno más.

**Verificación:**
- [ ] `cd apps/backend-admin && npm run build`
- [ ] Manual: `GET /api/admin/mapa-calor?metrica=pendientes` coincide con un conteo por SQL.

**Dependencias:** T8

**Archivos:**
- `apps/backend-admin/src/mapa-calor/mapa-calor.service.ts`

**Tamaño:** XS

---

## T12: Capa de API y etiquetas de estado en admin-web

**Descripción:**
- **Tipos** en `api/admin.ts`: `EstadoSolicitud` con los 8 estados, `SolicitudRetiro` con `estadoPago`, `monto`, `fechaRevision` y `fechaCierre`, sin campos de operador, y `transicionesDisponibles?`. `ActualizarSolicitudInput` solo con `estado`.
- **Demo:** la etiqueta de la identidad de demo `operador` pasa a "Funcionario".
- **Etiquetas:** `ESTADO_META` con las etiquetas del panel (spec §3).

**Criterios de aceptación:**
- [ ] `ESTADO_META` tiene las 8 claves con las etiquetas del panel.
- [ ] No quedan referencias a `operadorAsignadoId` ni `fechaProgramada` en `api/admin.ts`.

**Verificación:**
- [ ] `cd apps/admin-web && npm run lint` (el build completo se verifica en T13)

**Dependencias:** T10

**Archivos:**
- `apps/admin-web/src/api/admin.ts`
- `apps/admin-web/src/components/ui/estadoMeta.ts`

(`SelectorPerfilDev.tsx` no cambia: la etiqueta del rol sale de `IDENTIDADES_DEV` en `api/admin.ts`.)

**Tamaño:** S

---

## T13: Pantalla Solicitudes sin asignación de operadores

**Descripción:** En `Solicitudes.tsx`:
- Filtros con los estados nuevos.
- Al seleccionar una solicitud se llama a `fetchSolicitud(id)`, que también corrige los UUID sin nombre.
- En "Cambiar estado" solo aparecen botones para `transicionesDisponibles`.
- Se quitan el bloque "Programar retiro", el selector de operador y la fecha.

Además se borra `AsignarRetiroModal.tsx` y, en `Auditoria.tsx`, se quitan las heurísticas de texto que buscan "operador" y "asignar".

**Criterios de aceptación:**
- [ ] Una solicitud `en_revision` muestra solo Aprobar, Pedir modificación y Rechazar.
- [ ] Una solicitud `rechazada` no muestra acciones al funcionario y muestra Reabrir al admin.
- [ ] No existen `AsignarRetiroModal.tsx` ni `OPERADORES_DEMO`.

**Verificación:**
- [ ] `cd apps/admin-web && npm run lint && npm run build`
- [ ] Manual: levantar backend-admin y admin-web, alternar entre admin y funcionario y comprobar los dos primeros criterios; captura de pantalla.

**Dependencias:** T12

**Archivos:**
- `apps/admin-web/src/pages/Solicitudes.tsx`
- `apps/admin-web/src/components/AsignarRetiroModal.tsx` (borrar)
- `apps/admin-web/src/pages/Auditoria.tsx`

**Tamaño:** M

---

## ✅ Checkpoint 3 — Panel admin
- [ ] `cd apps/backend-admin && npm run lint && npm run test && npm run build` en verde
- [ ] `cd apps/admin-web && npm run lint && npm run build` en verde
- [ ] Flujo manual: aprobar una solicitud → auditoría la muestra; el funcionario no puede reabrir
- [ ] Revisión humana; PR 3 abierto

---

# Fase 4 — Frontend ciudadano (PR 4 — implementa Ana o Maxi)

## T14: Estados nuevos y regla de cancelación en la PWA

**Descripción:**
- **Tipos** en `api/arca.ts`: 8 estados, `estadoPago` y `monto`, sin `operadorAsignadoId`.
- **Etiquetas:** `ESTADO_META` con las etiquetas para el vecino (spec §3).
- **Cancelación:** `CANCELABLES` en `MisSolicitudes.tsx` queda como copia de `ESTADOS_CANCELABLES_POR_VECINO`, con un comentario que apunta al core, y oculta Cancelar si `estadoPago === 'pagado'`.
- **Comentario:** en `SessionContext.tsx`, "operador" pasa a "funcionario".

**Criterios de aceptación:**
- [ ] El botón Cancelar aparece solo en `en_revision`, `requiere_modificacion` y `aprobada` sin pagar.
- [ ] Las 8 etiquetas se ven con los textos del vecino.

**Verificación:**
- [ ] `cd apps/frontend && npm run lint && npm run build`
- [ ] Manual: en la PWA con el vecino de demo, revisar una solicitud en `en_revision` (con botón) y otra `derivada` (sin botón).

**Dependencias:** T6 (y PR 1 integrado)

**Archivos:**
- `apps/frontend/src/api/arca.ts`
- `apps/frontend/src/components/ui/estadoMeta.ts`
- `apps/frontend/src/pages/MisSolicitudes.tsx`
- `apps/frontend/src/auth/SessionContext.tsx`

**Tamaño:** M

---

## ✅ Checkpoint 4 — Frontend ciudadano
- [ ] `cd apps/frontend && npm run lint && npm run build` en verde
- [ ] Revisión humana; PR 4 abierto (revisan Ana o Maxi)

---

# Fase 5 — Cierre

## T15: Documentación al día (regla A.10)

**Descripción:** Actualizar los `.md` que describen estados, roles, operadores o endpoints
afectados, y marcar el spec como implementado en el mapa. Cada archivo va en el PR de su área.

**Criterios de aceptación:**
- [ ] `grep -rni "operador\|asignada\|en_proceso" --include=*.md` fuera de `docs/specs/` y `tesis/` solo devuelve menciones históricas justificadas.
- [ ] En `MAPA_PANEL_MUNICIPAL.md` §8, `ciclo-solicitud` figura como "Implementado".

**Verificación:**
- [ ] Revisión humana de cada documento.

**Dependencias:** T7, T13, T14

**Archivos (repartir en los PR correspondientes):**
- `apps/backend/README.md`, `docs/BACKEND_FASE1.md` → PR 2
- `packages/arca-core/README.md` → PR 1
- `apps/backend-admin/README.md`, `apps/admin-web/README.md` → PR 3
- `docs/FRONTEND_FASE1.md` (si menciona estados) → PR 4
- `docs/specs/MAPA_PANEL_MUNICIPAL.md`, `docs/specs/SPEC-ciclo-solicitud.md` → PR 1

**Tamaño:** S por PR

---

## ✅ Checkpoint final
- [ ] Todos los criterios de éxito del spec §10 marcados
- [ ] `grep -rn "operador_asignado\|operadorAsignado\|fechaProgramada\|OPERADORES_DEMO\|RolAdministrador.OPERADOR" apps packages` (sin `node_modules`, `dist` ni migraciones antiguas) no devuelve resultados
- [ ] Equipo avisado de la ventana de integración
- [ ] PR 1 → 2 → 3 → 4 integrados a `develop` el mismo día, con visto bueno explícito de cada uno
