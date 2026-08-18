# 🎨 Plan de Desarrollo Frontend — A.R.C.A.

> Meta visual: replicar los standalone de referencia (`ARCA UI Kit v1.0` y `ARCA Prototipo`)
> usando React 18 + Tailwind como PWA mobile-first. Documento vivo: marcar items al integrar.

---

## 🧱 Sistema de diseño (base — ✅ implementado)

Tokens espejados del UI Kit en [`tailwind.config.js`](../apps/frontend/tailwind.config.js) y
clases reutilizables en [`index.css`](../apps/frontend/src/index.css).

| Token | Valor | Uso |
|---|---|---|
| **Tipografía** | Bricolage Grotesque (display) · Hanken Grotesk (body) | títulos / cuerpo |
| **Verde** | `green-50…900` (primario `700 #0F6B45`) | marca, CTA primario |
| **Dorado** | `gold-50…600` (`500 #ef9d24`) | Circular Credits, CTA reutilizar |
| **Rose / Sky** | alertas / info | pills de estado |
| **Neutros** | `ink`, `slate`, `line`, `canvas #f3f6f3` | texto y superficies |
| **Radios** | `sm 12 · md 18 · lg 24 · xl 30 · pill` | cards, botones |
| **Sombras** | `sm/md/lg` + `green`/`gold` (glow) | elevación, botones |

Clases utilitarias listas: `.card`, `.btn-primary`, `.btn-gold`, `.btn-outline`,
`.btn-ghost`, `.pill`, `.field`, `.chip` / `.chip-active`.

---

## 📐 Shell de la app (✅ implementado)

- Columna mobile centrada (`max-w-md`) sobre canvas — emula el frame del prototipo.
- Header sticky con marca + Salir.
- **TabBar inferior** sticky: Inicio · Solicitar (📷) · Solicitudes.
- Login con hero verde degradado + CTA dorado ClaveÚnica.
- Estado efímero del flujo (foto capturada) en `features/solicitud-retiro/SolicitudFlowContext.tsx`.
- **Modularización por feature:** el flujo "Solicitar retiro" vive completo en
  `features/solicitud-retiro/` (pantallas + contexto + `routes.tsx`); `App.tsx` monta el bloque
  de rutas sin conocer su interior.

---

## ✅ Estado del flujo actual (re-estilizado + conectado al backend)

| Pantalla | Ruta | Estado | Datos |
|---|---|---|---|
| Login (ClaveÚnica) | `/login` | ✅ **backend** | Primera vista. Mock: accesos dev Vecino / Funcionario |
| Gate login diferido | `/` | ✅ **backend** | Funcionario → selección; solo ciudadano → `/inicio` |
| Selección de contexto | `/` (admin) | ✅ **backend** | Solo funcionarios: App ciudadana / Panel municipal |
| Panel admin | `/admin` | ✅ **backend** | `RequireAdmin`. Listar/filtrar/detalle + estado **reversible** (EP-03 base) |
| Inicio / Dashboard | `/inicio` | ✅ | Tarjeta de créditos/impacto **estática** (demo, falta EP-04) |
| Captura residuo | `/solicitar` | ✅ esqueleto | Cámara/galería **solo visual** (no obligatoria) |
| Analizando IA | `/solicitar/analizando` | ✅ esqueleto | Scan animado mock (~2.2s) |
| Resultado IA | `/solicitar/sugerencias` | ✅ esqueleto | Detección mock sobre **catálogo real** |
| Catálogo | `/catalogo` | ✅ **backend** | `GET /residuos/catalogo` + búsqueda/chips |
| Nueva solicitud | `/nueva-solicitud` | ✅ **backend** | `POST /solicitudes-retiro` |
| Solicitud creada | `/solicitud/creada` | ✅ esqueleto | SuccessRing + 2 CTAs (retiro / marketplace) |
| Mis solicitudes | `/mis-solicitudes` | ✅ **backend** | Lista → detalle (descripción) + cancelar; oculta local |
| Retiro municipal | `/retiro-municipal` | ✅ placeholder | "Próximamente" (EP-03) |
| Subir a Marketplace | `/marketplace/subir` | ✅ placeholder | "Próximamente" (EP-02) |

> **Precio: ya es real.** Viene de la columna `precio` de `residuos_catalogo`
> (migración `1782163600000-replace-catalogo-precios-reales`), no del front.
> **El ícono sigue siendo overlay del front**, mapeado por categoría en `api/arca.ts`
> (`iconoPorCategoria`). Migrar a un campo real del backend cuando exista.

---

## 🗺️ Roadmap por fases

### Fase 1 — Pulido del MVP ciudadano (en curso)
- [x] Sistema de diseño + shell + tab bar.
- [x] Re-estilizar las pantallas existentes.
- [x] Reconectar todas las pantallas a los endpoints reales del backend (EP-01).
- [x] **Componetizar** primitivos en `src/components/ui/`: `IconBadge`, `EstadoPill`,
      `ListItemCard`, `ScreenHeader`, `EmptyState`, `BackButton`, `PriceTag` + `estadoMeta`,
      todos exportados desde `components/ui/index.ts`.
- [ ] Extraer los primitivos que siguen siendo **solo clases CSS**: `Button`, `Card`, `Field`,
      `Chip`, `SearchBar`.
- [ ] **Detalle / Tracking de retiro** con Timeline de 4 pasos (UI Kit: `Timeline + PulseRing`). Ruta `/solicitud/:id`.
- [ ] Conectar la tarjeta de créditos/impacto del Inicio a datos reales (EP-04) — hoy es estática.
- [x] **Precio real:** columna `precio` en el backend; el overlay de precio salió de `api/arca.ts`.
- [ ] **Ícono real:** agregar la columna al backend y quitar `iconoPorCategoria` de `api/arca.ts`.
- [ ] Estados de carga con `Spinner` / skeletons y manejo de error consistente.
- [ ] Iconografía: migrar emojis → `lucide-react` (acordado en `config/modulos.ts`).

### Fase 2 — Solicitud con IA (EP-01 ampliado)
- [x] **Esqueleto del flujo** captura → análisis → resultado → éxito (estático).
- [ ] Cámara en vivo (`getUserMedia`) en vez de `input file` — hoy solo visual.
- [ ] Clasificación local con TensorFlow.js → reemplaza la detección mock.
- [ ] Confirmación con foto, GPS aproximado y nota (campos ya soportados por el DTO).
- [ ] "+5 créditos" real al crear (depende de EP-04).
- [ ] Pantallas reales de "Retiro municipal" y "Subir al Marketplace" (hoy placeholders).

### Fase 3 — Marketplace P2P (EP-02)
- [ ] Listado: vista Grid 2 col + vista Lista, con `SearchBar` y chips Regalo/Intercambio/Categorías.
- [ ] `ArticleCard` + `StatePill` + `HeartBtn` + distancia.
- [ ] Detalle de artículo: galería, `ModalidadBadge`, vecino con `RatingBadge`/`ShieldVerified`.
- [ ] Publicar: foto + título + chips categoría + modalidad.
- [ ] CTA Gold “¿Aún sirve? Regálalo”.

### Fase 4 — Chat entre vecinos (EP-02)
- [ ] `ChatInput` + burbujas (propias verde / ajenas blanco) + `ReservaBanner` gold.
- [ ] Integrar Socket.io-client (gateways NestJS).

### Fase 5 — Perfil & Impacto (EP-04)
- [ ] `ProfileHeader` verde + avatar.
- [ ] `BalanceCard` Circular Credits + `ImpactCard` (CO₂, litros, barra de hito).
- [ ] Historial `TransactionRow`, ranking `TrophyRanking`, `SettingRows`.
- [ ] Añadir 4ª pestaña **Perfil** a la TabBar.

### Fase 6 — Panel Municipal (desktop · EP-03)
> App separada / layout desktop: `Sidebar + Topbar`.
- [x] **Login diferido** (`/login` → gate `/`): ClaveÚnica primero; según `perfil-acceso`
      el funcionario elige contexto y el ciudadano va directo a la PWA. `/admin` con `RequireAdmin`.
- [x] **Gestión de solicitudes base** (`/admin`): listar, filtrar por estado, detalle y
      cambiar estado en cualquier dirección (reversible, para pruebas). Falta layout desktop pulido.
- [ ] Dashboard: `KPISummary`, `BarChart`/`LineChart`, `MetricsBar`.
- [ ] Gestión de solicitudes: `FilterBar` + `SideList` + tabla (versión completa).
- [ ] Mapa de operaciones: Leaflet (`MapContainer`, `PinCluster`, `RoutePolyline`).
- [ ] Moderación marketplace: grid + `UserFlag` + botones Aprobar/Rechazar.
- [ ] Reportes: `DateRangePicker` + export PDF/CSV.

---

## 🔧 Deuda técnica / infraestructura
- [ ] Estado global: migrar fetch manual → **Redux Toolkit + RTK Query** (roadmap B.3).
- [ ] Auth real: ClaveÚnica (OAuth2) + JWT, reemplazar `SessionContext` mock.
- [ ] PWA: manifest + service worker (offline catálogo).
- [ ] Tests de UI (Vitest + Testing Library) por componente.
- [ ] `docs/UI_KIT.md`: documentar tokens y componentes con referencias al standalone.

---

**Última actualización:** 2026-08-17 · Equipo COM Tech
