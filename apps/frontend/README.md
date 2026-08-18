# A.R.C.A. — Frontend (PWA)

PWA mobile-first del proyecto A.R.C.A. Construida con **React 18 + TypeScript + Vite + Tailwind CSS**.

> Documentación detallada de la fase actual: [`docs/FRONTEND_FASE1.md`](../../docs/FRONTEND_FASE1.md)
> Roadmap y pendientes por fase: [`docs/PLAN_FRONTEND.md`](../../docs/PLAN_FRONTEND.md)

---

## Arrancar en local

Si es la primera vez en este PC, corré el script de la raíz que deja todo listo
(MySQL, dependencias, `.env.local`, migraciones y ambos servidores):

```powershell
.\setup.ps1
```

Manual, solo el frontend:

```bash
cd apps/frontend
npm install
npm run dev
```

Requiere `apps/frontend/.env.local` con:

```
VITE_API_URL=/api
```

El dev server queda en `http://localhost:5173` y hace **proxy de `/api` hacia el backend**
(`http://localhost:3000`), configurado en [`vite.config.ts`](vite.config.ts). Por eso frontend y
backend comparten un único origen y no hace falta tocar CORS ni URLs absolutas en desarrollo.

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Dev server de Vite con HMR (puerto 5173) |
| `npm run build` | `tsc -b` + build de producción a `dist/` |
| `npm run preview` | Sirve el build de `dist/` para verificarlo |
| `npm run lint` | ESLint sobre todo el proyecto |

---

## Estructura de `src/`

```
src/
├── api/arca.ts                  # Capa única de acceso a la API (fetch tipado)
├── auth/SessionContext.tsx      # Identidad temporal (mock hasta ClaveÚnica real)
├── components/
│   ├── AppShell.tsx             # Shell mobile: header, TabBar, Protected, RequireAdmin
│   └── ui/                      # UI Kit — primitivos reutilizables
│       ├── IconBadge · EstadoPill · ListItemCard · ScreenHeader
│       ├── EmptyState · BackButton · PriceTag
│       ├── estadoMeta.ts        # Metadata (label/color) por estado de solicitud
│       └── index.ts             # Punto de import único: import { ScreenHeader } from '../../components/ui'
├── config/modulos.ts            # Configuración del hub de Inicio (tarjetas por módulo)
├── features/
│   └── solicitud-retiro/        # Flujo completo "Solicitar retiro" (EP-01)
│       ├── CapturaResiduo · AnalizandoIA · SugerenciasIA
│       ├── Catalogo · NuevaSolicitud · SolicitudCreada
│       ├── SolicitudFlowContext.tsx  # Estado efímero del flujo (foto capturada)
│       └── routes.tsx           # Bloque de rutas del flujo, montado por App.tsx
├── pages/                       # Pantallas fuera del flujo de solicitud
│   ├── Login · SeleccionInicio · Inicio
│   ├── MisSolicitudes · AdminSolicitudes · Proximamente
├── index.css                    # Tokens y clases utilitarias del UI Kit
└── App.tsx                      # Router: arma las rutas y monta solicitudRetiroRoutes
```

### Criterio de organización

- **`features/`** — un módulo funcional completo (pantallas + estado + rutas) que se puede
  hacer crecer sin tocar el resto. `App.tsx` monta el bloque de rutas sin conocer su interior.
- **`pages/`** — pantallas sueltas que no pertenecen a un flujo con varios pasos.
- **`components/ui/`** — primitivos sin lógica de negocio, reutilizables por cualquier pantalla.

---

## Convenciones

- Componentes como funciones, props tipadas con TypeScript, hooks modernos.
- Estilos con Tailwind + las clases utilitarias del UI Kit (`.card`, `.btn-primary`,
  `.btn-gold`, `.btn-outline`, `.btn-ghost`, `.pill`, `.field`, `.chip`).
- **Todas** las llamadas HTTP pasan por `src/api/arca.ts`; ninguna pantalla hace `fetch` directo.
- Tokens de diseño (colores, radios, sombras, tipografías) en
  [`tailwind.config.js`](tailwind.config.js) e [`index.css`](src/index.css).

---

## Acceso desde el celular

`vite.config.ts` tiene `allowedHosts: true` para permitir el túnel de ngrok. Desde la raíz:

```powershell
.\start-ngrok.ps1
```

Un solo túnel alcanza para todo, porque Vite ya proxea `/api` al backend.
Ver [`docs/SETUP_LOCAL.md`](../../docs/SETUP_LOCAL.md) §10.
