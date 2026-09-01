# Frontend Fase 1 — Resumen de implementación

> **Integrado en:** `develop` (rama de trabajo `mvp` + sprint 2)
> **Última actualización:** 2026-08-31
> **Equipo:** COM Tech — Feria de Software 2026

Documento de hito que resume la implementación del frontend (PWA ciudadana y panel de administración) y
sirve como **base para la documentación futura** del módulo. A medida que se agreguen
pantallas y épicas, extender las secciones correspondientes.

> **Migración de separación del panel admin (2026-09-01):** las pantallas de panel
> administrativo que describe este documento (`AdminSolicitudes`, `AdminAuditoria`,
> `AsignarRetiroModal`) **ya no viven en `apps/frontend`** — se movieron a `apps/admin-web`,
> una app independiente (puerto 5174). El contenido de abajo describe el trabajo tal como se
> hizo (sigue siendo válido como historia), pero las rutas de archivo ya no aplican; ver
> [`../apps/admin-web/README.md`](../apps/admin-web/README.md) por la ubicación actual.

---

## Objetivo de esta fase

Montar la **base del frontend (Fase 1 y extensiones de Sprint 2)** consumiendo exactamente lo que el backend ya
expone (épica **EP-01** y panel **EP-03**), con estética alineada a los prototipos oficiales y un flujo
ciudadano y administrativo de punta a punta:

- App PWA React conectada a la API NestJS local
- **Sistema de diseño A.R.C.A.** (UI Kit v1.0) aplicado: tokens, tipografía, shell mobile y adaptabilidad desktop
- Flujo "Solicitar retiro" con **esqueleto de IA** (captura → análisis → sugerencia → éxito)
- Catálogo, creación y seguimiento de solicitudes contra el backend real
- **Login temporal y diferido** según perfil (`vecino` vs `funcionario`)
- **Panel administrativo:** gestión y cambio de estados de solicitudes, asignación/programación con operadores (HU-08) y registro de auditoría con KPIs (HU-13)

---

## Stack implementado

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | React 18 + TypeScript | |
| Build/dev | Vite | dev server en `http://localhost:5173` |
| Estilos | Tailwind CSS **v3** | tokens del UI Kit en `tailwind.config.js` |
| Ruteo | react-router-dom | rutas protegidas por sesión y rol admin |
| Estado/API | `fetch` nativo + Context | migrar a Redux Toolkit cuando crezca el estado |

---

## Sistema de diseño (UI Kit v1.0)

Tokens espejados de los standalone de referencia (`ARCA UI Kit` / `ARCA Prototipo`) en
[`tailwind.config.js`](../apps/frontend/tailwind.config.js), con clases reutilizables en
[`index.css`](../apps/frontend/src/index.css).

| Token | Valor |
|---|---|
| Tipografía | Bricolage Grotesque (display) · Hanken Grotesk (body) |
| Verde (primario) | escala `green-50…900` (`700 #0F6B45`) |
| Dorado (Circular Credits) | `gold-50…600` (`500 #ef9d24`) |
| Rose / Sky | alertas / info |
| Neutros | `ink`, `slate`, `line`, `canvas #f3f6f3` |
| Radios | `sm 12 · md 18 · lg 24 · xl 30 · pill` |
| Sombras | `sm/md/lg` + glows `green`/`gold` |

Clases listas: `.card`, `.btn-primary/-gold/-outline/-ghost`, `.pill`, `.field`, `.chip`.

**Shell y adaptación responsiva:** columna `max-w-md` centrada en vistas móviles para emular el prototipo ciudadano, con headers y layouts adaptables (vistas desktop con contenedores `max-w-6xl` y grids responsivos para listados, modales y tablas administrativas).

---

## Estructura del frontend

```
apps/frontend/
├── .env.local                  # VITE_API_URL=/api (ruta relativa, no versionado)
├── vite.config.ts              # proxy /api -> localhost:3000 + allowedHosts (ver SETUP_LOCAL §10)
├── tailwind.config.js          # tokens del UI Kit (colores, fuentes, radios, sombras)
├── postcss.config.js
└── src/
    ├── main.tsx                # entrypoint
    ├── App.tsx                 # router: rutas propias, /admin, /admin/auditoria + features
    ├── index.css               # base + clases de componentes + animaciones (scan/success)
    ├── api/
    │   └── arca.ts             # capa fetch tipada (catálogo, solicitudes, auditoría, robustez JSON)
    ├── auth/
    │   └── SessionContext.tsx  # login temporal (usuario dev en localStorage y roles)
    ├── components/
    │   ├── AppShell.tsx        # Protected/Shell (RequireAdmin se quitó: sin uso tras mover /admin)
    │   ├── AsignarRetiroModal.tsx # modal interactivo de asignación/programación (HU-08)
    │   └── ui/                 # primitivos reutilizables entre módulos:
    │       ├── IconBadge.tsx, EstadoPill.tsx (+estadoMeta.ts), ListItemCard.tsx,
    │       └── ScreenHeader.tsx, EmptyState.tsx, BackButton.tsx, PriceTag.tsx
    ├── config/
    │   └── modulos.ts          # registro de módulos del Inicio (fuente de verdad del menú)
    ├── features/
    │   └── solicitud-retiro/   # módulo propio del flujo "Solicitar retiro":
    │       ├── routes.tsx              # bloque de <Route> que App.tsx monta entero
    │       ├── SolicitudFlowContext.tsx
    │       ├── CapturaResiduo.tsx, AnalizandoIA.tsx, SugerenciasIA.tsx,
    │       └── Catalogo.tsx, NuevaSolicitud.tsx, SolicitudCreada.tsx
    └── pages/
        ├── Login.tsx              # hero verde + CTA dorado ClaveÚnica (responsive layout)
        ├── SeleccionInicio.tsx    # login diferido: elegir modo vecino/funcionario
        ├── Inicio.tsx             # dashboard: tarjeta de impacto (demo) + grid de módulos
        ├── MisSolicitudes.tsx     # listado y detalle de solicitudes ciudadanas
        ├── AdminSolicitudes.tsx   # panel municipal: listar/filtrar/estados + modal HU-08
        ├── AdminAuditoria.tsx     # panel municipal: logs de trazabilidad y KPIs
        └── Proximamente.tsx       # placeholder reutilizable (retiro municipal, marketplace)
```

> **Por qué `features/` separado de `pages/`:** el flujo de solicitud (6 pantallas + su
> estado compartido) se movió a su propio módulo para poder editarlo sin tocar el resto
> de las rutas de la app. `pages/` queda para pantallas que son islas independientes.

---

## Capa de API (`src/api/arca.ts`)

Punto único de contacto con el backend. Lee la URL base de `import.meta.env.VITE_API_URL`.
Expone funciones tipadas e interfaces del dominio (`ResiduoCatalogo`, `SolicitudRetiro`,
`EstadoSolicitud`, `AuditoriaLog`, `AuditoriaStats`).

| Función | Endpoint backend / Fuente | Propósito |
|---|---|---|
| `fetchCatalogo()` | `GET /api/residuos/catalogo` | Listado oficial de residuos y precios |
| `crearSolicitudRetiro(data)` | `POST /api/solicitudes-retiro` | Registro de nueva solicitud ciudadana |
| `fetchMisSolicitudes(uuid)` | `GET /api/solicitudes-retiro?usuarioCiudadanoId={uuid}` | Solicitudes del ciudadano actual |
| `fetchSolicitudesAdmin(estado?)` | `GET /api/admin/solicitudes?estado={estado}` (hoy en `apps/admin-web/src/api/admin.ts`, contra `apps/backend-admin`) | Panel de administración |
| `actualizarSolicitud(id, data)` | `PATCH /api/solicitudes-retiro/{id}` | Cambio de estado / asignación (HU-08) |
| `cancelarSolicitud(id, uuid, motivo?)` | `PATCH /api/solicitudes-retiro/{id}/cancelar` | Cancelación de solicitud |
| `fetchPerfilAcceso(uuid)` | `GET /api/usuarios/{uuid}/perfil-acceso` | Roles y contexto (vecino/funcionario) |
| `fetchAuditoriaLogs()` | Mock / Endpoint trazabilidad | Lista de logs de auditoría (HU-13) |
| `fetchAuditoriaStats()` | Mock / Endpoint trazabilidad | Resumen y KPIs de auditoría |

`API_URL` es `/api` (ruta relativa) — Vite la proxea a `localhost:3000`. Todas las llamadas
mandan el header `ngrok-skip-browser-warning` (inofensivo fuera de ngrok, necesario cuando
se accede vía túnel; ver `docs/SETUP_LOCAL.md` §10). Se incluye manejo defensivo de respuestas HTTP
para prevenir errores ante respuestas vacías o no JSON.

### Precio real + ícono por categoría

La entidad `ResiduoCatalogo` del backend expone `precio` real en CLP (columna agregada por
la migración `1782163600000-replace-catalogo-precios-reales`, 26 ítems del catálogo
municipal). El ícono sigue siendo puramente visual, sin equivalente en la base de datos:

| Helper (`arca.ts`) | Qué hace |
|---|---|
| `iconoPorCategoria(categoria)` | emoji por categoría |
| `formatearPrecio(clp)` | formato `es-CL` (`$21.176`) |

El precio se muestra con el componente `<PriceTag amount={item.precio} />`
(`components/ui/PriceTag.tsx`), que envuelve `formatearPrecio`.

---

## Identidad temporal (`src/auth/SessionContext.tsx`)

Mientras no exista auth real, un `SessionContext` guarda el `usuarioCiudadanoId` (el
usuario dev `00000000-0000-4000-8000-000000000001`) en estado + `localStorage`.

- `login()` — setea el UUID dev (lo dispara la pantalla de Login).
- `logout()` — limpia la sesión.
- `useSession()` — hook para leer el id y el perfil de acceso en cualquier pantalla.

**Diseñado para el futuro (EP-05):** cuando llegue ClaveÚnica/JWT, solo cambia el interior
de `login()` (guardar token, derivar el id del token) y se deja de enviar
`usuarioCiudadanoId` en el body. **Las pantallas no cambian.**

---

## Pantallas (`src/pages/`)

| Pantalla | Módulo | Ruta | Endpoint / datos | Tipo |
|---|---|---|---|---|
| `Login` | `pages/` | `/login` | — | placeholder / responsive |
| `SeleccionInicio` | `pages/` | `/` (si es funcionario) | — | login diferido |
| `Inicio` | `pages/` | `/inicio` | tarjeta de impacto **demo** | hub |
| `CapturaResiduo` | `features/solicitud-retiro/` | `/solicitar` | cámara/galería (solo visual) | esqueleto |
| `AnalizandoIA` | `features/solicitud-retiro/` | `/solicitar/analizando` | scan mock (~2.2s) | esqueleto |
| `SugerenciasIA` | `features/solicitud-retiro/` | `/solicitar/sugerencias` | `GET /api/residuos/catalogo` (detección mock) | esqueleto |
| `Catalogo` | `features/solicitud-retiro/` | `/catalogo` | `GET /api/residuos/catalogo` (precio real) | **backend** |
| `NuevaSolicitud` | `features/solicitud-retiro/` | `/nueva-solicitud` | `POST /api/solicitudes-retiro` | **backend** |
| `SolicitudCreada` | `features/solicitud-retiro/` | `/solicitud/creada` | SuccessRing + 2 CTAs | esqueleto |
| `MisSolicitudes` | `pages/` | `/mis-solicitudes` | `GET /api/solicitudes-retiro?usuarioCiudadanoId=` | **backend** |
| `AdminSolicitudes` | `pages/` | `/admin` | `GET/PATCH /api/solicitudes-retiro` | **backend** + HU-08 |
| `AdminAuditoria` | `pages/` | `/admin/auditoria` | Logs y estadísticas de auditoría | **admin** (HU-13) |
| `Proximamente` | `pages/` | `/retiro-municipal`, `/marketplace/subir` | — | placeholder |

- Las rutas (salvo `/login`) están envueltas en `RequireSession`: sin sesión → redirige a `/login`.
- ~~Las rutas `/admin` y `/admin/auditoria` están protegidas por `RequireAdmin`~~ — en realidad
  solo `/admin/auditoria` lo estaba; `/admin` nunca tuvo el gate (dato ya inexacto antes de la
  migración). Ambas rutas se movieron a `apps/admin-web` sin `RequireAdmin`: la app entera no
  tiene guard de sesión todavía (deuda declarada, ver su README).
- **Tras el login se cae en `/inicio`** (el hub); el catch-all `*` también redirige ahí.
- Estados de carga/error manejados localmente con `useState`.
- El tab "Solicitar" arranca el flujo en `/solicitar` (cámara); el catálogo queda como rama alterna.
- La foto capturada viaja entre pantallas vía `SolicitudFlowProvider` (en memoria).
- `MisSolicitudes` muestra el nombre del residuo (el GET incluye la relación `residuoCatalogo`).

### Flujo "Solicitar retiro" con IA (esqueleto)

```
📷 /solicitar → /solicitar/analizando → /solicitar/sugerencias
                                              ├─ sugerencia → /nueva-solicitud?residuo=ID
                                              └─ manual     → /nueva-solicitud
                                                                    ↓ POST (backend)
                                                          /solicitud/creada
                                                              ├─ Retiro municipal (placeholder)
                                                              ├─ Subir a Marketplace (placeholder)
                                                              └─ Ver mis solicitudes
```

> La cámara, el análisis IA y las pantallas post-creación son **estáticos**; lo único que
> pega al backend es el catálogo y la creación/listado de solicitudes (EP-01).

### Inicio como hub dirigido por configuración (`src/config/modulos.ts`)

La pantalla `Inicio` es el menú central de la app y se construye sola a partir del
arreglo `MODULOS`. Cada módulo declara: `id`, `titulo`, `descripcion`, `icono`, `ruta?`,
`activo` y `epica`.

- Tarjetas **activas** (hoy: Solicitar retiro, Mis solicitudes — EP-01) son clickeables.
- Tarjetas **`activo: false`** se muestran atenuadas con badge "Próximamente"
  (Marketplace EP-02, Mis créditos EP-04, Panel municipal EP-03).
- El orden (activos primero) se resuelve en el render, no en el config.

**Cómo agregar un módulo nuevo:** añadir un objeto a `MODULOS`. Cuando su endpoint exista,
cambiar `activo: false → true` y completar `ruta`. **`Inicio.tsx` no se modifica.**

---

## Panel Administrativo y Asignación (EP-03 / Sprint 2)

### 1. Asignación y Programación de Retiros (HU-08)
Implementado mediante el componente interactivo `AsignarRetiroModal.tsx` integrado en el detalle de cada solicitud en `AdminSolicitudes.tsx`:
- **Selección de fecha:** Selector de fecha de retiro programada.
- **Franjas horarias:** Selección rápida entre turnos *Mañana (09:00 - 13:00)*, *Tarde (14:00 - 18:00)* o *Personalizada* con selector manual de hora.
- **Operador asignado:** Selector dinámico de operadores municipales en servicio.
- **Persistencia:** Al confirmar, se invoca `actualizarSolicitud()` actualizando `estado: 'asignada'`, `operadorAsignadoId` y `fechaProgramada` en formato ISO.

### 2. Trazabilidad y Logs de Auditoría (HU-13)
Pantalla `/admin/auditoria` (`AdminAuditoria.tsx`) accesible desde la barra superior de navegación del panel administrativo:
- **Tarjetas de KPIs:** Total de eventos registrados, acciones ciudadanas, intervenciones de operadores y eventos críticos / cancelaciones.
- **Buscador en tiempo real:** Filtrado instantáneo por usuario, descripción de acción u objeto afectado.
- **Filtros por categoría:** Botones de filtro rápido (`Todos`, `Solicitudes`, `Operadores`, `Cancelaciones`, `Sistema`).
- **Diseño híbrido responsivo:** En pantallas de escritorio se visualiza una tabla de trazabilidad formal con timestamps e IPs; en dispositivos móviles se despliega una lista compacta de tarjetas con badges contextuales.

---

## Setup en otro PC — levantar el frontend

> Para levantar **MySQL + backend** (Docker, migraciones, API) sigue primero
> [`SETUP_LOCAL.md`](./SETUP_LOCAL.md) y [`BACKEND_FASE1.md`](./BACKEND_FASE1.md).
> Esta sección cubre **solo el frontend**, que necesita el backend ya corriendo en
> `http://localhost:3000`.

### Prerrequisitos
- **Node.js 18+** (`node -v`) y **npm** (viene con Node). Para esta fase se usó Node 24 LTS.
- Backend levantado y respondiendo (`curl http://localhost:3000/api/health` → `{"status":"ok",...}`).

### Pasos
```bash
# 1. Clonar y ubicarse en develop (rama de trabajo)
git clone https://github.com/blindjamin/A.R.C.A.git
cd A.R.C.A
git checkout develop
git pull origin develop

# 2. Instalar dependencias del frontend
cd apps/frontend
npm install

# 3. Crear el archivo de entorno (no está versionado)
#    Crear apps/frontend/.env.local con el contenido:
#       VITE_API_URL=/api

# 4. Levantar el dev server
npm run dev        # abre http://localhost:5173
```

> **Windows (PowerShell):** crea el `.env.local` con
> `"VITE_API_URL=/api" | Out-File -Encoding utf8 apps/frontend/.env.local`
> o simplemente con el editor de texto.
>
> Nota: `VITE_API_URL` es una ruta **relativa** — Vite la proxea a `localhost:3000`
> (`vite.config.ts`), así el mismo valor funciona en local y detrás de un túnel ngrok
> (ver `SETUP_LOCAL.md` §10). El script `setup.ps1` en la raíz del repo automatiza todo
> este setup (Docker, backend y frontend) de punta a punta.

### Comandos útiles
```bash
npm run dev       # servidor de desarrollo con hot-reload (localhost:5173)
npm run build     # tsc -b + vite build — verificación de tipos y build de producción
npm run preview   # sirve el build de producción localmente
npm run lint      # ESLint
```

### Problemas frecuentes
| Síntoma | Causa / solución |
|---|---|
| Pantallas en blanco / errores de red | Backend no corriendo: levantar API en `:3000` (ver `SETUP_LOCAL.md`) |
| CORS blocked | El frontend debe correr en `5173`; el backend permite ese origen (`FRONTEND_FASE1.md` / `FRONTEND_URL`) |
| `VITE_API_URL` undefined | Falta `apps/frontend/.env.local`; reiniciar `npm run dev` tras crearlo |
| Puerto 5173 ocupado | Vite tomará otro puerto; actualizar `FRONTEND_URL` del backend si cambia |

---

## Verificación (flujo end-to-end EP-01 y EP-03)

1. Backend OK (`GET /api/health` → `{"status":"ok","db":"connected"}`).
2. Abrir `http://localhost:5173` → "Entrar como vecino (dev)" o "Ingresar con ClaveÚnica".
3. Caer en **Inicio**: tarjeta de impacto (demo) + grid de módulos.
4. Tab **Solicitar** (📷) → captura → "Analizar con IA" → pantalla de análisis →
   resultado con la detección mock sobre el catálogo real.
5. Elegir "Usar sugerencia" o "Ingresar manualmente" → el select lista los 26 ítems reales
   del catálogo municipal (Refrigerador, Lavadora, Colchón, etc.) con su **precio real**.
6. Crear la solicitud → `/solicitud/creada` (SuccessRing + CTAs).
7. **Mis solicitudes** muestra la solicitud en estado `pendiente` con el nombre del residuo
   (leído desde `GET /api/solicitudes-retiro`).
8. Ingresar como funcionario municipal → el botón "Modo funcionario" navega a `VITE_ADMIN_URL`
   (`apps/admin-web`, http://localhost:5174 en local) para gestionar solicitudes, cambiar
   estados o programar asignación con operador (HU-08).
9. Dentro del panel, ir a "Auditoría" → consultar KPIs y registros de actividad del sistema (HU-13).

---

## Pendiente / Roadmap del frontend

Alineado al roadmap del `README.md`. Cada paso depende de que el backend exponga primero
los endpoints correspondientes.

> Detalle completo en [`PLAN_FRONTEND.md`](./PLAN_FRONTEND.md).

| Área | Notas |
|---|---|
| Precio/ícono reales | Agregar columnas al backend y quitar el overlay de `arca.ts` |
| Completar EP-01 | Cámara en vivo (`getUserMedia`), GPS, clasificación IA con **TensorFlow.js** reemplazando el mock |
| PWA | Service Worker (Workbox) + manifest para modo offline |
| Auth real (EP-05) | Reemplazar login temporal por JWT/ClaveÚnica en `SessionContext` |
| Redux Toolkit + RTK Query | Cuando crezca el estado (marketplace, credits, sesión) |
| EP-02 Marketplace | Listado/publicación, chat en tiempo real (`socket.io-client`), ratings |
| EP-04 Circular Credits | Saldo + historial en perfil |
| EP-03 Dashboard municipal | ✅ Base hecha (`/admin`: listar/filtrar/detalle + estados, modal de asignación HU-08 y auditoría HU-13). Falta panel funcionario completo, mapa de calor (**Leaflet** + OpenStreetMap), reportes |
| Programación con operadores | ✅ Hecho: Modal `AsignarRetiroModal` con fecha, franja y operador asignado (HU-08) |
| Log de Auditoría | ✅ Hecho: Pantalla `/admin/auditoria` con métricas, búsqueda y filtros (HU-13) |
| Login diferido | ✅ Hecho: ClaveÚnica primero (`/login`) → gate `/` decide por `perfil-acceso` |
| Proteger el panel admin | ⛔ Sin gate de sesión en `apps/admin-web` (deuda declarada, migración 2026-09-01). Falta login ClaveÚnica propio + guard real |
| Cancelar desde detalle (ciudadano) | ✅ Mis solicitudes: tocar → detalle → cancelar; oculta local |
| Tests | Vitest + React Testing Library |

---

## Documentación relacionada

- [`PLAN_FRONTEND.md`](./PLAN_FRONTEND.md) — Sistema de diseño + roadmap por fases del frontend
- [`SETUP_LOCAL.md`](./SETUP_LOCAL.md) — Cómo levantar el entorno completo
- [`BACKEND_FASE1.md`](./BACKEND_FASE1.md) — Qué expone el backend hoy
- [`../README.md`](../README.md) — Producto, stack y roadmap
- [`../CLAUDE_proyecto.md`](../CLAUDE_proyecto.md) — Contexto general del proyecto
