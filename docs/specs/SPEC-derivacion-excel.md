# Spec: `derivacion-excel` — Entregar las solicitudes aprobadas a la empresa operadora

> **Estado:** BORRADOR — implementado en el panel; pendiente de revisión del equipo · **Fecha:** 2026-09-17
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`derivacion-excel`](MAPA_PANEL_MUNICIPAL.md#4-módulos) · **Depende de:** `revision-solicitudes` (y, para dirección real y contacto, `datos-retiro`, que todavía no existe)

## 1. Objetivo

Los retiros los ejecuta una empresa **externa**. El municipio no asigna operadores ni rutas: junta
las solicitudes listas y se las entrega a la empresa en un Excel, **con un botón** y cuando la
empresa lo necesite (decisión del 2026-09-17).

Cada vez que se aprieta el botón se crea un **lote de derivación**: las solicitudes incluidas pasan
a `derivada` y el Excel del lote se puede volver a descargar después.

### Criterios de aceptación

1. **Qué entra en un lote:** todas las solicitudes en `aprobada` cuyo pago no esté pendiente
   (`no_aplica` o `pagado`), de la más antigua a la más nueva. Si no hay ninguna, responde 400 y no
   crea el lote.
2. **Paso a `derivada`:** cada solicitud del lote pasa por `aplicarTransicion` (no se asigna
   `estado` a mano) y guarda el lote al que pertenece. El lote y los cambios de estado se guardan
   en una sola transacción: no existe un lote a medias.
3. **Excel del lote:** `.xlsx` con una fila por solicitud. **Sin fotos** (decisión 1 del mapa) y
   **sin** identificador del vecino. Se puede descargar las veces que haga falta.
4. **Historial de lotes:** lista con número de lote, fecha, cantidad de solicitudes y quién lo
   generó.
5. **Auditoría:** crear el lote queda como `CREATE` en `lotes_derivacion` (con la cantidad) y un
   `UPDATE` de estado por solicitud. **Cada descarga** del Excel queda como `ACCESO`, porque es
   una salida masiva de datos del vecino. Nunca se copia el contenido del Excel a la auditoría.
6. **Permisos:** admin y funcionario (derivar es una acción de funcionario en `ciclo-solicitud`).
7. **Registro de resultados:** por ahora se marca a mano en el detalle de cada solicitud
   (`retirada` / `no_realizada`, ya existe). Importar el Excel de vuelta queda fuera (decisión
   abierta 2 del mapa).

## 2. Diseño

### 2.1 Esquema (migración `1782164300000-lotes-derivacion` en `apps/backend`)

```sql
CREATE TABLE lotes_derivacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  generado_por_id VARCHAR(36) NOT NULL,     -- FK usuarios_administradores
  cantidad INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE solicitudes_retiro
  ADD COLUMN lote_derivacion_id INT NULL,   -- FK lotes_derivacion
  ADD INDEX idx_solicitudes_lote (lote_derivacion_id);
```

`lote_derivacion_id` no se borra si la solicitud vuelve a `aprobada` desde `no_realizada`: queda
el último lote en que salió. Si vuelve a derivarse, se sobrescribe con el lote nuevo.

### 2.2 Columnas del Excel

| Columna | Origen |
|---|---|
| Lote | `lotes_derivacion.id` |
| Solicitud | `solicitudes_retiro.id` |
| Fecha solicitud | `fecha_solicitud` |
| Fecha aprobación | `fecha_revision` |
| Residuo · Categoría | `residuos_catalogo.nombre` · `categoria` |
| Instrucciones de recogida | `residuos_catalogo.instrucciones_recogida` |
| Descripción | `descripcion` |
| Dirección | `direccion_anonimizada` (hasta que exista `datos-retiro`) |
| Latitud · Longitud | `latitud_capturada` · `longitud_capturada` |
| Pago · Monto | `estado_pago` · `monto` |

Cuando `datos-retiro` exista, se agregan dirección real, referencia y contacto. Mientras tanto la
empresa recibe la dirección aproximada y las coordenadas.

### 2.3 API del panel (`apps/backend-admin`)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/admin/derivaciones/resumen` | `{ listas, bloqueadasPorPago }`: cuántas entrarían en un lote ahora y cuántas esperan pago |
| `POST` | `/api/admin/derivaciones` | Crea el lote con las solicitudes listas. Responde el lote (`id`, `cantidad`, `createdAt`) |
| `GET` | `/api/admin/derivaciones` | Historial de lotes, del más nuevo al más antiguo |
| `GET` | `/api/admin/derivaciones/:id/excel` | Descarga el `.xlsx` del lote y lo audita como `ACCESO` |

Dependencia nueva: `exceljs` en `apps/backend-admin` (decisión 3 del mapa).

### 2.4 Panel (`apps/admin-web`)

- Sección **«Derivación»** en la barra lateral.
- Resumen: «N solicitudes listas para derivar» y «M esperan pago».
- Botón **«Generar lote y descargar Excel»** con confirmación; al terminar descarga el archivo.
- Historial de lotes con botón **«Descargar»** por lote.

## 3. Impacto en otras áreas (para coordinar)

| Qué | Área | Nota |
|---|---|---|
| Dirección real, referencia y contacto en el Excel | Back ciudadano + BD (`datos-retiro`) | Sin eso la empresa solo recibe dirección aproximada y coordenadas |
| Acuerdo de tratamiento de datos con la empresa | Municipalidad | Decisión 4 del mapa; el Excel no debería usarse con datos reales antes |
| La app ciudadana puede mostrar «derivada a la empresa» | Front ciudadano | Solo lectura del estado, que ya existe |

## 4. Límites

- **Siempre:** pasar por `aplicarTransicion`; auditar cada descarga; dejar fuera fotos e
  identificador del vecino.
- **Preguntar antes:** agregar columnas con datos personales nuevos; enviar el Excel por correo
  u otro canal automático; elegir a mano qué solicitudes entran al lote.
- **Nunca:** guardar el archivo generado en el servidor (se arma en memoria en cada descarga).

## 5. Pruebas

- Unitarias del service (`derivaciones-admin.service.spec.ts`): solo entran `aprobada` con pago
  resuelto; sin solicitudes → 400; cada solicitud queda `derivada` con su lote; auditoría de
  creación y de descarga; el Excel tiene encabezados y una fila por solicitud, sin el id del vecino.
- Manual en el panel: generar un lote, abrir el Excel, volver a descargarlo desde el historial.

## 6. Decisiones abiertas

1. **Selección manual:** ¿la empresa pide lotes parciales (por sector o por tipo de residuo)? Por
   ahora entra todo lo listo.
2. **Registro de resultados por importación** del Excel devuelto por la empresa (decisión abierta 2
   del mapa).
