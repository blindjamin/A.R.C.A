# Frontend Fase 1 — Resumen de implementación

> **Rama:** `feature/frontend`
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
    └── pages/
        ├── Login.tsx
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
| `Catalogo` | `/catalogo` | `GET /residuos/catalogo` | HU-01 |
| `NuevaSolicitud` | `/nueva-solicitud` | `POST /solicitudes-retiro` | HU-01 |
| `MisSolicitudes` | `/mis-solicitudes` | `GET /solicitudes-retiro?usuarioCiudadanoId=` | HU-03 |

- Las rutas (salvo `/login`) están envueltas en `RequireSession`: sin sesión → redirige a `/login`.
- Estados de carga/error manejados localmente con `useState`.
- `Catalogo` enlaza a `NuevaSolicitud` pre-seleccionando el residuo vía query param.
- `MisSolicitudes` muestra el nombre del residuo (el GET incluye la relación `residuoCatalogo`).

---

## Cómo correr (resumen)

Requiere el **backend corriendo** (ver `docs/SETUP_LOCAL.md` y `docs/BACKEND_FASE1.md`).

```bash
cd apps/frontend
npm install
# crear .env.local con: VITE_API_URL=http://localhost:3000
npm run dev      # http://localhost:5173
npm run build    # tsc -b + vite build (verificación de tipos)
```

---

## Verificación (flujo end-to-end EP-01)

1. Backend OK (`GET /health` → `{"status":"ok","db":"connected"}`).
2. Abrir `http://localhost:5173` → "Entrar como vecino (dev)".
3. Catálogo muestra los ítems seed (Sofá, Refrigerador, Colchón, Escombros).
4. Crear una solicitud → redirige a "Mis solicitudes".
5. La solicitud aparece en estado `pendiente` con el nombre del residuo.

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
