# A.R.C.A. — Panel admin

Panel municipal, app Vite independiente (puerto **5174**), separada del frontend ciudadano
(`apps/frontend`) en la migración de separación del panel admin (2026-09-01, Fase 1). No es un
npm workspace: `npm install` propio, igual que `apps/frontend`.

Habla con `apps/backend-admin` (puerto 3001), no con el backend ciudadano.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```

## Variables de entorno

`.env.local`:

```env
VITE_API_URL=/api
```

`vite.config.ts` proxea `/api` a `http://localhost:3001`.

## Estructura

```
src/
├── api/admin.ts          ← tipos y fetchers, copiados/movidos de apps/frontend/src/api/arca.ts
├── components/
│   ├── AdminShell.tsx    ← layout de escritorio (sidebar), reemplaza el header por pantalla
│   │                        que tenían Solicitudes/Auditoria antes de la migración
│   ├── RevisionSolicitud.tsx ← tarjeta «Revisión» (checklist, motivos, categoría), historial y
│   │                            notas internas (docs/specs/SPEC-revision-solicitudes.md)
│   └── ui/               ← copia de 6 átomos de apps/frontend — ver deuda abajo
└── pages/
    ├── Solicitudes.tsx   ← ex AdminSolicitudes.tsx; cola «En revisión» con aviso +48 h y toma
    │                        automática al abrir el detalle
    ├── Metricas.tsx      ← indicadores con rango de 7/30/90 días, barras en CSS
    │                        (docs/specs/SPEC-dashboard-metricas.md)
    ├── Derivacion.tsx    ← lotes para la empresa operadora: generar y descargar el Excel
    │                        (docs/specs/SPEC-derivacion-excel.md)
    ├── MapaCalor.tsx     ← Mapa de calor por sectores (HU-07)
    └── Auditoria.tsx     ← ex AdminAuditoria.tsx; registro de auditoría real, solo rol admin (HU-14)
```

## Ciclo de solicitud (replanteo del 2026-09-17)

Los retiros los ejecuta una empresa **externa**: el panel no asigna operadores. La pantalla de
Solicitudes muestra solo las acciones que el backend devuelve en `transicionesDisponibles`, y las
decisiones de revisión (aprobar, pedir modificación, rechazar) van por la tarjeta «Revisión».
Specs: [mapa del panel](../../docs/specs/MAPA_PANEL_MUNICIPAL.md) ·
[pendientes del equipo](../../docs/PENDIENTES_EQUIPO.md).

**Deuda declarada:** `MOTIVOS_POR_DECISION` e `ITEMS_CHECKLIST_APROBACION` en `api/admin.ts`
son copia de `@arca/core` (este proyecto no puede importar el paquete). Si cambian allá, hay
que copiarlos; mientras tanto el backend responde 400 y no guarda nada inválido.

## Deuda declarada: UI Kit duplicado

`src/components/ui/` es una **copia**, no la fuente de verdad — esa sigue siendo
`apps/frontend/src/components/ui/`. Si el UI Kit cambia allá (colores, tokens, comportamiento
de un átomo), evaluar si hace falta traer el cambio acá también. Los seis átomos copiados:
`BackButton`, `EmptyState`, `EstadoPill`, `estadoMeta`, `ListItemCard`, `IconBadge`.

## Deuda declarada: sin login ni guard de sesión

Esta app **no tiene** su propio login de ClaveÚnica ni un guard de sesión — cualquiera con la
URL entra directo (`App.tsx` no envuelve las rutas en nada). Es la migración tal cual del hueco
que ya tenía `apps/frontend` en la ruta `/admin` antes de esta separación: no se arregló de
paso (regla A.4), se movió y se reportó.

En la práctica, esto significa que las llamadas a `apps/backend-admin` (que sí exige
`Authorization: Bearer`) devuelven `401` hasta que exista un login real. **Tarea siguiente:**
login ClaveÚnica propio de esta app + guard real.
