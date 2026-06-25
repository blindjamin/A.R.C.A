# Frontend Fase 1 — Resumen de implementación

> **Integrado en:** `develop` (rama de trabajo `mvp`)
> **Última actualización:** 2026-06-24
> **Equipo:** COM Tech — Feria de Software 2026

Documento de hito que resume la implementación del frontend (PWA ciudadana) y
sirve como **base para la documentación futura** del módulo. A medida que se agreguen
pantallas y épicas, extender las secciones correspondientes.

---

## Objetivo de esta fase

Montar la **base del frontend (Fase 1)** consumiendo exactamente lo que el backend ya
expone (épica **EP-01**), con estética alineada a los prototipos oficiales y un flujo
ciudadano de punta a punta:

- App PWA React conectada a la API NestJS local
- **Sistema de diseño A.R.C.A.** (UI Kit v1.0) aplicado: tokens, tipografía, shell mobile
- Flujo "Solicitar retiro" con **esqueleto de IA** (captura → análisis → sugerencia → éxito)
- Catálogo, creación y seguimiento de solicitudes contra el backend real
- **Login temporal** mientras no exista autenticación real (ClaveÚnica/JWT)

---

## Stack implementado

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | React 18 + TypeScript | |
| Build/dev | Vite | dev server en `http://localhost:5173` |
| Estilos | Tailwind CSS **v3** | tokens del UI Kit en `tailwind.config.js` |
| Ruteo | react-router-dom | rutas protegidas por sesión |
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

**Shell mobile:** columna `max-w-md` centrada sobre canvas (emula el frame del prototipo),
header sticky con marca, **TabBar inferior** (Inicio · Solicitar · Solicitudes).

---

## Estructura del frontend

```
apps/frontend/
├── .env.local                  # VITE_API_URL=http://localhost:3000 (no versionado)
├── tailwind.config.js          # tokens del UI Kit (colores, fuentes, radios, sombras)
├── postcss.config.js
└── src/
    ├── main.tsx                # entrypoint
    ├── App.tsx                 # router + shell mobile + TabBar + ruta protegida
    ├── index.css               # base + clases de componentes + animaciones (scan/success)
    ├── api/
    │   └── arca.ts             # capa fetch tipada + overlay de precio/ícono por categoría
    ├── auth/
    │   └── SessionContext.tsx  # login temporal (usuario dev en localStorage)
    ├── flow/
    │   └── SolicitudFlow.tsx   # estado efímero del flujo (foto capturada)
    ├── config/
    │   └── modulos.ts          # registro de módulos del Inicio (fuente de verdad del menú)
    └── pages/
        ├── Login.tsx              # hero verde + CTA dorado ClaveÚnica
        ├── Inicio.tsx            # dashboard: tarjeta de impacto (demo) + grid de módulos
        ├── CapturaResiduo.tsx    # cámara/galería (solo visual)
        ├── AnalizandoIA.tsx      # scan animado mock (~2.2s)
        ├── SugerenciasIA.tsx     # detección mock sobre catálogo real
        ├── Catalogo.tsx
        ├── NuevaSolicitud.tsx
        ├── SolicitudCreada.tsx   # SuccessRing + CTAs (retiro / marketplace)
        ├── MisSolicitudes.tsx
        └── Proximamente.tsx      # placeholder reutilizable (retiro municipal, marketplace)
```

---

## Capa de API (`src/api/arca.ts`)

Punto único de contacto con el backend. Lee la URL base de `import.meta.env.VITE_API_URL`.
Expone funciones tipadas e interfaces del dominio (`ResiduoCatalogo`, `SolicitudRetiro`,
`EstadoSolicitud`).

| Función | Endpoint backend |
|---|---|
| `fetchCatalogo()` | `GET /residuos/catalogo` |
| `crearSolicitudRetiro(data)` | `POST /solicitudes-retiro` |
| `fetchMisSolicitudes(uuid)` | `GET /solicitudes-retiro?usuarioCiudadanoId={uuid}` |

> Cuando se integre Redux Toolkit (roadmap), esta capa se reemplaza por slices/endpoints
> de RTK Query. Las pantallas deberían cambiar poco si se mantiene la misma firma.

### Overlay de precio e ícono (provisional)

La entidad `ResiduoCatalogo` del backend **no tiene `precio` ni `icono`**. Para mostrar
ambos en la UI, `arca.ts` deriva valores **referenciales por categoría**:

| Helper | Qué hace |
|---|---|
| `precioReferencial(categoria)` | precio CLP por categoría (Muebles, Electrónica, …) |
| `iconoPorCategoria(categoria)` | emoji por categoría |
| `formatearPrecio(clp)` | formato `es-CL` (`$8.000`) |

> **Pendiente:** agregar columna `precio` a la entidad + migración, y quitar el overlay.

---

## Identidad temporal (`src/auth/SessionContext.tsx`)

Mientras no exista auth real, un `SessionContext` guarda el `usuarioCiudadanoId` (el
usuario dev `00000000-0000-4000-8000-000000000001`) en estado + `localStorage`.

- `login()` — setea el UUID dev (lo dispara la pantalla de Login).
- `logout()` — limpia la sesión.
- `useSession()` — hook para leer el id en cualquier pantalla.

**Diseñado para el futuro (EP-05):** cuando llegue ClaveÚnica/JWT, solo cambia el interior
de `login()` (guardar token, derivar el id del token) y se deja de enviar
`usuarioCiudadanoId` en el body. **Las pantallas no cambian.**

---

## Pantallas (`src/pages/`)

| Pantalla | Ruta | Endpoint / datos | Tipo |
|---|---|---|---|
| `Login` | `/login` | — | placeholder |
| `Inicio` | `/inicio` | tarjeta de impacto **demo** | hub |
| `CapturaResiduo` | `/solicitar` | cámara/galería (solo visual) | esqueleto |
| `AnalizandoIA` | `/solicitar/analizando` | scan mock (~2.2s) | esqueleto |
| `SugerenciasIA` | `/solicitar/sugerencias` | `GET /residuos/catalogo` (detección mock) | esqueleto |
| `Catalogo` | `/catalogo` | `GET /residuos/catalogo` | **backend** |
| `NuevaSolicitud` | `/nueva-solicitud` | `POST /solicitudes-retiro` | **backend** |
| `SolicitudCreada` | `/solicitud/creada` | SuccessRing + 2 CTAs | esqueleto |
| `MisSolicitudes` | `/mis-solicitudes` | `GET /solicitudes-retiro?usuarioCiudadanoId=` | **backend** |
| `Proximamente` | `/retiro-municipal`, `/marketplace/subir` | — | placeholder |

- Las rutas (salvo `/login`) están envueltas en `RequireSession`: sin sesión → redirige a `/login`.
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

## Setup en otro PC — levantar el frontend

> Para levantar **MySQL + backend** (Docker, migraciones, API) sigue primero
> [`SETUP_LOCAL.md`](./SETUP_LOCAL.md) y [`BACKEND_FASE1.md`](./BACKEND_FASE1.md).
> Esta sección cubre **solo el frontend**, que necesita el backend ya corriendo en
> `http://localhost:3000`.

### Prerrequisitos
- **Node.js 18+** (`node -v`) y **npm** (viene con Node). Para esta fase se usó Node 24 LTS.
- Backend levantado y respondiendo (`curl http://localhost:3000/health` → `{"status":"ok",...}`).

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
#       VITE_API_URL=http://localhost:3000

# 4. Levantar el dev server
npm run dev        # abre http://localhost:5173
```

> **Windows (PowerShell):** crea el `.env.local` con
> `"VITE_API_URL=http://localhost:3000" | Out-File -Encoding utf8 apps/frontend/.env.local`
> o simplemente con el editor de texto.

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
| CORS blocked | El frontend debe correr en `5173`; el backend permite ese origen (`FRONTEND_URL`) |
| `VITE_API_URL` undefined | Falta `apps/frontend/.env.local`; reiniciar `npm run dev` tras crearlo |
| Puerto 5173 ocupado | Vite tomará otro puerto; actualizar `FRONTEND_URL` del backend si cambia |

---

## Verificación (flujo end-to-end EP-01)

1. Backend OK (`GET /health` → `{"status":"ok","db":"connected"}`).
2. Abrir `http://localhost:5173` → "Entrar como vecino (dev)" o "Ingresar con ClaveÚnica".
3. Caer en **Inicio**: tarjeta de impacto (demo) + grid de módulos.
4. Tab **Solicitar** (📷) → captura → "Analizar con IA" → pantalla de análisis →
   resultado con la detección mock sobre el catálogo real.
5. Elegir "Usar sugerencia" o "Ingresar manualmente" → el select lista los ítems seed
   (Sofá, Refrigerador, Colchón, Escombros) con su precio referencial.
6. Crear la solicitud → `/solicitud/creada` (SuccessRing + CTAs).
7. **Mis solicitudes** muestra la solicitud en estado `pendiente` con el nombre del residuo
   (leído desde `GET /solicitudes-retiro`).

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
| EP-03 Dashboard municipal | ✅ Base hecha (`/admin`: listar/filtrar/detalle + estados, rama `admin-municipal`). Falta panel funcionario completo, mapa de calor (**Leaflet** + OpenStreetMap), reportes |
| Login diferido | ✅ Hecho: ClaveÚnica primero (`/login`) → gate `/` decide por `perfil-acceso` |
| Proteger `/admin` | ✅ `RequireAdmin` en el front (solo funcionarios). Falta guard real con JWT en backend |
| Cancelar desde detalle (ciudadano) | ✅ Mis solicitudes: tocar → detalle → cancelar; oculta local |
| Tests | Vitest + React Testing Library |

---

## Documentación relacionada

- [`PLAN_FRONTEND.md`](./PLAN_FRONTEND.md) — Sistema de diseño + roadmap por fases del frontend
- [`SETUP_LOCAL.md`](./SETUP_LOCAL.md) — Cómo levantar el entorno completo
- [`BACKEND_FASE1.md`](./BACKEND_FASE1.md) — Qué expone el backend hoy
- [`../README.md`](../README.md) — Producto, stack y roadmap
- [`../CLAUDE_proyecto.md`](../CLAUDE_proyecto.md) — Contexto general del proyecto
