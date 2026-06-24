# Frontend Fase 1 — Resumen de implementación

> **Integrado en:** `develop` / `master` (el trabajo se hizo en la antigua `feature/frontend`, ya eliminada)
> **Fecha:** Junio 2026
> **Equipo:** COM Tech — Feria de Software 2026

Documento de hito que resume la primera implementación del frontend (PWA ciudadana) y
sirve como **base para la documentación futura** del módulo. A medida que se agreguen
pantallas y épicas, extender las secciones correspondientes.

---

## Objetivo de esta fase

Montar la **base del frontend (Fase 1)** consumiendo exactamente lo que el backend ya
expone (épica **EP-01**), con un flujo ciudadano de punta a punta:

- App PWA React conectada a la API NestJS local
- Flujo: ver catálogo → crear solicitud de retiro → seguir mis solicitudes
- **Login temporal** mientras no exista autenticación real (ClaveÚnica/JWT)

---

## Stack implementado

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | React 18 + TypeScript | |
| Build/dev | Vite | dev server en `http://localhost:5173` |
| Estilos | Tailwind CSS **v3** | ⚠️ Ver nota de desviación abajo |
| Ruteo | react-router-dom | rutas protegidas por sesión |
| Estado/API | `fetch` nativo (sin Redux aún) | migrar a Redux Toolkit cuando crezca el estado |

> **⚠️ Desviación a confirmar con el equipo:** el stack documentado (`CLAUDE_proyecto.md`
> §4.1, `UI_KIT_ARCA.md`) especifica **Tailwind v4**. En esta fase se usó **Tailwind v3**
> por simplicidad de configuración (`tailwind.config.js` + `postcss.config.js` clásicos).
> Migrar a v4 es directo si el equipo lo prefiere. Igual está pendiente aplicar el UI Kit
> oficial (colores `#1A3D2B`/`#52B788`, fuente Inter, lucide-react); por ahora se usó una
> paleta verde provisional (`arca.*` en `tailwind.config.js`).

---

## Estructura del frontend

```
apps/frontend/
├── .env.local                  # VITE_API_URL=http://localhost:3000 (no versionado)
├── tailwind.config.js          # config Tailwind + paleta arca provisional
├── postcss.config.js
└── src/
    ├── main.tsx                # entrypoint
    ├── App.tsx                 # router + layout + ruta protegida (RequireSession)
    ├── index.css               # directivas Tailwind
    ├── api/
    │   └── arca.ts             # capa fetch tipada + interfaces del dominio
    ├── auth/
    │   └── SessionContext.tsx  # login temporal (usuario dev en localStorage)
    ├── config/
    │   └── modulos.ts          # registro de módulos del Inicio (fuente de verdad del menú)
    └── pages/
        ├── Login.tsx
        ├── Inicio.tsx          # hub post-login: grid de módulos
        ├── Catalogo.tsx
        ├── NuevaSolicitud.tsx
        └── MisSolicitudes.tsx
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

| Pantalla | Ruta | Endpoint | HU relacionada |
|---|---|---|---|
| `Login` | `/login` | — | HU-12 (placeholder) |
| `Inicio` | `/inicio` | — | hub de navegación |
| `Catalogo` | `/catalogo` | `GET /residuos/catalogo` | HU-01 |
| `NuevaSolicitud` | `/nueva-solicitud` | `POST /solicitudes-retiro` | HU-01 |
| `MisSolicitudes` | `/mis-solicitudes` | `GET /solicitudes-retiro?usuarioCiudadanoId=` | HU-03 |

- Las rutas (salvo `/login`) están envueltas en `RequireSession`: sin sesión → redirige a `/login`.
- **Tras el login se cae en `/inicio`** (el hub); el catch-all `*` también redirige ahí.
- Estados de carga/error manejados localmente con `useState`.
- `Catalogo` enlaza a `NuevaSolicitud` pre-seleccionando el residuo vía query param.
- `MisSolicitudes` muestra el nombre del residuo (el GET incluye la relación `residuoCatalogo`).

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
2. Abrir `http://localhost:5173` → "Entrar como vecino (dev)".
3. Caer en **Inicio**: tarjetas activas (Solicitar retiro, Mis solicitudes) +
   "Próximamente" (Marketplace, Mis créditos, Panel municipal).
4. Entrar a "Solicitar retiro" → el catálogo muestra los ítems seed
   (Sofá, Refrigerador, Colchón, Escombros).
5. Crear una solicitud → redirige a "Mis solicitudes".
6. La solicitud aparece en estado `pendiente` con el nombre del residuo.

---

## Pendiente / Roadmap del frontend

Alineado al roadmap del `README.md`. Cada paso depende de que el backend exponga primero
los endpoints correspondientes.

| Área | Notas |
|---|---|
| Aplicar **UI Kit oficial** | Colores/tipografía/íconos de `UI_KIT_ARCA.md`; decidir Tailwind v3 vs v4 |
| Completar EP-01 | Subida de foto + GPS (campos ya soportados por el DTO), clasificación IA con **TensorFlow.js** (apoyo, el usuario confirma) |
| PWA | Service Worker (Workbox) + manifest para modo offline |
| Auth real (EP-05) | Reemplazar login temporal por JWT/ClaveÚnica en `SessionContext` |
| Redux Toolkit + RTK Query | Cuando crezca el estado (marketplace, credits, sesión) |
| EP-02 Marketplace | Listado/publicación, chat en tiempo real (`socket.io-client`), ratings |
| EP-04 Circular Credits | Saldo + historial en perfil |
| EP-03 Dashboard municipal | Panel funcionario, mapa de calor (**Leaflet** + OpenStreetMap), reportes |
| Tests | Vitest + React Testing Library |

---

## Documentación relacionada

- [`SETUP_LOCAL.md`](./SETUP_LOCAL.md) — Cómo levantar el entorno completo
- [`BACKEND_FASE1.md`](./BACKEND_FASE1.md) — Qué expone el backend hoy
- [`../README.md`](../README.md) — Producto, stack y roadmap
- `UI_KIT_ARCA.md` — Sistema de diseño a aplicar (referenciado por el equipo; aún no está en el repo, ver Drive)
- [`../CLAUDE_proyecto.md`](../CLAUDE_proyecto.md) — Contexto general del proyecto
