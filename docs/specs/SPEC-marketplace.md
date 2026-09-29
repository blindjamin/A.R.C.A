# Spec: `marketplace` — Backend del Marketplace P2P y Circular Credits

> **Estado:** PROPUESTO (2026-09-29) — pendiente de revisión de Miguel Segovia. Nada implementado todavía.
> **Fecha:** 2026-09-29 · **Autor:** Javier Figueroa (con asistencia de IA)
> **Origen:** "Sprint 3 - Reparto del equipo COM Tech" (Miguel Segovia, 2026-09-24), sección de Javier.
> Se acordó que ese documento vale como acuerdo del equipo para los cambios al DBML que pide.
> **Depende de:** [`sesion-unica`](SPEC-sesion-unica.md) (identidad por cookie) ·
> ubicación del Marketplace ([BACKEND_FASE1 § Rate limiting y ubicación](../BACKEND_FASE1.md#rate-limiting-y-ubicación-del-marketplace))
> **HU:** HU-04, HU-05, HU-10, HU-15, más "Marcar como entregado"

## 1. Objetivo

Dar al frontend los endpoints para demostrar la cadena completa del Sprint 3:
**publicar → buscar → contactar ("Lo quiero") → marcar como entregado → calificar → ver los créditos.**

El contrato que ya usan las pantallas está en `apps/frontend/src/api/marketplace.ts` (Miguel). Este
spec lo respeta y agrega lo que falta para entregar, calificar y ver créditos (§5).

**Para quién:** Miguel (pantallas del marketplace), Ana (calificación y QA), Maxi (billetera).

### Criterios de aceptación

1. Un vecino publica un artículo con tipo, título, descripción, residuo del catálogo, foto opcional y
   ubicación opcional. La ubicación se guarda ya aproximada a la grilla de 250 m.
2. El listado filtra por texto, categoría, tipo y banda de distancia, y **nunca** devuelve artículos
   vencidos, reservados, entregados ni retirados.
3. La API nunca devuelve la coordenada de un artículo ni el id de ningún vecino.
4. "Lo quiero" reserva el artículo para quien lo presiona; quien publicó puede liberarlo o marcarlo
   como entregado. Entregar deja registrado quién lo recibió y cuándo.
5. Solo quien recibió el artículo lo califica, de 1 a 5, una sola vez.
6. Al entregar y al calificar con 4 o 5 estrellas se otorgan créditos a quien regaló, respetando los
   topes (§7). El saldo nunca se edita: solo se agregan movimientos.
7. `GET /api/creditos` devuelve el saldo y los movimientos de la sesión.
8. Todo lo anterior con tests, y `npm run lint`, `npm run test` y `npm run build` en verde.

## 2. Decisiones (2026-09-29, Javier)

| # | Decisión |
|---|---|
| 1 | **Receptor:** se identifica con **"Lo quiero"**. El artículo pasa a `en_negociacion` y se guarda `usuario_comprador_id`. Sirve como paso "contactar" aunque no haya chat |
| 2 | **DBML:** el PDF del Sprint 3 vale como acuerdo para los cambios de §3 |
| 3 | **Créditos:** valores de prueba de §7, en un solo archivo de constantes |
| 4 | **Distancia:** grilla de 250 m del backend (ya implementada). Los 20 m son el redondeo que hace el navegador sobre el punto de quien mira; no hay contradicción |
| 5 | **Nombre del publicador:** texto fijo `"Vecino de Santo Domingo"` hasta que se guarde el nombre real (toca el núcleo y HU-38; Sprint 4) |
| 6 | **Ubicación del artículo:** `lat` y `lon` opcionales al publicar; se guardan con `aproximarParaGuardar` |
| 7 | **Filtro por banda:** parámetro opcional `banda` en el listado |
| 8 | **Rutas nuevas:** las de §5.2 |
| 9 | **Artículo reservado o entregado:** lo ven solo quien lo publicó y quien lo reservó |
| 10 | **Reputación:** es de la persona, no del artículo (PDF). El promedio se calcula sobre `ratings` al consultar; no se guarda |

## 3. Base de datos (PR 1)

Una migración nueva. Ninguna migración existente se edita.

### 3.1 `articulos_marketplace` — crear

La tabla está en el DBML pero **no existe en la base**: ninguna migración la creó. Se crea completa.

| Columna | Tipo | Nota |
|---|---|---|
| `id` | int, PK, autoincremental | |
| `usuario_publicador_id` | varchar(36), not null, FK `usuarios_ciudadanos` | |
| `residuo_catalogo_id` | int, not null, FK `residuos_catalogo` | La categoría sale de aquí |
| `tipo` | enum(`regalo`, `intercambio`), not null | **Nueva** |
| `titulo` | varchar(255), not null | |
| `descripcion` | text, null | |
| `estado` | enum(`disponible`, `en_negociacion`, `retirado`, `completado`), default `disponible` | |
| `foto_path` | varchar(500), null | **Nueva.** Ruta relativa a la carpeta de subidas; nunca una URL |
| `latitud` | decimal(10,8), null | **Nueva.** Ya aproximada a 250 m |
| `longitud` | decimal(11,8), null | **Nueva.** Ya aproximada a 250 m |
| `fecha_publicacion` | timestamp, not null | |
| `fecha_expiracion` | timestamp, not null | **Nueva.** Publicación + 30 días |
| `usuario_comprador_id` | varchar(36), null, FK `usuarios_ciudadanos` | Quien presionó "Lo quiero" / quien recibió |
| `fecha_transaccion` | timestamp, null | Cuándo se entregó |
| `created_at`, `updated_at` | timestamp | |

- **Se quitan** `calificacion_promedio` y `cantidad_evaluaciones` del DBML (decisión 10).
- Índice en (`estado`, `fecha_expiracion`) para el listado.

### 3.2 `ratings` — crear

Igual que el DBML, más un índice único en (`articulo_id`, `usuario_calificador_id`): una
calificación por intercambio, garantizada también por la base.

### 3.3 `mensajes_marketplace` — crear

Igual que el DBML. Solo se usa si entra el chat (HU-06).

### 3.4 `transacciones_circular_credits` — crear

Igual que el DBML, con estos cambios:

| Cambio | Por qué |
|---|---|
| `monto_creditos` pasa de decimal(10,2) a **int** | `saldo_anterior` y `saldo_nuevo` ya son int; los valores de §7 son enteros |
| Nueva `origen` enum(`entrega`, `estrellas`, `retirada`, `ajuste`), not null | Para mostrar el origen en la billetera y aplicar el tope por intercambio |
| Nueva `solicitud_retiro_id` int, null, FK `solicitudes_retiro` | Para el 50 % por `retirada` (§7.3) |
| Índice único (`articulo_id`, `origen`) | Tope "uno por intercambio": una entrega y un bono por artículo |
| Índice único (`solicitud_retiro_id`) | Un otorgamiento por solicitud |

`tipo` se mantiene; todo lo de este spec es `bonificacion`.

### 3.5 `residuos_catalogo` — agregar `creditos`

`creditos` int, **null y sin llenar**. Mientras el valor sea el mismo para todos, el cálculo usa la
constante de §7. Así, cambiar el valor de prueba no exige otra migración.

### 3.6 Entidades

Nuevas entidades en `apps/backend/src/core/entities/` y alta en `ENTIDADES`
(`src/core/entities/index.ts`): es el único lugar donde TypeORM las registra (ver
`src/database/data-source.ts`). Por eso el PR 1 toca el núcleo y lo revisa backend ciudadano.

## 4. Estados del artículo

```
disponible ──"Lo quiero"──▶ en_negociacion ──entregar──▶ completado
    ▲  │                         │
    │  └──retirar──▶ retirado    │
    └──────────liberar───────────┘
```

| Acción | Desde | Hacia | Quién |
|---|---|---|---|
| Lo quiero | `disponible`, no vencido | `en_negociacion` | Cualquier vecino, salvo quien publicó |
| Liberar | `en_negociacion` | `disponible` (borra el comprador) | Quien publicó |
| Entregar | `en_negociacion` | `completado` | Quien publicó |
| Retirar | `disponible` | `retirado` | Quien publicó |

Un artículo está **vencido** si `fecha_expiracion` ya pasó. No cambia de estado: simplemente deja de
listarse y no admite "Lo quiero".

**Quién ve cada artículo** (decisión 9):

- `disponible` y no vencido: cualquier vecino con sesión.
- En cualquier otro caso: solo quien publicó y quien figura como comprador. Para el resto, **404**.

## 5. Endpoints

Todos bajo `/api`, con sesión (`arca_sesion`). La identidad sale siempre de la cookie, nunca del body.

### 5.1 Los que ya espera el frontend

| Método y ruta | Qué hace |
|---|---|
| `GET /marketplace/articulos?tipo=&categoria=&texto=&lat=&lon=&banda=` | Listado. Solo `disponible` y no vencidos. `banda` es opcional y requiere `lat`/`lon`; los artículos sin banda calculable quedan fuera cuando se filtra por banda. `@LimiteUbicacion()` |
| `GET /marketplace/articulos/:id?lat=&lon=` | Detalle, según la visibilidad de §4. `@LimiteUbicacion()` |
| `POST /marketplace/articulos` | Publicar. `multipart/form-data`: `tipo`, `titulo`, `descripcion?`, `residuoCatalogoId`, `foto?`, **`lat?`, `lon?`** (nuevos) |
| `GET /marketplace/mis-articulos` | Los de la sesión, todos los estados, más recientes primero |
| `PATCH /marketplace/articulos/:id/retirar` | `disponible` → `retirado`. 403 si no es propio, 409 si no está `disponible` |

### 5.2 Nuevos

| Método y ruta | Qué hace | Errores |
|---|---|---|
| `GET /marketplace/articulos/:id/foto` | Devuelve la imagen. Misma visibilidad que el detalle | 404 si no hay foto o no se puede ver |
| `POST /marketplace/articulos/:id/solicitar` | "Lo quiero" | 403 si es propio · 409 si no está `disponible` o está vencido |
| `PATCH /marketplace/articulos/:id/liberar` | Rechaza al interesado | 403 si no es propio · 409 si no está `en_negociacion` |
| `PATCH /marketplace/articulos/:id/entregar` | Cierra el intercambio y otorga los créditos de entrega (§7) | 403 si no es propio · 409 si no está `en_negociacion` |
| `POST /marketplace/articulos/:id/calificacion` | Body `{ puntuacion: 1-5, comentario?: string }`. Otorga el bono por estrellas (§7) | 403 si no es quien recibió · 409 si no está `completado` o ya calificó |
| `GET /creditos` | `{ saldo, movimientos[] }` de la sesión | — |

Las acciones que cambian el estado devuelven el `ArticuloMarketplace` actualizado.
`calificacion` responde 201 con `{ puntuacion, comentario, fecha }`.

### 5.3 Forma de las respuestas

`ArticuloMarketplace` es el del contrato del frontend. La tabla indica cómo se llenan algunos de sus
campos y agrega tres nuevos (en negrita):

| Campo | Tipo | Qué es |
|---|---|---|
| `fotoUrl` | string \| null | `/api/marketplace/articulos/:id/foto`, o null si no tiene |
| `creditos` | number | Créditos que otorga la entrega (hoy, `VALOR_BASE`) |
| `publicador.nombre` | string | `"Vecino de Santo Domingo"` (decisión 5) |
| `publicador.calificacionPromedio` / `cantidadCalificaciones` | number \| null / number | Calculados sobre `ratings` del publicador |
| **`fechaExpiracion`** | string (ISO) | Nuevo |
| **`soyReceptor`** | boolean | Nuevo. La sesión es quien reservó o recibió |
| **`puedoCalificar`** | boolean | Nuevo. `completado`, la sesión es quien recibió y todavía no calificó |

Movimiento de `GET /creditos`, más recientes primero:

```json
{
  "id": 12,
  "monto": 100,
  "origen": "entrega",
  "motivo": "Entrega de «Sofá de 3 cuerpos»",
  "saldoAnterior": 200,
  "saldoNuevo": 300,
  "fecha": "2026-09-30T15:04:00.000Z"
}
```

## 6. Foto

- Una por artículo, opcional. JPG, PNG o WebP, hasta **5 MB**.
- El tipo se valida por el **contenido del archivo** (firma de bytes), no solo por la extensión o el
  `Content-Type` que manda el cliente.
- Se guarda con un nombre aleatorio en la carpeta de la variable **`UPLOADS_DIR`**, fuera de lo que
  sirve el servidor web. En local, `./uploads`, que el PR 2 agrega a `.gitignore`. En cPanel la define
  quien despliega.
- Solo se entrega por `GET /marketplace/articulos/:id/foto`, con sesión y la visibilidad de §4.
- La lógica de subida queda en un servicio reutilizable: es la misma que después usarán las fotos de
  las solicitudes (Sprint 4).
- Si la foto se atrasa, el PR de publicar sale sin foto y ella entra después (lo permite el PDF).

## 7. Circular Credits

### 7.1 Constantes (valores de prueba)

Viven en un solo archivo, con el cálculo en una sola función, para cambiarlos sin tocar el resto.

| Constante | Valor |
|---|---|
| `VALOR_BASE` | 100 |
| `BONO_4_ESTRELLAS` | 50 (monto fijo). Con 5 estrellas, el doble: 100. Con 3 o menos, 0 |
| `TOPE_MENSUAL` | 1000 créditos por vecino |
| `TOPE_PAREJA` | 400 créditos por mes entre los mismos dos vecinos |
| `PORCENTAJE_RETIRADA` | 50 (%) |

La regla definitiva, proporcional al precio del catálogo (`residuos_catalogo.precio`), reemplazará
solo la función de cálculo.

### 7.2 Reglas

- Los créditos de la **entrega** (100 % de `VALOR_BASE`) y el **bono por estrellas** van a **quien
  regaló** (quien publicó).
- **Tope por intercambio:** un movimiento de `entrega` y uno de `estrellas` por artículo.
- **Tope mensual:** lo que gana un vecino en el mes calendario (hora de Chile) no supera `TOPE_MENSUAL`.
- **Tope por pareja:** lo generado por intercambios entre los mismos dos vecinos, en cualquier
  dirección y en el mes calendario, no supera `TOPE_PAREJA`.
- **Al llegar a un tope** se otorga hasta completarlo y el resto se pierde. El movimiento se registra
  igual, aunque sea de 0, con el motivo ("se alcanzó el tope mensual" o "…por pareja").
- Cada movimiento guarda `saldo_anterior` y `saldo_nuevo`. El saldo actual es el `saldo_nuevo` del
  último movimiento. Otorgar corre en una transacción que bloquea los movimientos del vecino, para que
  dos otorgamientos simultáneos no lean el mismo saldo.
- Si un cálculo da decimales, se redondea hacia abajo.

**Ejemplo con dos vecinos de prueba:** primer intercambio con 5 estrellas, 200 créditos; segundo,
otros 200 (la pareja llega a 400); tercero, 0 con el motivo del tope por pareja.

### 7.3 50 % por `retirada`

La función queda programada y probada (50 créditos al solicitante, sujetos al tope mensual), pero
**sin disparador**: hoy ningún endpoint pasa una solicitud a `retirada`. Ese endpoint es del panel
municipal (Benjamín). Se conecta en el Sprint 4.

## 8. Fuera de alcance

| Queda fuera | Por qué |
|---|---|
| Nombre real del vecino | Toca el núcleo y HU-38. Sprint 4 |
| Disparador del 50 % por `retirada` | Falta el endpoint del panel |
| Chat (HU-06) | Solo si sobra tiempo; es lo primero que se corta |
| Notificación al recibir créditos | HU-23 está fuera del sprint |
| Fotos en las solicitudes de retiro | Sprint 4; reutilizan el servicio de §6 |
| Migración de zona horaria | Va aparte: falta decidir columnas y fecha de corte (el cambio de horario de septiembre corre 4 h las filas anteriores y 3 h las posteriores) |

## 9. Plan de PRs

| # | Rama | Área | Contenido | Revisor |
|---|---|---|---|---|
| 0 | `2026-09-29-javier-spec-marketplace` | Documentación | Este spec | Miguel |
| 1 | `2026-09-29-javier-migracion-marketplace` | Base de datos + núcleo | §3: migración, entidades, DBML | Miguel (y Benjamín, migraciones) |
| 2 | `2026-09-29-javier-publicar-listar` | Backend ciudadano | §5.1, foto (§6) | Miguel |
| 3 | `2026-09-30-javier-entrega-estrellas` | Backend ciudadano | Solicitar, liberar, entregar, calificar | Miguel o Ana |
| 4 | `2026-10-01-javier-circular-credits` | Backend ciudadano | §7 y `GET /creditos` | Miguel o Maxi |

El PR 1 junta base de datos y núcleo porque una entidad sin su tabla hace fallar al backend al
arrancar. Cada PR actualiza `apps/backend/README.md` y `docs/BACKEND_FASE1.md` (regla A.10).

## 10. Para el frontend

- `apps/frontend/src/api/marketplace.ts` es de Miguel: este spec **no** lo modifica. Los cambios que
  implica son agregar `lat`/`lon` al publicar, `banda` opcional al listar, los tres campos nuevos de
  §5.3 y las llamadas de §5.2.
- El contrato actual muestra `creditos: 10` en los datos de ejemplo; el valor real vendrá del backend.

## 11. Discrepancias encontradas

- `residuos_catalogo.precio` existe en la base (migración `1782163600000`) y en la entidad, pero no en
  el DBML. Se agrega al DBML en el PR 1, junto con `creditos`.
