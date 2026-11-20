# Spec: `dashboard-metricas` — Indicadores de la gestión de solicitudes

> **Estado:** BORRADOR — implementado en el panel; pendiente de revisión del equipo · **Fecha:** 2026-09-17
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`dashboard-metricas`](MAPA_PANEL_MUNICIPAL.md#4-módulos) · **Depende de:** `revision-solicitudes`, `derivacion-excel`

## 1. Objetivo

Que funcionarios y admin vean, para un rango de fechas, **cómo va la gestión**: cuántas solicitudes
llegan, cuánto tardan en revisarse, qué se decide y por qué, cuánto se deriva a la empresa y con
qué resultado.

### Criterios de aceptación

1. **Rango:** últimos 7, 30 o 90 días (30 por defecto). Todas las cifras, salvo la cola actual,
   se calculan dentro del rango.
2. **Indicadores:**
   - Solicitudes recibidas en el rango y serie por día.
   - Cola actual: en revisión y cuántas llevan más de 48 horas.
   - Tiempo promedio desde la solicitud hasta la primera decisión, en horas.
   - Decisiones de revisión por tipo y motivos más usados.
   - Solicitudes por categoría de residuo.
   - Derivación: lotes generados, solicitudes derivadas, retiradas y no realizadas.
   - Recaudación registrada (maqueta de pago): suma de montos pagados.
3. **Solo agregados:** la respuesta no trae ninguna fila individual, id de vecino, descripción ni
   dirección. El mapa por sector sigue en «Mapa de calor».
4. **Permisos:** admin y funcionario. La consulta no se audita: no expone datos personales.

## 2. Diseño

### 2.1 API (`apps/backend-admin`)

`GET /api/admin/metricas?dias=7|30|90` → objeto con los indicadores del punto 2. Sin cambios de
esquema: se leen `solicitudes_retiro`, `revisiones_solicitud` y `lotes_derivacion`.

El cálculo es una **función pura** (`calcularMetricas`) sobre filas con columnas mínimas, para
poder probarla sin base de datos. El volumen de una comuna lo permite; si crece, se pasa a
consultas agregadas en SQL sin cambiar el contrato.

### 2.2 Panel (`apps/admin-web`)

- Sección **«Métricas»** en la barra lateral.
- Selector de rango, tarjetas con los indicadores y barras simples hechas con CSS (sin librería de
  gráficos nueva).

## 3. Límites

- **Siempre:** solo agregados en la respuesta.
- **Preguntar antes:** exportar las métricas; agregar una librería de gráficos; métricas por
  funcionario (es evaluación de desempeño y requiere acuerdo).
- **Nunca:** mostrar filas individuales en esta pantalla.

## 4. Pruebas

- Unitarias de `calcularMetricas`: rango, cola y atrasadas, promedio de revisión con la primera
  decisión, conteos por decisión, motivo y categoría, derivación y recaudación.
- Manual en el panel: cambiar el rango y comparar con los datos locales.

## 5. Decisiones abiertas

1. **Métricas por funcionario** (carga de trabajo): útiles para el admin, pero sensibles.
2. **Zona horaria:** las columnas con `DEFAULT CURRENT_TIMESTAMP` se leen con desfase porque la
   conexión de TypeORM no define `timezone`. Afecta a la serie por día; se corrige en la
   configuración compartida de los backends (coordinar con back ciudadano).
