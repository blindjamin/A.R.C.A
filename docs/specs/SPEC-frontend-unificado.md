# Spec: `frontend-unificado` — Un sitio, vistas por rol

> **Estado:** BORRADOR · **Fecha:** 2026-09-26
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`frontend-unificado`](MAPA_UNIFICACION.md#3-módulos) · **Depende de:** `backend-unificado` (FU1), `sesion-unica` (FU2) · **HU:** HU-13

## 1. Objetivo

Que `apps/frontend` sea el único sitio: la PWA del vecino en `/` y el panel municipal en `/admin/*`,
con la vista decidida por el rol de la sesión. `apps/admin-web` desaparece.

### Criterios de aceptación

1. Las 5 pantallas del panel (Solicitudes con revisión, Métricas, Derivación, Mapa de calor y
   Auditoría) funcionan en `:5173/admin/...` igual que hoy en `:5174/...`.
2. `/admin/*` solo se muestra con rol `funcionario` o `admin`. Un vecino que entra a `/admin` vuelve a
   `/inicio`. `/admin/auditoria` y su enlace en la barra lateral son solo para `admin`.
3. El código del panel (páginas, `api/admin.ts`, leaflet y su CSS) va en un **chunk aparte**, cargado
   con `React.lazy`. Con sesión de vecino, la pestaña Red del navegador no muestra ese chunk.
4. "Modo funcionario" en `SeleccionInicio` navega a `/admin` dentro del mismo sitio. No existe
   `VITE_ADMIN_URL`.
5. La identidad sale **solo** de `GET /api/sesion` (cookie). No quedan en `localStorage` ni
   `arca.usuarioCiudadanoId` ni `arca.panel.perfilDev`, y ninguna llamada envía `Authorization`.
6. Los botones de desarrollo (Vecino, Funcionario, Admin) solo aparecen con `import.meta.env.DEV`, y
   usan `POST /api/auth/dev/login`.
7. "Salir" (PWA, selección y panel) cierra la sesión: si `devLogin`, con `POST /api/auth/logout` y
   luego `/login`; si no, navegando a `/api/auth/clave-unica/logout`.
8. `apps/admin-web/` no existe. `npm run lint && npm run build` en verde en `apps/frontend`.

## 2. Diseño

### 2.1 Estructura

```
apps/frontend/src/
├── admin/                          ← nuevo: lo que era apps/admin-web/src
│   ├── AdminApp.tsx                (rutas relativas del panel, antes App.tsx)
│   ├── admin.css                   (import de leaflet + .leaflet-container)
│   ├── api/admin.ts
│   ├── components/
│   │   ├── AdminShell.tsx
│   │   ├── RevisionSolicitud.tsx
│   │   └── ui/{EstadoPill.tsx,estadoMeta.ts,index.ts}   (versiones del panel)
│   └── pages/{Solicitudes,Metricas,Derivacion,MapaCalor,Auditoria}.tsx
├── auth/SessionContext.tsx         (reescrito, §2.3)
├── App.tsx                         (+ ruta /admin/* lazy)
└── ...                             (PWA sin cambios)
```

- `BackButton`, `EmptyState`, `IconBadge` y `ListItemCard` son idénticos en los dos front (verificado):
  el panel usa los de `src/components/ui`.
- `EstadoPill` y `estadoMeta` divergieron a propósito (etiquetas del panel y del vecino,
  SPEC-ciclo-solicitud §3): el panel conserva los suyos en `admin/components/ui`.
- `SelectorPerfilDev.tsx` **no** se mueve: se reemplaza por la sesión real.
- Dependencias que pasan a `apps/frontend`: `leaflet`, `react-leaflet` y `@types/leaflet`, con las
  versiones de `admin-web`. No son nuevas para el proyecto.

### 2.2 Rutas

```tsx
const AdminApp = lazy(() => import('./admin/AdminApp'));

<Route path="/admin/*" element={
  <RequireRol roles={['funcionario', 'admin']}>
    <Suspense fallback={<Cargando />}><AdminApp /></Suspense>
  </RequireRol>
} />
```

Dentro de `AdminApp`, rutas relativas: `index` → Solicitudes, `metricas`, `derivacion`, `mapa-calor`
y `auditoria` (con `RequireRol roles={['admin']}`). Los `NavLink` de `AdminShell` y los `navigate('/')`
de las páginas pasan a `/admin/...`.

`RequireRol` vive junto a `RequireSession` en `components/AppShell.tsx`: sin sesión → `/login`; con un
rol que no corresponde → `/inicio`. **Es una comodidad de interfaz, no una barrera:** la barrera es el
`RolesGuard` del backend.

### 2.3 Sesión en el front

`SessionContext` expone `{ sesion: { ciudadanoId, nombre, rol, devLogin } | null, cargando, entrarDev(id), salir() }`:

- Al montar: `GET /api/sesion`. 200 → sesión; 401 → `null`.
- `entrarDev(id)`: `POST /api/auth/dev/login`, y luego vuelve a pedir `/api/sesion`.
- `salir()`: según `devLogin` (criterio 7).
- Ante un 401 en cualquier llamada (sesión vencida o cerrada por inactividad): `sesion = null` →
  `/login`. `apiFetch` se comparte entre `api/arca.ts` y `admin/api/admin.ts`, y avisa al contexto.

`apiFetch` pierde el header `Authorization`: la cookie viaja sola porque es mismo origen.
`MisSolicitudes` sigue usando `localStorage` para las solicitudes ocultas: es una preferencia de
interfaz, no identidad.

## 3. Comandos

```bash
cd apps/frontend && npm install && npm run lint && npm run build
npm run dev    # :5173, proxy /api → :3000
```

Manual, en el navegador (backend con `ALLOW_DEV_LOGIN=true`):
1. Vecino (dev) → `/inicio`. Entrar a `/admin` manda a `/inicio`. En Red no aparece el chunk del panel.
2. Funcionario (dev) → selección → Modo funcionario → `/admin`. Revisar una solicitud, generar y
   descargar el Excel, ver Métricas y el Mapa. No ve Auditoría y `/admin/auditoria` lo saca.
3. Admin (dev) → ve y usa Auditoría.
4. Salir → `/login`; volver atrás no muestra datos (el `/api/sesion` da 401).
5. DevTools → Application → Local Storage: sin claves de identidad. Cookies: `arca_sesion` marcada HttpOnly.

## 4. Pruebas

El front no tiene suite de tests. La verificación es lint, build y el recorrido manual de §3, con
captura para el PR. `control-acceso` agregará las pruebas de backend que sostienen el criterio 2.

## 5. Límites

- **Siempre:** `git mv` para mover (el PR tiene que mostrar movimientos); mover primero y cambiar
  después, en tareas separadas.
- **Preguntar antes:** cambios visuales o de diseño del panel o de la PWA; dependencias nuevas.
- **Nunca:** decidir permisos solo en el front; dejar identidades de desarrollo fuera de
  `import.meta.env.DEV`.

## 6. Tareas

- [ ] **FU1 — Mover el panel a `/admin/*`.** Mover los archivos (§2.1), `AdminApp` con rutas relativas, ruta lazy en `App.tsx` protegida con `esAdministrador` (todavía con la sesión actual), dependencias de leaflet. El panel sigue usando sus identidades de desarrollo internas.
  - Verify: build; recorrido 2 y 3 de §3 con el selector del panel; chunk separado en `dist/assets`.
- [ ] **FU2 — Sesión por cookie.** Reescribir `SessionContext`, `apiFetch` compartido sin `Authorization`, `RequireRol`, botones de desarrollo (incluido Admin), "Salir" según `devLogin`, `AdminShell` lee el rol de la sesión; borrar `IDENTIDADES_DEV` y `perfilDevActual`.
  - Verify: recorrido completo de §3.
- [ ] **FU3 — Borrar `apps/admin-web`** y `VITE_ADMIN_URL`.
  - Verify: `grep -rn "admin-web\|VITE_ADMIN_URL\|5174" apps` sin resultados.

## 7. Preguntas abiertas

Ninguna que bloquee.
