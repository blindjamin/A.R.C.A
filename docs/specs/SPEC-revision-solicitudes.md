# Spec: `revision-solicitudes` — El funcionario como último filtro

> **Estado:** BORRADOR — panel implementado; create/cancel del ciudadano listos (§2); reenvío y última revisión al vecino pendientes (§3.2); PWA pendiente ([PENDIENTES_EQUIPO.md](../PENDIENTES_EQUIPO.md)) · **Fecha:** 2026-09-17
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`revision-solicitudes`](MAPA_PANEL_MUNICIPAL.md#4-módulos) · **Depende de:** `ciclo-solicitud` (y, para las fotos, `fotos-solicitud`, que todavía no existe)

## 1. Objetivo

Que el funcionario pueda **revisar** cada solicitud nueva y decidir con información suficiente y trazable:
- **Aprobar**, con una lista de verificación completa.
- **Pedir una modificación**, con un motivo de una lista y un comentario que ve el vecino.
- **Rechazar**, con un motivo de una lista y un comentario.

Además, el funcionario puede corregir la categoría del residuo, dejar notas internas y ver el historial de revisiones, sin que dos funcionarios revisen la misma solicitud a la vez.

`ciclo-solicitud` ya permite cambiar el estado, pero sin motivo ni comentario: el vecino no sabe qué corregir y no queda registro de por qué se decidió.

### Criterios de aceptación

1. **Motivos:** pedir modificación y rechazar exigen un **motivo** válido para esa decisión. El **comentario** es obligatorio si el motivo es `otro` o si la decisión es pedir modificación.
2. **Checklist:** aprobar exige la **lista de verificación completa** (todos los ítems en `true`).
3. **Historial:** cada decisión crea una fila en `revisiones_solicitud` (quién, cuándo, decisión, motivo, comentario y checklist). Las filas no se editan.
4. **Ruta única para decidir:** desde `en_revision`, las decisiones se toman solo con `POST /admin/solicitudes/:id/revision`. `PATCH /:id` responde 400 si se intenta usar para eso.
5. **Toma de la solicitud:** un funcionario puede **tomar** una solicitud en revisión por 15 minutos. Mientras la tiene tomada, otro funcionario no puede decidir ni corregir la categoría (409).
6. **Corrección de categoría:** solo en `en_revision`. Queda auditada, y el monto que se congela al aprobar usa la categoría corregida.
7. **Notas internas:** se crean y se listan por solicitud y **nunca** se exponen en la API ciudadana.
8. **Auditoría:** registra la decisión y el código del motivo, **nunca** el texto del comentario ni de las notas (minimización).
9. **Cola del panel:** abre por defecto en «En revisión», de la más antigua a la más nueva, y marca las que llevan más de 48 horas sin revisar.

## 2. Diseño

### 2.1 Motivos y lista de verificación (en `@arca/core`)

| Decisión | Motivos (`MotivoRevision`) |
|---|---|
| `requiere_modificacion` | `foto_insuficiente` · `categoria_incorrecta` · `descripcion_incompleta` · `direccion_incompleta` · `otro` |
| `rechazada` | `fuera_de_comuna` · `residuo_no_admitido` · `duplicada` · `contenido_inapropiado` · `otro` |

Lista de verificación para aprobar (`ITEMS_CHECKLIST_APROBACION`): `foto_clara` · `residuo_coincide` · `volumen_razonable` · `direccion_en_comuna` · `no_duplicada`.

La función pura `validarRevision(entrada)` aplica el criterio 1 y el 2 y lanza `RevisionInvalidaError`. Las etiquetas legibles viven en cada frontend.

### 2.2 Esquema (migración `1782164200000-revision-solicitudes` en `apps/backend`)

**Nueva tabla `revisiones_solicitud`**

| Columna | Tipo |
|---|---|
| `id` | INT PK AUTO_INCREMENT |
| `solicitud_retiro_id` | INT NOT NULL, FK → `solicitudes_retiro.id` |
| `revisado_por_id` | VARCHAR(36) NOT NULL, FK → `usuarios_administradores.id` |
| `decision` | ENUM('aprobada','requiere_modificacion','rechazada') NOT NULL |
| `motivo` | VARCHAR(50) NULL |
| `comentario` | TEXT NULL — **lo ve el vecino** |
| `checklist` | JSON NULL |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP |

**Nueva tabla `notas_solicitud`**

| Columna | Tipo |
|---|---|
| `id` | INT PK AUTO_INCREMENT |
| `solicitud_retiro_id` | INT NOT NULL, FK → `solicitudes_retiro.id` |
| `autor_id` | VARCHAR(36) NOT NULL, FK → `usuarios_administradores.id` |
| `texto` | TEXT NOT NULL — **solo interna** |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP |

**`solicitudes_retiro`:** `tomada_por_id` VARCHAR(36) NULL (FK) y `tomada_hasta` TIMESTAMP NULL.

Índice `idx_revisiones_solicitud` (`solicitud_retiro_id`, `created_at`) y lo mismo en notas.

### 2.3 API del panel (`apps/backend-admin`)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/admin/solicitudes` | Con `estado=en_revision` ordena de la más antigua a la más nueva |
| `GET` | `/api/admin/solicitudes/:id` | Agrega `tomadaPor` (nombre) y `tomadaHasta` si la toma está vigente |
| `POST` | `/api/admin/solicitudes/:id/toma` | Toma la solicitud por 15 minutos (renueva si ya es suya). **409** si la tiene otro |
| `DELETE` | `/api/admin/solicitudes/:id/toma` | Libera la toma propia |
| `POST` | `/api/admin/solicitudes/:id/revision` | Body `{ decision, motivo?, comentario?, checklist? }`. Valida con `validarRevision` y `aplicarTransicion`, guarda la fila de historial, libera la toma y audita |
| `GET` | `/api/admin/solicitudes/:id/revisiones` | Historial, de la más nueva a la más antigua, con el nombre del revisor |
| `PATCH` | `/api/admin/solicitudes/:id/categoria` | Body `{ residuoCatalogoId }`. Solo en `en_revision` |
| `GET` · `POST` | `/api/admin/solicitudes/:id/notas` | Notas internas: listar y crear (`{ texto }`, máximo 2000 caracteres) |
| `GET` | `/api/admin/residuos` | Catálogo para el selector de categoría |

Todos con roles `admin` y `funcionario`.

### 2.4 Panel (`apps/admin-web`)

- **Cola:** filtro por defecto «En revisión», más antigua primero, con una etiqueta «+48 h».
- **Al abrir una solicitud en revisión:** el panel la **toma** sola y la libera al volver. Si la tiene otro funcionario, muestra un aviso y deja la revisión en solo lectura.
- **Tarjeta «Revisión»:**
  - Lista de verificación; Aprobar se habilita solo con todo marcado.
  - Pedir modificación y Rechazar abren un formulario con motivo y comentario.
  - Selector para corregir la categoría.
  - Espacio para las fotos, con el aviso «disponible con `fotos-solicitud`».
- **Historial de revisiones y notas internas** en el detalle.
- **Otras transiciones** (derivar, cerrar, reabrir) siguen como botones.

## 3. Impacto en otras áreas (para coordinar)

| Área | Qué necesita | Responsable |
|---|---|---|
| Núcleo + BD | Enums, entidades, `validarRevision` y migración (en el PR del equipo) | Benjamín; revisa Miguel o Javier |
| Backend ciudadano | `GET /api/solicitudes-retiro/:id` devuelve la **última revisión visible** (decisión, motivo y comentario; **sin** revisor ni checklist). Nuevo `PATCH /api/solicitudes-retiro/:id/reenviar`, que corrige descripción o residuo y pasa de `requiere_modificacion` a `en_revision` con actor `vecino` | Miguel o Javier |
| Frontend ciudadano | Pantalla «tu solicitud requiere cambios»: muestra motivo y comentario, permite corregir y reenviar. Etiquetas de motivos para el vecino | Ana o Maxi |

## 4. Límites

- **Siempre:** decidir solo con `validarRevision` + `aplicarTransicion`; no copiar comentarios ni notas a la auditoría.
- **Preguntar antes:** exponer notas o checklist fuera del panel; cambiar la duración de la toma.
- **Nunca:** editar o borrar filas de `revisiones_solicitud`.

## 5. Pruebas

- **Núcleo:** tests de `validarRevision` (cada decisión, motivo que no corresponde, comentario obligatorio, checklist incompleto).
- **Backend-admin:** tests del service de revisión (decisión válida guarda historial y audita sin texto, 409 por toma ajena, 400 por `PATCH` con decisión, corrección de categoría fuera de `en_revision`).
- **Migración:** `run` → `revert` → `run` sobre la base de demo.
- **Manual en navegador:** con dos perfiles, tomar, decidir y ver el historial.

## 6. Decisiones abiertas

1. **Duración de la toma:** 15 minutos. Se puede ajustar después en `configuracion-admin`.
2. **Motivos:** la lista es una propuesta; la municipalidad puede ajustarla. Más adelante pasaría a `configuracion-admin`.
3. **Fotos:** la lista de verificación incluye `foto_clara`, pero mientras no exista `fotos-solicitud` el funcionario no tiene imágenes que mirar.
