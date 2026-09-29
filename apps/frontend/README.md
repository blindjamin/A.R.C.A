# A.R.C.A. — Frontend (PWA)

PWA mobile-first del proyecto A.R.C.A. Construida con **React 18 + TypeScript + Vite + Tailwind CSS**.

> Documentación detallada de la fase actual: [`docs/FRONTEND_FASE1.md`](../../docs/FRONTEND_FASE1.md)
> Roadmap y pendientes por fase: [`docs/PLAN_FRONTEND.md`](../../docs/PLAN_FRONTEND.md)

> ⚠️ **Replanteo del 2026-09-17: el núcleo, la base y el panel ya cambiaron, la PWA todavía no.**
> La empresa que ejecuta los retiros es **externa**: A.R.C.A. no asigna operadores; el funcionario
> **revisa, aprueba y deriva** las solicitudes.
> Estados nuevos: `en_revision` · `requiere_modificacion` · `aprobada` · `rechazada` · `derivada` · `retirada` · `no_realizada` · `cancelada`.
> Por hacer en la PWA (Ana o Maxi): tipos en `api/arca.ts`, etiquetas para el vecino en `estadoMeta.ts`
> y Cancelar solo en `en_revision`, `requiere_modificacion` o `aprobada` **sin pagar**. Después vienen la
> pantalla «tu solicitud requiere cambios», la subida de fotos, los datos de contacto y el pago maqueteado.
> Detalle: [pendientes del equipo §5](../../docs/PENDIENTES_EQUIPO.md) ·
> [spec `ciclo-solicitud`](../../docs/specs/SPEC-ciclo-solicitud.md)

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
│   ├── AppShell.tsx             # Shell mobile: header, TabBar, Protected
│   └── ui/                      # UI Kit — primitivos reutilizables
│       ├── Icons.tsx            # Sistema de íconos vectoriales SVG sobrios
│       ├── IconBadge · EstadoPill · ListItemCard · ScreenHeader
│       ├── EmptyState · BackButton · PriceTag · BotonClaveUnica · Estrellas
│       ├── estadoMeta.ts        # Metadata (label/color) por estado de solicitud
│       └── index.ts             # Punto de import único: import { ScreenHeader, IconUser } from '../../components/ui'
├── config/modulos.ts            # Configuración del hub de Inicio (tarjetas por módulo)
├── features/
│   ├── marketplace/             # Marketplace P2P (listado, detalle, publicar, mis publicaciones)
│   └── solicitud-retiro/        # Flujo completo "Solicitar retiro" (EP-01)
│       ├── CapturaResiduo · AnalizandoIA · SugerenciasIA
│       ├── Catalogo · NuevaSolicitud · SolicitudCreada
│       ├── SolicitudFlowContext.tsx  # Estado efímero del flujo (foto capturada)
│       └── routes.tsx           # Bloque de rutas del flujo, montado por App.tsx
├── pages/                       # Pantallas fuera del flujo de solicitud
│   ├── Login · SeleccionInicio · Inicio · Perfil
│   └── MisSolicitudes · Proximamente
├── index.css                    # Tokens y clases utilitarias del UI Kit
└── App.tsx                      # Router: arma las rutas y monta flujos
```

> El panel municipal vive en `src/admin/` y se sirve en `/admin/*` de este mismo sitio
> (SPEC-frontend-unificado): no es otro origen ni necesita una variable de entorno propia.
> El botón "Modo funcionario" de `SeleccionInicio.tsx` navega a `/admin` con el router de React.

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

`vite.config.ts` tiene `allowedHosts: true` para permitir exponer el dev server con un túnel
(el equipo trabaja en local; ver `docs/SETUP_LOCAL.md` si hace falta demostrar la PWA a
distancia).
