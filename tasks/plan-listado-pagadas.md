# Plan de implementación: Listado de solicitudes pagadas

> **Fecha:** 2026-10-16 · **Autor:** Benjamín Paicil (con asistencia de IA)
> **Spec:** [`docs/specs/SPEC-listado-pagadas.md`](../docs/specs/SPEC-listado-pagadas.md) · **Tareas:** [`todo-listado-pagadas.md`](todo-listado-pagadas.md)
> (Archivos aparte porque `plan.md` y `todo.md` siguen abiertos con la reunificación.)

## Resumen

Pantalla «Pagadas» en el panel para ver las solicitudes con `estado_pago = 'pagado'`, filtrarlas
por estado, fecha y sector, y descargarlas en CSV o XLSX con la dirección de retiro. Reutiliza la
exportación y el rango de fechas de la auditoría (#97/#98) y el cálculo de sector del mapa de calor.

## Decisiones de arquitectura

- **Dos PR por área**, apilados: el backend sale de la rama del #97 y el panel de la rama del #98,
  porque reutilizan `exportar-auditoria.ts` y `descargarArchivo`.
- **Primero se extrae, después se construye:** las tareas 1 y 2 son refactor sin cambio de
  comportamiento (las pruebas existentes son la red); así el módulo nuevo no copia código.
- **Sin migración:** el sector se calcula, la dirección sale de `direccionDe()` (un punto de cambio
  para `datos-retiro`).

## Grafo de dependencias

```
T1 exportar-tabla + rango-fechas ─┐
T2 sectorMasCercano ──────────────┼─► T3 listado + filtros ─► T4 exportar + auditoría
                                  │                                │
                                  │                    (contrato de la API, §2 del spec)
                                  │                                ▼
                                  └──────────── T5 cliente API ─► T6 página Pagadas
```

T5 y T6 solo dependen del contrato de la API del spec, no del código del backend.

## Lista de tareas

### Fase 1: Backend (rama `2026-10-16-benjamin-pagadas-backend`, base #97)
- [x] T1: Extraer exportación genérica y rango de fechas a `admin/comun/`
- [x] T2: Exportar `sectorMasCercano` desde `sectores.constants.ts`
- [x] T3: Módulo `pagadas`: listado con filtros y sectores
- [x] T4: Exportación CSV/XLSX auditada y documentación

### Checkpoint A: Backend
- [x] lint, 437+ pruebas y build en verde
- [x] curl contra la base local: filtros, 400, descarga, `ACCESO` en auditoría, funcionario permitido

### Fase 2: Panel (rama `2026-10-16-benjamin-pagadas-panel`, base #98)
- [x] T5: Cliente API y utilidades de fecha compartidas
- [x] T6: Página «Pagadas», ruta y entrada en la barra lateral

### Checkpoint B: Completo
- [x] lint y build del frontend
- [x] Navegador a 1280 px y 375 px: filtros, totales, descargas, sin scroll horizontal
- [ ] Revisión del humano antes de commit/PR

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El refactor de T1 rompe la exportación de la auditoría | Alto | Las pruebas de #97 deben pasar sin cambiar aserciones |
| Javier cambia el nombre del campo de dirección | Medio | `direccionDe()` es el único punto de lectura |
| El #97 cambia en revisión y hay que rebasar | Medio | Rebase de la rama backend sobre la del #97 antes del PR |
| Filtro por sector en memoria | Bajo | Tope de filas; comentario `ponytail:` con la salida |

## Preguntas abiertas

Ver §7 del spec (fecha de pago y dirección real).
