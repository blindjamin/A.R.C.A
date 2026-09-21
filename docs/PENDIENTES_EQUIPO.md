# Pendientes del equipo — Replanteo del panel municipal

> **Fecha:** 2026-09-17 · **Autor:** Benjamín Paicil (con asistencia de IA)
> **Revisores del PR:** Miguel Segovia y Javier Figueroa
> **Contexto:** [mapa del panel](specs/MAPA_PANEL_MUNICIPAL.md) · specs de
> [`ciclo-solicitud`](specs/SPEC-ciclo-solicitud.md),
> [`revision-solicitudes`](specs/SPEC-revision-solicitudes.md),
> [`derivacion-excel`](specs/SPEC-derivacion-excel.md) y
> [`dashboard-metricas`](specs/SPEC-dashboard-metricas.md)

Este documento reúne **todo lo que falta revisar, arreglar e implementar** para cerrar el replanteo
del panel municipal. Reemplaza al plan anterior (`tasks/plan.md` y `tasks/todo.md`), cuyas tareas
del núcleo y del panel ya están hechas.

**Resumen del replanteo:** los retiros los ejecuta una empresa **externa**. El municipio no asigna
operadores: el funcionario revisa cada solicitud y la aprueba, pide una modificación o la rechaza;
las aprobadas se entregan a la empresa en un Excel. El rol `operador` pasa a llamarse `funcionario`.

---

## 0. Estado actual

| Parte | Estado |
|---|---|
| `@arca/core`: estados, pago, rol `funcionario`, reglas de transición, revisión y lotes | ✅ Hecho, con 124 tests |
| Migraciones `1782164100000`, `1782164200000` y `1782164300000` + DBML | ✅ Hechas, probadas con `run` → `revert` → `run` |
| `apps/backend-admin`: ciclo, revisión, derivación con Excel y métricas | ✅ Hecho, con 32 tests |
| `apps/admin-web`: Solicitudes con revisión, Derivación y Métricas | ✅ Hecho, probado en navegador |
| `apps/backend` (backend ciudadano) | ✅ §2 hecha (2026-09-21, Javier): crea en `en_revision`, cancela con `aplicarTransicion`, sin `operadores/` |
| `apps/frontend` (PWA) | ⚠️ Compila, pero muestra los estados viejos. Ver §5 |

> **§2 del backend ciudadano ya está en la rama del PR.** Queda la revisión §1, el merge acordado
> y el PR aparte de la PWA (§5). Después del merge: §3 (zona horaria, reenvío, fotos, datos-retiro).

---

## 1. Revisar (Miguel y Javier)

`packages/arca-core` y las migraciones cambian solo con revisión de backend ciudadano (regla A.7).

### 1.1 Núcleo (`packages/arca-core`)

- [ ] `src/solicitudes/ciclo-solicitud.ts`: la tabla `TRANSICIONES` coincide con
  [`SPEC-ciclo-solicitud.md` §2.1](specs/SPEC-ciclo-solicitud.md). En especial:
  - Solo un admin reabre `rechazada` y `retirada`.
  - No se deriva con el pago pendiente.
  - El vecino no cancela si ya pagó, y `cancelada` no se reabre.
- [ ] `aplicarTransicion`: congela `monto` al aprobar desde `en_revision`, no vuelve a cobrar si ya
  estaba pagada y fija `fechaRevision`, `revisadoPorId` y `fechaCierre`.
- [ ] `src/solicitudes/revision-solicitud.ts`: motivos por decisión, comentario obligatorio (pedir
  modificación o motivo `otro`) y checklist completo para aprobar.
- [ ] Entidades nuevas: `RevisionSolicitud`, `NotaSolicitud` y `LoteDerivacion`. Columnas nuevas de
  `SolicitudRetiro`: `estadoPago`, `monto`, `fechaRevision`, `revisadoPorId`, `fechaCierre`,
  `tomadaPorId`, `tomadaHasta` y `loteDerivacionId`.
- [ ] `cd packages/arca-core && npm run test` en verde.

### 1.2 Migraciones (`apps/backend/src/database/migrations`)

- [ ] `1782164100000-ciclo-solicitud-revision`: convierte estados y roles viejos (tabla del spec
  §2.4), quita las columnas de operador y agrega las de pago y revisión. El `down` pierde datos, y
  eso está documentado.
- [ ] `1782164200000-revision-solicitudes`: tablas `revisiones_solicitud` y `notas_solicitud`, más la
  toma de la solicitud.
- [ ] `1782164300000-lotes-derivacion`: tabla `lotes_derivacion` y `solicitudes_retiro.lote_derivacion_id`.
- [ ] En su base local: `npm run migration:run`, `npm run migration:revert` (tres veces) y `run` de
  nuevo, sin errores.
- [ ] `ARCA_database_schema.dbml` refleja las tablas y columnas nuevas.

### 1.3 Backend del panel (`apps/backend-admin`)

No es su área, pero es backend y conviene una segunda mirada:

- [ ] Ningún service asigna `estado` a mano: todo pasa por `aplicarTransicion`.
- [ ] La auditoría registra solo campos cambiados y códigos, **nunca** comentarios, notas ni el
  contenido del Excel (`solicitudes/auditoria-solicitud.ts`).
- [ ] `derivaciones/derivaciones-admin.service.ts`: el lote se crea en una transacción con bloqueo
  de filas (`pessimistic_write`).
- [ ] Dependencia nueva: `exceljs` (autorizada en la decisión 3 del mapa).
- [ ] `cd apps/backend-admin && npm run lint && npm run test && npm run build` en verde.

### 1.4 Decisiones tomadas al implementar (confirmar o discutir)

1. Re-aprobar una solicitud ya pagada **no vuelve a cobrar**.
2. `fechaRevision` y `revisadoPorId` solo se registran en decisiones tomadas sobre `en_revision`.
3. `TransicionInvalidaError.motivo`: `actor` → 403; `estado` y `pago` → 400.
4. Desde `en_revision`, `PATCH /admin/solicitudes/:id` rechaza las decisiones: van por
   `POST /admin/solicitudes/:id/revision`, que exige motivo y checklist.
5. Un lote de derivación incluye **todas** las aprobadas con el pago resuelto; no se eligen a mano.
6. Cada descarga del Excel se audita como `ACCESO`.

---

## 2. Arreglar antes del merge — backend ciudadano (Miguel o Javier)

> ✅ **Hecho (2026-09-21, Javier)** en la rama `2026-09-17-benjamin-panel-ciclo-solicitud`.
> `apps/backend` compila y pasa lint/test/build. `GET /api/operadores` responde 404.

### 2.1 Crear y cancelar con el ciclo nuevo

En `src/solicitudes-retiro/solicitudes-retiro.service.ts`:

- [x] `create` deja la solicitud en `EstadoSolicitudRetiro.EN_REVISION`.
- [x] `cancelarPorCiudadano` usa `aplicarTransicion(solicitud, CANCELADA, { actor: 'vecino', ahora })`
  y traduce `TransicionInvalidaError`: `motivo === 'actor'` → 403 y el resto → 400. Solo se cancela en
  `en_revision`, `requiere_modificacion` o `aprobada`, y nunca con `estadoPago === 'pagado'`.
- [x] Borrar `update()`, `aplicarCambioEstado`, `validarOperador` y `dto/update-solicitud-retiro.dto.ts`:
  no tienen uso, porque el cambio de estado del funcionario vive en `apps/backend-admin`.
- [x] `tieneAccesoLecturaMunicipal` usa `RolAdministrador.FUNCIONARIO`.
- [x] Quitar `operadorAsignado` de las relaciones del `findOne`.
- [x] La auditoría de crear y cancelar sigue registrando solo el `estado`.

**Criterios:** crear responde `estado: en_revision`; cancelar una `derivada` responde 400; cancelar la
solicitud de otro vecino responde 403.
**Verificar:** un `solicitudes-retiro.service.spec.ts` nuevo con esos casos. ✅

### 2.2 Eliminar el módulo de operadores

- [x] Borrar `src/operadores/` (controller, service, spec y module) y quitarlo de `app.module.ts`.
- [x] Borrar las carpetas vacías `asignacion/`, `core/` y `workflow/` de `src/solicitudes-retiro/`
  (no existían en el árbol; no había nada que borrar).

**Criterios:** `GET /api/operadores` responde 404 y `GET /api/health` responde 200.

### 2.3 Documentación de su área

- [x] `apps/backend/README.md`: tabla de endpoints sin `/api/operadores`, estados nuevos, rol
  `funcionario` en la tabla de UUID de demo, y quitar el aviso ⚠️ una vez hecho.
- [x] `docs/BACKEND_FASE1.md`: el aviso de la sección «Cambio de estado» queda como nota histórica;
  endpoints y pendientes actualizados.

### 2.4 Verificación

```bash
npm install && npm run build:core
cd apps/backend && npm run lint && npm run test && npm run build
npm run migration:run
```

✅ Lint/test/build del backend ciudadano en verde (2026-09-21).

Criterio final del spec (sin `node_modules`, `dist` ni migraciones antiguas): en `apps/backend` y
`packages` no quedan `operadorAsignado` / `RolAdministrador.OPERADOR`. Siguen menciones en
`apps/frontend` (§5, PR aparte) y un comentario en `backend-admin/src/main.ts`.

```bash
grep -rn "operador_asignado\|operadorAsignado\|fechaProgramada\|OPERADORES_DEMO\|RolAdministrador.OPERADOR" apps packages
```

---

## 3. Arreglar después del merge — backend compartido (Miguel o Javier)

### 3.1 Zona horaria de la conexión

Ninguna configuración de TypeORM define `timezone`. Lo que escribe la aplicación se guarda en hora
local, pero las columnas con `DEFAULT CURRENT_TIMESTAMP` guardan UTC y se leen como hora local. Por
eso `created_at` aparece **unas 3 horas adelantado** en el panel: en el historial de revisiones, las
notas, los lotes y la auditoría.

- [ ] Acordar la corrección (por ejemplo, `timezone: 'Z'` en la conexión de `apps/backend` y
  `apps/backend-admin`) **y** una migración que ajuste las fechas ya guardadas por la aplicación.
- [ ] Después, en `apps/backend-admin/src/metricas/calcular-metricas.ts`, volver a poner el tope
  superior del rango (hoy se quitó por este desfase; hay un comentario).

### 3.2 Reenvío de la solicitud corregida (spec `revision-solicitudes` §3)

- [ ] Exponer al vecino la **última revisión** de su solicitud: decisión, motivo y comentario.
  **Nunca** las notas internas ni el checklist.
- [ ] `PATCH /api/solicitudes-retiro/:id/reenviar`: solo el dueño; pasa de `requiere_modificacion`
  a `en_revision` con `aplicarTransicion` y actor `vecino`; permite corregir descripción y categoría.

### 3.3 Módulos que esperan al backend ciudadano

- [ ] **`fotos-solicitud`:** subida de fotos al crear y corregir la solicitud (tabla, almacenamiento
  en servidor y endpoint protegido para el panel). Sin esto, la revisión no muestra imágenes y
  `foto_clara` del checklist no se puede comprobar.
- [ ] **`datos-retiro`:** dirección real, referencia y contacto mientras la solicitud está abierta;
  consentimiento y borrado al cerrar. Sin esto, el Excel de la empresa solo lleva la dirección
  aproximada y las coordenadas. Requiere el acuerdo de la municipalidad (decisión 4 del mapa).

Los dos necesitan su propio spec antes de implementarse.

---

## 4. Backlog (Miguel, como Product Owner)

- [ ] **HU-08:** de «Programar y asignar retiros a operadores» a «Derivar solicitudes aprobadas a la
  empresa operadora (Excel)».
- [ ] **HU-31** («en ruta») y **HU-32** (foto con GPS): **fuera de alcance**. **HU-33** («retirado»)
  queda cubierta por el registro de resultado en el panel.
- [ ] **HU-30** (ver ruta asignada en mapa): pasa de «en pausa» a descartada.
- [ ] **HU-07:** dashboard con métricas del ciclo de revisión (ya implementado).
- [ ] **HU-13:** roles vecino, funcionario y admin.
- [ ] Crear las HU de **revisión de solicitudes por el funcionario** y de **pago maqueteado**.
- [ ] Decidir junto a la municipalidad el **plazo de retención** de dirección, contacto y fotos (mapa §7).

---

## 5. Coordinar con frontend ciudadano (Ana o Maxi)

No son parte de la revisión de este PR, pero sin esto la app del vecino muestra estados que ya no
existen. Miguel, como PO, coordina el traspaso.

- [ ] `apps/frontend/src/api/arca.ts`: los 8 estados nuevos, `estadoPago` y `monto`, sin
  `operadorAsignadoId`.
- [ ] `components/ui/estadoMeta.ts`: etiquetas **para el vecino** (tabla de
  `SPEC-ciclo-solicitud.md` §3; por ejemplo, `derivada` → «Retiro en coordinación»).
- [ ] `pages/MisSolicitudes.tsx`: mostrar Cancelar solo en `en_revision`, `requiere_modificacion` o
  `aprobada`, y nunca con `estadoPago === 'pagado'`.
- [ ] `auth/SessionContext.tsx`: el comentario «operador» pasa a «funcionario».
- [ ] Después de §3.2: pantalla **«tu solicitud requiere cambios»** con motivo, comentario y reenvío.
- [ ] Después: subida de fotos, datos de contacto y **pantalla de pago maqueteado**.

**Verificar:** `cd apps/frontend && npm run lint && npm run build`.

---

## 6. Integración

1. Miguel y Javier revisan §1. **§2 ya está cerrada** en la rama del PR.
2. Se confirma el día de integración. Mientras dure esa ventana, nadie integra otra cosa a `develop`.
3. Merge del PR a `develop`.
4. Cada integrante, en su máquina:

```bash
git pull origin develop
npm install && npm run build:core
cd apps/backend && npm run migration:run
```

Sin la migración, los dos backends fallan con columnas inexistentes.

5. Ana o Maxi abren el PR de §5 lo antes posible después del merge.
