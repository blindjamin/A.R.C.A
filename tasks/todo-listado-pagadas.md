# Tareas: Listado de solicitudes pagadas

> Spec: [`SPEC-listado-pagadas.md`](../docs/specs/SPEC-listado-pagadas.md) · Plan: [`plan-listado-pagadas.md`](plan-listado-pagadas.md)
> Comandos: `cd apps/backend && npm run lint && npm test -- --silent && npm run build` · `cd apps/frontend && npm run lint && npm run build`

## T1: Extraer exportación genérica y rango de fechas

**Descripción:** Mover `celdaCsv`, `fechaLocal`, CSV y XLSX de `admin/auditoria/exportar-auditoria.ts`
a `admin/comun/exportar-tabla.ts` con columnas como parámetro, y la validación/condición de rango de
fechas de `auditoria-admin.service.ts` a `admin/comun/rango-fechas.ts`. Refactor puro.

**Criterios de aceptación:**
- [x] `generarCsv(columnas, filas)` y `generarXlsx(columnas, filas, nombreHoja)` genéricos; `exportar-auditoria.ts` solo define sus columnas y el nombre del archivo
- [x] `condicionRango(desde?, hasta?)` devuelve la condición TypeORM o `undefined` y lanza 400 si el rango está invertido o pasa de 366 días
- [x] Las pruebas de auditoría pasan sin cambiar aserciones (solo imports)

**Verificación:** `npm test -- auditoria exportar` · `npm run lint` · `npm run build`
**Dependencias:** ninguna
**Archivos:** `admin/comun/exportar-tabla.ts`, `admin/comun/rango-fechas.ts`, `admin/auditoria/exportar-auditoria.ts`, `admin/auditoria/auditoria-admin.service.ts`, specs
**Tamaño:** M

## T2: `sectorMasCercano` reutilizable

**Descripción:** Pasar `encontrarSectorMasCercano` de `mapa-calor.service.ts` a una función exportada
en `sectores.constants.ts`, con `SIN_UBICACION = 'Sin ubicación'` y `NOMBRES_SECTOR`.

**Criterios de aceptación:**
- [x] `sectorMasCercano(lat, lng)` exportada; el mapa de calor la usa y su comportamiento no cambia
- [x] Prueba: centroide de un sector → ese sector

**Verificación:** `npm test -- mapa-calor sectores` · lint · build
**Dependencias:** ninguna
**Archivos:** `admin/mapa-calor/sectores.constants.ts`, `admin/mapa-calor/mapa-calor.service.ts`, spec nueva
**Tamaño:** S

## T3: Módulo `pagadas`: listado con filtros

**Descripción:** `GET /api/admin/pagadas` y `GET /api/admin/pagadas/sectores` (spec §1 criterios 1–3, 6, 7; §2.1, §2.2).

**Criterios de aceptación:**
- [x] Solo `estado_pago = 'pagado'`, orden `fechaSolicitud DESC, id DESC`, tope 1000, con residuo
- [x] Filtros `estado`, `desde`/`hasta` (vía `condicionRango`), `sector` (en memoria, con `ponytail:`); inválidos → 400
- [x] Fila: `id, fechaSolicitud, fechaRevision, estado, residuo, categoria, sector, direccion, monto`; dirección vía `direccionDe`
- [x] Admin y funcionario; registrado en `app.module.ts`

**Verificación:** `pagadas-admin.service.spec.ts` · lint · build
**Dependencias:** T1, T2
**Archivos:** `admin/pagadas/dto/filtro-pagadas.dto.ts`, `pagadas-admin.service.ts`, `pagadas-admin.controller.ts`, `pagadas-admin.module.ts`, `app.module.ts`, spec
**Tamaño:** M

## T4: Exportación auditada y documentación

**Descripción:** `GET /api/admin/pagadas/exportar?formato=csv|xlsx` (spec criterios 4–5) y docs.

**Criterios de aceptación:**
- [x] Mismos filtros que la vista, tope 50 000, archivo `arca-pagadas-AAAA-MM-DD.{csv|xlsx}`, `Cache-Control: no-store`
- [x] `ACCESO` en `solicitudes_retiro` con `{ exportacion, filas, ...filtro }`
- [x] Fila nueva en `MAPA_PANEL_MUNICIPAL.md` (§4 y §8) y en `SEGURIDAD_ARQUITECTURA.md` §4

**Verificación:** pruebas de `exportar-pagadas` · lint · build
**Dependencias:** T3
**Archivos:** `admin/pagadas/exportar-pagadas.ts`, controller, spec, 2 docs
**Tamaño:** M

## Checkpoint A: Backend
- [x] lint, pruebas y build en verde
- [x] curl contra la base local (filtros, 400, CSV, XLSX, `ACCESO`, rol funcionario)

## T5: Cliente API del panel

**Descripción:** En `admin/api/admin.ts`: tipos `FiltroPagadas`, `SolicitudPagada`;
`fetchPagadas`, `fetchSectoresPagadas`, `descargarPagadas` sobre `descargarArchivo`. Mover
`inicioDelDia`/`finDelDia` de `Auditoria.tsx` a un módulo compartido.

**Criterios de aceptación:**
- [x] Funciones y tipos según el contrato del spec §2.2; sin duplicar helpers
- [x] `Auditoria.tsx` usa los helpers movidos sin cambiar su comportamiento

**Verificación:** `npm run lint && npm run build` (frontend)
**Dependencias:** contrato del spec (no el código de T3/T4)
**Archivos:** `admin/api/admin.ts`, `admin/pages/Auditoria.tsx`, util de fechas
**Tamaño:** S

## T6: Página «Pagadas»

**Descripción:** `admin/pages/Pagadas.tsx`, ruta en `AdminApp.tsx`, entrada en `AdminShell.tsx` (spec criterio 8, §2.3).

**Criterios de aceptación:**
- [x] Filtros nativos, tabla, total de filas y suma de montos en CLP, estados de carga/error/vacío
- [x] Botones «Descargar CSV» y «Descargar Excel» con los filtros activos
- [x] Sin scroll horizontal de página a 375 px; mismo lenguaje visual que `Auditoria.tsx`

**Verificación:** lint · build · navegador a 1280 y 375 px
**Dependencias:** T5
**Archivos:** `admin/pages/Pagadas.tsx`, `admin/AdminApp.tsx`, `admin/components/AdminShell.tsx`
**Tamaño:** M

## Checkpoint B: Completo
- [x] Todo en verde y probado en el navegador
- [ ] Revisión del humano antes de commit/PR
