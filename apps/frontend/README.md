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

Si es la primera vez en este PC, corré desde la raíz el script que deja todo listo
(MySQL, dependencias, `.env.local`, migraciones y ambos servidores):

```powershell
.\scripts\setup.ps1
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
├── api/chat.ts · push.ts        # API del chat del Marketplace y de los avisos push (HU-06)
├── api/socket.ts                # Cliente socket.io único de la app (/api/socket.io)
├── pwa/                         # Instalación de la PWA y suscripción push (push.ts)
├── auth/SessionContext.tsx      # Identidad temporal (mock hasta ClaveÚnica real)
├── components/
│   ├── AppShell.tsx             # Shell mobile: header, TabBar, Protected
│   └── ui/                      # UI Kit — primitivos reutilizables
│       ├── Icons.tsx            # Sistema de íconos vectoriales SVG sobrios
│       ├── IconBadge · EstadoPill · ListItemCard · ScreenHeader · IconoCategoria
│       ├── EmptyState · BackButton · PriceTag · BotonClaveUnica · Estrellas
│       ├── estadoMeta.ts        # Metadata (label/color) por estado de solicitud
│       └── index.ts             # Punto de import único: import { ScreenHeader, IconUser } from '../../components/ui'
├── config/modulos.ts            # Configuración del hub de Inicio (tarjetas por módulo)
├── features/
│   ├── marketplace/             # Marketplace P2P (listado, detalle, publicar, mis publicaciones, MarketplaceNav)
│   │   └── chat/                # Chat (HU-06): Chat, Bandeja y NoLeidosContext
│   ├── pago/                    # Persistencia local de pagos y comprobantes (pagosStorage.ts)
│   └── solicitud-retiro/        # Flujo completo "Solicitar retiro" (EP-01)
│       ├── Catalogo · NuevaSolicitud · SolicitudCreada · VerificarCorreoModal
│       ├── CampoFoto · fotoSolicitud.ts  # Foto obligatoria de la solicitud (JPG/PNG/WebP, 5 MB)
│       ├── SolicitudFlowContext.tsx  # Estado efímero del flujo (foto capturada y su archivo)
│       └── routes.tsx           # Bloque de rutas del flujo, montado por App.tsx
├── pages/                       # Pantallas fuera del flujo de solicitud
│   ├── Login · SeleccionInicio · Inicio · Perfil · CircularCredits
│   └── MisSolicitudes · PantallaPago · Proximamente
├── utils/                       # Utilidades transversales (perfilStorage.ts)
├── index.css                    # Tokens y clases utilitarias del UI Kit
└── App.tsx                      # Router: arma las rutas y monta flujos
```

> El panel municipal vive en `src/admin/` y se sirve en `/admin/*` de este mismo sitio
> (SPEC-frontend-unificado): no es otro origen ni necesita una variable de entorno propia.
> El botón "Modo funcionario" de `SeleccionInicio.tsx` navega a `/admin` con el router de React.

### Chat del Marketplace (HU-06)

- **`Chat`** (`/marketplace/:id/chat` y `/marketplace/:id/chat/:conversacionId`): pantalla completa, sin el
  header ni la TabBar (`RequireSession` en vez de `Protected`). La cabecera muestra el nombre del otro vecino; quien publica, con el artículo disponible, ve «Reservar» (`BotonReservar`). El interesado entra sin id de
  conversación; quien publica entra con el `conversacionId` opaco (el id del interés). Envía por REST con el mensaje
  pendiente en pantalla, y recibe por socket. Si la conversación pasa a solo lectura, oculta el campo de texto.
- **`Bandeja`** (`/marketplace/mensajes`): lista de conversaciones con el último mensaje y los no leídos.
- **`NoLeidosContext`**: abre el socket con la sesión, carga `GET /marketplace/conversaciones` y la
  vuelve a pedir ante cada evento (`mensaje`, `leidos`, `connect`). De ahí salen los avisos de
  mensajes sin leer (`BadgeNoLeidos`) en la pestaña Mercado, en «Mensajes», en «Mis publicaciones» y
  en el detalle del artículo.
- **`api/socket.ts`**: un único cliente `socket.io-client` en `/api/socket.io`, mismo origen (la
  cookie viaja sola). Solo recibe; enviar va por `api/chat.ts`. En desarrollo, `vite.config.ts` proxea
  `/api` con `ws: true`; `API_PROXY_TARGET` cambia el destino si el 3000 está reservado.
- **`pwa/push.ts`** y `public/sw.js`: al primer envío se pide el permiso de notificaciones
  dentro del gesto del botón (después de un `await` Safari lo rechaza) y, si se concede, se
  registra la suscripción Web Push. El service worker muestra el aviso y, al tocarlo, abre solo
  rutas propias del sitio. Al cerrar sesión se borra la suscripción del servidor.

### Campanita de avisos (HU-23)

En la barra superior (`AppShell`), en el lugar del botón de perfil, que sigue en la pestaña «Perfil». Su contador suma los mensajes de chat sin leer y los avisos sin leer (`NoLeidosContext`); el badge de la pestaña Mercado se quitó. Lleva a `/avisos` (`pages/Avisos.tsx`, `api/notificaciones.ts`), que lista los mensajes sin leer y las novedades y marca los avisos como leídos al abrirla. Se actualiza en vivo con el evento socket `notificacion`.

### Interés, reserva y entrega con código

`DetalleArticulo` (con `api/marketplace.ts`: `registrarInteres`, `listarInteresados`, `reservar`, `liberar`, `entregar`):

- **Vecino, artículo disponible:** «Me interesa» (regalo) o «Quiero intercambiar» registra el interés y navega al chat; si ya tiene interés, dice «Ver conversación» con los no leídos.
- **Quien publica, disponible:** lista «Interesados» (nombre, estrellas, «Identidad verificada», último mensaje) con «Chatear» y «Reservar»; reservar pide confirmar con el nombre.
- **Quien publica, reservado:** «Reservado para {nombre}», el sector, «Liberar» y el formulario «Confirmar entrega» (código de 6 dígitos).
- **Quien recibe, reservado:** tarjeta «Reservado para ti» con el sector y el código; se lo dicta a quien publicó.

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
- **Todas** las llamadas HTTP pasan por la capa `src/api/` (`arca.ts`, `marketplace.ts`, `chat.ts`,
  `push.ts`, que reutilizan `apiFetch`); ninguna pantalla hace `fetch` directo.
- Tokens de diseño (colores, radios, sombras, tipografías) en
  [`tailwind.config.js`](tailwind.config.js) e [`index.css`](src/index.css).

---

## Acceso desde el celular

`vite.config.ts` tiene `allowedHosts: true` para permitir exponer el dev server con un túnel
(el equipo trabaja en local; ver `docs/SETUP_LOCAL.md` si hace falta demostrar la PWA a
distancia).
