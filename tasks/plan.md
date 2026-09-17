# Plan de implementación: `ciclo-solicitud`

> **Spec:** [docs/specs/SPEC-ciclo-solicitud.md](../docs/specs/SPEC-ciclo-solicitud.md)
> **Mapa:** [docs/specs/MAPA_PANEL_MUNICIPAL.md](../docs/specs/MAPA_PANEL_MUNICIPAL.md)
> **Estado:** APROBADO — pendiente de implementación · **Fecha:** 2026-09-17
> **Tareas detalladas:** [tasks/todo.md](todo.md)

## Resumen

Reemplazar el ciclo de la solicitud basado en asignar operadores por el ciclo de revisión y
derivación:
- 8 estados nuevos, estado de pago y monto.
- Rol `operador` → `funcionario`.
- Reglas de transición centralizadas en `@arca/core`.
- Eliminación de todo el código de operadores.

El trabajo son **15 tareas en 5 fases**. Las fases 1 a 4 son 4 PR, uno por área (regla A.7 de `AGENTS.md`); la fase 5 es documentación.

## Decisiones de arquitectura

1. **Cortes por área, no verticales.** Cambiar el ENUM de `estado` afecta a los 5 proyectos a la
   vez y la regla del equipo es un área por PR. Por eso cada fase es un PR, y los 4 PR se
   **integran a `develop` en secuencia el mismo día** (1 → 2 → 3 → 4). Entre la integración de uno
   y el siguiente, los proyectos que todavía no se actualizaron no compilan. Cada PR sí debe quedar
   verde en su propia área.
2. **La migración va temprano** (tarea 2): es lo de mayor riesgo, así que falla rápido.
3. **Reglas como datos.** La tabla de transiciones es un arreglo en el core con funciones puras
   (`validarTransicion`, `transicionesDisponibles`, `aplicarTransicion`), probadas antes de que
   las use cualquier backend.
4. **Los frontends no duplican la tabla.** El panel recibe `transicionesDisponibles` desde el
   backend. La PWA solo copia la lista de estados cancelables, que es corta y el backend igual
   valida.
5. **Tests primero en el core:** cada fila de la tabla §2.1 del spec tiene su test.

## Grafo de dependencias

```
T1 enums + entidad (core)
 ├─► T2 migración + DBML ──────────────┐
 ├─► T3 tests core → rol funcionario   │
 └─► T4 validarTransicion ─► T5 aplicarTransicion
                                       │
      ┌────────────────────────────────┘ (PR 1 listo)
      ▼
 T6 service ciudadano ─► T7 quitar módulo operadores            (PR 2)
      ▼
 T8 roles backend-admin ─► T9 PATCH con core ─► T10 GET con transiciones
      T8 ─► T11 mapa de calor
 T10 ─► T12 API y estados admin-web ─► T13 pantalla Solicitudes   (PR 3)
      ▼
 T14 frontend ciudadano                                          (PR 4)
      ▼
 T15 documentación
```

## Índice de tareas

### Fase 1 — Núcleo + BD (PR 1, revisa back ciudadano)
- [ ] T1: Enums y entidad `SolicitudRetiro` nuevos en el core
- [ ] T2: Migración de estados, pago y rol + DBML
- [ ] T3: Actualizar tests existentes del core al rol `funcionario`
- [ ] T4: `validarTransicion` y `transicionesDisponibles` con tests
- [ ] T5: `aplicarTransicion` (efectos) con tests

**Checkpoint 1:** core compila y pasa tests; migración `run` + `revert` + `run` limpia.

### Fase 2 — Backend ciudadano (PR 2)
- [ ] T6: Crear y cancelar solicitudes con el ciclo nuevo
- [ ] T7: Eliminar el módulo de operadores

**Checkpoint 2:** `apps/backend` lint, test y build en verde.

### Fase 3 — Panel admin (PR 3)
- [ ] T8: Rol `funcionario` en backend-admin
- [ ] T9: `PATCH /admin/solicitudes/:id` validado por el core
- [ ] T10: `GET /admin/solicitudes/:id` con `transicionesDisponibles`
- [ ] T11: Mapa de calor con la nueva definición de "pendiente"
- [ ] T12: Capa de API y etiquetas de estado en admin-web
- [ ] T13: Pantalla Solicitudes sin asignación de operadores

**Checkpoint 3:** backend-admin y admin-web en verde; revisión manual en navegador.

### Fase 4 — Frontend ciudadano (PR 4)
- [ ] T14: Estados nuevos y regla de cancelación en la PWA

**Checkpoint 4:** frontend en verde; revisión manual del botón Cancelar.

### Fase 5 — Cierre
- [ ] T15: Documentación al día (regla A.10)

**Checkpoint final:** todos los criterios de éxito del spec §10; integración de los 4 PR.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Entre la integración de un PR y el siguiente, los proyectos no actualizados no compilan | Alto | Integrar los 4 PR el mismo día, en orden; avisar al equipo antes; nadie integra otra cosa a `develop` en esa ventana |
| La rama de ClaveÚnica (HU-12) u otra en curso usa `RolAdministrador.OPERADOR` | Medio | Revisar ramas abiertas antes de empezar (`git branch -r`) y avisar a Miguel del renombre |
| MySQL en modo estricto rechaza el `MODIFY` del ENUM si queda algún valor sin convertir | Medio | Patrón ampliar → convertir → reducir; verificar con `SELECT` que no queden valores viejos antes de reducir (como en `remove-rol-patrocinador`) |
| El nombre de la FK `fk_solicitudes_operador` difiere en alguna base local | Bajo | Leer la FK desde `information_schema` en la migración antes del `DROP` |
| `down` con pérdida de datos | Bajo | Documentado en la migración; solo son datos de demo |
| `dist/` compilados viejos con tipos antiguos confunden al editor o al build | Bajo | `npm run build:core` después de T1; los `dist/` no se versionan |
| El PR 2 y el PR 4 dependen de otros integrantes | Medio | Pasarles spec y plan apenas se integre este PR; acordar fecha de la ventana de integración |

## Responsables y decisiones

| PR | Área | Implementa | Revisa |
|---|---|---|---|
| 1 | Núcleo + BD | Benjamín | Miguel o Javier (regla A.7) |
| 2 | Backend ciudadano | Miguel o Javier | Benjamín |
| 3 | Panel admin | Benjamín | a definir |
| 4 | Frontend ciudadano | Ana o Maxi | Benjamín |

- Cancelar con pago `pagado`: **bloqueado**. Reabrir `cancelada`: **no permitido** (spec §11).
- Cada rama se nombra al crearla: `fecha-persona-descripcion`.
