# Mapa de capacidades — Panel municipal (replanteo)

> **Estado:** APROBADO (2026-09-17)
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Reemplaza:** el plan anterior de asignación de operadores y rutas (`docs/ADMIN_PANEL_PENDIENTE.md`, eliminado)

## 1. Qué cambió y por qué

El retiro físico lo ejecuta una **empresa operadora externa** a la municipalidad. A.R.C.A. no
tiene información de sus operadores, camiones ni rutas. Por lo tanto:

- El municipio **no asigna** retiros. Su rol es ser el **último filtro de calidad**: revisar cada
  solicitud (fotos incluidas) y aprobarla, pedir una modificación o rechazarla.
- Las solicitudes aprobadas se **entregan a la empresa en un Excel** que se genera con un botón,
  cuando la empresa lo necesite.
- Los funcionarios necesitan **métricas** de todo este ciclo.
- El retiro puede tener **costo** (precio del catálogo). El pago se **maqueta** dentro de la app
  ciudadana; no hay pasarela real en este alcance.

Queda fuera de alcance: operadores, rutas, programación de horarios, notificaciones al operador.

## 2. Ciclo de vida de una solicitud

```
                    ┌──── requiere_modificacion ◄──┐
                    ▼   (vecino corrige y reenvía)  │
 (vecino crea) ─► en_revision ──────────────────────┤
                    │                               │
                    ├──► rechazada (final)          │
                    │                               │
                    └──► aprobada ──► derivada ──► retirada (final)
                          ▲    [pago]     │
                          │               └──► no_realizada
                          └───────────────────────┘ (volver a derivar)

 cancelada (final): el vecino puede cancelar mientras no esté `derivada`.
```

| Transición | Quién | Condición |
|---|---|---|
| — → `en_revision` | Vecino (al crear) | Al menos 1 foto |
| `en_revision` → `aprobada` | Funcionario / Admin | Checklist completo |
| `en_revision` → `requiere_modificacion` | Funcionario / Admin | Motivo (lista) + comentario |
| `requiere_modificacion` → `en_revision` | Vecino | Reenvía con cambios |
| `en_revision` → `rechazada` | Funcionario / Admin | Motivo (lista) + comentario |
| `aprobada` → `derivada` | Funcionario / Admin | Pago `no_aplica` o `pagado`; se genera el Excel |
| `derivada` → `retirada` / `no_realizada` | Funcionario / Admin | Según lo que informe la empresa |
| `no_realizada` → `aprobada` | Funcionario / Admin | Para incluirla en un próximo Excel |
| `rechazada` / `retirada` → `en_revision` (reabrir) | **Solo Admin** | Motivo obligatorio |
| cualquiera no final, antes de `derivada` → `cancelada` | Vecino | Sin pago `pagado` |

**Pago, en un campo aparte** (`estado_pago`: `no_aplica` · `pendiente` · `pagado`), no como un estado más:
- Se cobra **después de aprobar**, para no cobrar ni tener que devolver solicitudes rechazadas.
- Al aprobar se congela el `monto` con el precio del catálogo, ya con la categoría corregida.
- Precio 0 → `no_aplica`.

Las reglas de transición viven en `@arca/core`: las usan los dos backends y no deben divergir.

## 3. Roles y permisos

El rol `operador` **se renombra a `funcionario`**: "operador" ahora significa la empresa externa y
confunde. La migración va en el módulo `ciclo-solicitud`.

| Acción | Funcionario | Admin |
|---|:-:|:-:|
| Ver cola, detalle y fotos | ✓ | ✓ |
| Aprobar / pedir modificación / rechazar | ✓ | ✓ |
| Corregir categoría del residuo | ✓ | ✓ |
| Notas internas | ✓ | ✓ |
| Generar Excel de derivación | ✓ | ✓ |
| Registrar resultado del retiro | ✓ | ✓ |
| Dashboard y mapa | ✓ | ✓ |
| Reabrir solicitud cerrada | — | ✓ |
| Anular un lote derivado | — | ✓ |
| Ver registro de auditoría | — | ✓ |
| Gestionar funcionarios (alta, baja, rol) | — | ✓ |
| Catálogo, precios, motivos de rechazo, umbrales | — | ✓ |

Criterio: el funcionario **opera**; el admin toma las decisiones que **revierten** algo o
**cambian las reglas** del sistema.

## 4. Módulos

| Módulo | Responsabilidad | Depende de | Dueño |
|---|---|---|---|
| `admin-auth` | Login ClaveÚnica en el panel, sesión, guard, roles admin/funcionario, registro de `LOGIN` | — | Benjamín |
| `ciclo-solicitud` | Nuevos estados + `estado_pago` + `monto`, reglas de transición en core, migración, limpieza de lo de operadores | — | Benjamín + BD |
| `fotos-solicitud` | Tabla de fotos, almacenamiento en servidor, endpoint protegido de lectura para el panel | — | Benjamín (almacenamiento) · Back ciudadano (subida) |
| `datos-retiro` | Dirección real, referencia y contacto guardados mientras la solicitud está abierta; consentimiento; borrado al cerrar | ciclo-solicitud | Back ciudadano + BD |
| `revision-solicitudes` | Cola, detalle, galería, checklist, aprobar/modificar/rechazar, corregir categoría, notas, bloqueo de revisión | admin-auth, ciclo-solicitud, fotos-solicitud | Benjamín |
| `pago-maqueta` | Pantalla de pago simulado en la app ciudadana; estado de pago visible en el panel | ciclo-solicitud | Front ciudadano (+ panel) |
| `derivacion-excel` | Botón que genera el Excel, lote, paso a `derivada`, historial de lotes, registro de resultados | revision-solicitudes, datos-retiro, pago-maqueta | Benjamín |
| `dashboard-metricas` | Indicadores, gráficos, mapa por sector, rango de fechas | revision-solicitudes, derivacion-excel | Benjamín |
| `configuracion-admin` | Motivos, catálogo y precios, funcionarios, umbrales, reabrir y anular | admin-auth, ciclo-solicitud | Benjamín |

**Orden de construcción**

```
admin-auth ─┐
ciclo-solicitud ─┼─► revision-solicitudes ─┐
fotos-solicitud ─┘                         ├─► derivacion-excel ─► dashboard-metricas
ciclo-solicitud ─► datos-retiro ───────────┤
ciclo-solicitud ─► pago-maqueta ───────────┘
admin-auth + ciclo-solicitud ─► configuracion-admin   (en paralelo)
```

## 5. Dependencias con otras áreas (coordinar con el equipo)

| Qué necesita el panel | Área | Módulo |
|---|---|---|
| Subir fotos al crear/corregir la solicitud | Back ciudadano | fotos-solicitud |
| Pedir y guardar dirección, referencia, contacto y aceptación de términos | Back + Front ciudadano | datos-retiro |
| Pantalla "tu solicitud requiere cambios" y reenvío | Front + Back ciudadano | revision-solicitudes |
| Pantalla de pago simulado | Front ciudadano | pago-maqueta |
| Reescribir HU-08, ajustar HU-07 y HU-13, nueva HU de pago | PO (Miguel) | — |
| Acuerdo de tratamiento de datos con la empresa | Municipalidad | datos-retiro |

## 6. Decisiones tomadas

| # | Decisión | Fecha |
|---|---|---|
| 1 | El Excel de derivación **no incluye fotos** por ahora | 2026-09-17 |
| 2 | Se renombra el rol `operador` → `funcionario` | 2026-09-17 |
| 3 | Se autoriza `exceljs` como dependencia de `backend-admin` (módulo `derivacion-excel`) | 2026-09-17 |
| 4 | La municipalidad gestionará el acuerdo para compartir datos con la empresa operadora | 2026-09-17 |
| 5 | Fotos en servidor; almacenamiento lo evalúa Benjamín, la subida el back ciudadano | 2026-09-17 |
| 6 | No se cancela una solicitud pagada; `cancelada` no se reabre | 2026-09-17 |

## 7. Decisiones abiertas

1. **Plazo de retención** de dirección, contacto y fotos después de cerrar la solicitud. Lo define
   la municipalidad.
2. **Registro de resultados:** propuesta: marcar a mano ahora e importar el Excel después.

## 8. Specs por módulo

| Módulo | Spec | Estado |
|---|---|---|
| `ciclo-solicitud` | [SPEC-ciclo-solicitud.md](SPEC-ciclo-solicitud.md) · [plan](../../tasks/plan.md) | Núcleo, BD y panel implementados; backend y app ciudadana pendientes |
| `revision-solicitudes` | [SPEC-revision-solicitudes.md](SPEC-revision-solicitudes.md) | Núcleo, BD y panel implementados (sin fotos, que esperan `fotos-solicitud`); backend y app ciudadana pendientes |
