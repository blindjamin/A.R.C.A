# Spec: `listado-pagadas` — Listado de solicitudes pagadas con filtros y exportación

> **Estado:** BORRADOR — en implementación · **Fecha:** 2026-10-16
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`listado-pagadas`](MAPA_PANEL_MUNICIPAL.md#4-módulos) · **Depende de:** `ciclo-solicitud` (`estado_pago`, `monto`) · **Espera:** `datos-retiro` (dirección real, PR de Javier) y el comprobante de Webpay (HU-44)
> **Origen:** Repartición Sprint 4, Benjamín semana 1: «Listado de solicitudes pagadas con filtros por estado, fecha y sector, exportable a CSV o XLSX, con la dirección de retiro».

## 1. Objetivo

El municipio necesita ver **qué solicitudes ya se pagaron**, dónde hay que retirar y por cuánto,
y sacar ese listado a una planilla para conciliar los pagos o coordinar con la empresa. Hoy solo
existe el Excel por lote de `derivacion-excel`, que no filtra ni muestra lo ya derivado o cerrado.

**Usuarios:** funcionario y administrador del panel (`/admin`).

### Supuestos

1. **«Pagada» = `estado_pago = 'pagado'`.** El estado del pago es independiente del ciclo
   (`estado`). Cuando entre Webpay (HU-44), el pago confirmado seguirá dejando `pagado`.
2. **«Estado» del filtro es el `estado` del ciclo** (`aprobada`, `derivada`, `retirada`,
   `no_realizada`, etc.). Una pagada puede estar en cualquiera de esos estados.
3. **«Fecha» filtra `fecha_solicitud`**, igual que métricas y el resto del panel. Todavía no
   existe la fecha de pago. Cuando el comprobante de Webpay la guarde, se cambia el campo en un
   solo lugar (decisión abierta 1).
4. **«Sector» es el sector provisional más cercano** a las coordenadas capturadas, el mismo
   cálculo que usa el mapa de calor (`sectores.constants.ts`). Las que no tienen coordenadas van a
   «Sin ubicación».
5. **«Dirección de retiro»:** el campo real lo agrega Javier (`datos-retiro`). Mientras no exista,
   se muestra `direccion_anonimizada`, leída en **una sola función** (`direccionDe`) para que el
   cambio cuando llegue el campo sea de una línea.
6. **Sin datos del vecino:** ni nombre, ni RUN, ni correo, igual que el Excel de derivación.

### Criterios de aceptación

1. `GET /api/admin/pagadas` devuelve solo las solicitudes con `estado_pago = 'pagado'`, de la más
   nueva a la más antigua, con hasta 1000 filas.
2. Acepta los filtros opcionales `estado`, `desde`, `hasta` (ISO 8601, ambos inclusive) y
   `sector`, combinables. Un valor inválido, un rango invertido o un rango de más de 366 días
   responde **400**. Un parámetro desconocido también responde 400 (`forbidNonWhitelisted`).
3. Cada fila trae: id, fecha de solicitud, fecha de aprobación, estado, residuo, categoría,
   sector, dirección de retiro y monto.
4. `GET /api/admin/pagadas/exportar?formato=csv|xlsx` descarga **los mismos filtros** de la
   vista (hasta 50 000 filas), CSV por defecto. El CSV usa BOM UTF-8, `;`, CRLF y la protección
   contra inyección de fórmulas ya usada en la auditoría. El XLSX tiene la fila de títulos fija y
   autofiltro. Nombre: `arca-pagadas-AAAA-MM-DD.{csv|xlsx}`.
5. Cada descarga queda en la auditoría como `ACCESO` sobre `solicitudes_retiro`, con el formato,
   la cantidad de filas y los filtros. Nunca se copia el contenido.
6. `GET /api/admin/pagadas/sectores` devuelve los nombres de los sectores más «Sin ubicación»,
   para el selector del panel.
7. **Permisos:** admin y funcionario. Un vecino recibe 401 o 403.
8. **Panel:** sección «Pagadas» en la barra lateral, con filtros de estado, desde/hasta, sector,
   tabla con monto en pesos, total de filas y suma de montos, y botones «Descargar CSV» y
   «Descargar Excel» que respetan los filtros. Sin scroll horizontal de página a 375 px.

## 2. Diseño

### 2.1 Backend (`apps/backend/src/admin/pagadas/`)

| Archivo | Qué hace |
|---|---|
| `dto/filtro-pagadas.dto.ts` | `FiltroPagadasDto` (`estado?` `@IsEnum`, `desde?`/`hasta?` `@IsISO8601({strict:true})`, `sector?` `@IsIn(NOMBRES_SECTOR)`) y `ExportarPagadasDto` (+ `formato?` `@IsIn(['csv','xlsx'])`) |
| `pagadas-admin.service.ts` | `findAll(filtro)`, `exportar(filtro)`, `sectores()`; arma `where` con `estadoPago: PAGADO`, `estado`, rango sobre `fechaSolicitud`; trae el residuo con `relations`; calcula el sector y filtra por él en memoria |
| `pagadas-admin.controller.ts` | `@Controller('admin/pagadas')`, roles admin y funcionario; `exportar` audita y responde `StreamableFile` como la auditoría |
| `pagadas-admin.module.ts` | Registrado en el módulo admin, como `auditoria-admin` |
| `exportar-pagadas.ts` | Columnas del listado sobre las funciones genéricas de exportación |

Reutilización (no duplicar):

- **Exportación:** `celdaCsv`, `fechaLocal`, el CSV y el XLSX salen hoy de
  `admin/auditoria/exportar-auditoria.ts` atados a sus columnas. Se mueven a
  `admin/comun/exportar-tabla.ts` con la firma `generarCsv(columnas, filas)` /
  `generarXlsx(columnas, filas, nombreHoja)`; `exportar-auditoria.ts` queda solo con sus columnas.
  Sus pruebas actuales deben seguir pasando sin cambios de comportamiento.
- **Rango de fechas:** la validación (desde ≤ hasta, máximo 366 días) y el `Between` /
  `MoreThanOrEqual` / `LessThanOrEqual` salen de `auditoria-admin.service.ts` a
  `admin/comun/rango-fechas.ts` y los usan los dos servicios.
- **Sector:** `encontrarSectorMasCercano` de `mapa-calor.service.ts` pasa a una función exportada
  `sectorMasCercano(lat, lng)` en `sectores.constants.ts`; el mapa de calor la usa igual.

```ts
// Único punto que cambia cuando exista el campo de `datos-retiro`.
const direccionDe = (s: SolicitudRetiro): string => s.direccionAnonimizada ?? '';
```

`ponytail:` el filtro por sector se aplica en memoria tras la consulta, porque el sector no es una
columna. Con el volumen de una comuna alcanza; si crece, guardar el sector al crear la solicitud.

### 2.2 Columnas (vista y archivo)

| Columna | Origen |
|---|---|
| Solicitud | `id` |
| Fecha solicitud | `fecha_solicitud` (hora de Chile) |
| Fecha aprobación | `fecha_revision` (hora de Chile) |
| Estado | `estado`, con la etiqueta del panel |
| Residuo · Categoría | `residuos_catalogo.nombre` · `categoria` |
| Sector | sector más cercano o «Sin ubicación» |
| Dirección de retiro | `direccionDe(s)` |
| Monto | `monto` (CLP) |

### 2.3 Panel (`apps/frontend/src/admin/`)

- `pages/Pagadas.tsx`, ruta `/admin/pagadas`, entrada «Pagadas» en `AdminShell` después de
  «Derivación».
- Filtros con controles nativos (`<select>`, `<input type="date">`), igual que `Auditoria.tsx`:
  días locales convertidos a instantes con `inicioDelDia` / `finDelDia` (mover a un util común si
  ya están en `Auditoria.tsx`, no copiarlos).
- API en `api/admin.ts`: `fetchPagadas(filtro)`, `fetchSectoresPagadas()`,
  `descargarPagadas(filtro, formato)` sobre el `descargarArchivo` existente.
- Estado de carga, error y vacío («No hay solicitudes pagadas con estos filtros»).

## 3. Comandos

```bash
cd apps/backend && npm run lint && npm test -- --silent && npm run build
cd apps/frontend && npm run lint && npm run build
docker compose up -d          # MySQL local (arca-mysql)
```

## 4. Pruebas

- `pagadas-admin.service.spec.ts`: solo pagadas; cada filtro arma el `where` correcto; rango
  inválido → 400; filtro por sector y «Sin ubicación»; exportar usa los mismos filtros con tope
  50 000; `direccionDe`.
- `exportar-tabla.spec.ts` (o las de auditoría movidas): BOM, `;`, CRLF, inyección, XLSX como texto.
- `sectores.constants`: punto conocido → sector esperado.
- Manual: con la base local (hay ~112 pagadas en el seed), filtrar en el panel, descargar CSV y
  XLSX, revisar que el `ACCESO` aparece en la auditoría, y un funcionario puede usarlo.

## 5. Límites

- **Siempre:** filtros validados por DTO; auditar cada descarga; hora de Chile en archivos;
  protección contra inyección en CSV; cero datos personales del vecino.
- **Preguntar antes:** agregar columnas con datos personales (contacto, RUN); cambiar el campo de
  fecha; tocar migraciones o el esquema (este módulo no las necesita).
- **Nunca:** guardar el archivo en el servidor; agregar dependencias nuevas (`exceljs` ya está).

## 6. Entrega

Dos PR, uno por área (regla 2 del Sprint 4), apilados sobre la auditoría porque reutilizan su
exportación y su helper de descarga:

| PR | Rama | Base |
|---|---|---|
| Backend | `2026-10-16-benjamin-pagadas-backend` | rama del #97 |
| Panel | `2026-10-16-benjamin-pagadas-panel` | rama del #98 |

## 7. Decisiones abiertas

1. **Fecha de pago:** cuando el comprobante de Webpay la guarde, ¿el filtro «fecha» pasa a ser la
   fecha de pago? (propuesta: sí).
2. **Dirección real:** al integrarse `datos-retiro`, cambiar `direccionDe`. Si la dirección es de
   un tercero, la decisión del PO sobre el Excel de la empresa aplica también aquí.
