# HU-07 — Dashboard de solicitudes de retiro con mapa (panel municipal)

> **Documento de traspaso.** Contiene todo el contexto necesario para implementar la HU-07 del
> proyecto A.R.C.A. sin acceso a la conversación previa. Todo lo marcado como *verificado* fue
> comprobado leyendo el código del repositorio el 2026-09-02, no la documentación.

---

## 0. Cómo usar este documento

Este documento se entrega a un agente de IA que va a implementar la HU. Antes de escribir código:

1. Lee las **reglas del repositorio** (sección 2). Son obligatorias y algunas cambian cómo se
   trabaja, no solo qué se escribe.
2. Lee el **estado verificado** (sección 4). Si algo de lo que dice contradice lo que encuentras
   en el código, **gana el código** y hay que reportar la discrepancia.
3. **No inventes datos.** En particular: la lista de sectores de Santo Domingo y sus coordenadas
   **no existen en el repositorio**. Ver sección 6.

---

## 1. Contexto del proyecto

**A.R.C.A.** (Administración de Residuos y Colaboración Automatizada) es una PWA de gestión de
residuos voluminosos para la **Ilustre Municipalidad de Santo Domingo, Chile**. Proyecto del equipo
**COM Tech** para la Feria de Software 2026.

- **Repositorio:** https://github.com/blindjamin/A.R.C.A
- **Raíz local:** `C:\Users\benjamin\OneDrive\Escritorio\ARCA\FDS A.R.C.A`
- **Rama de trabajo:** `2026-09-02-benja-mapa-admin-hu07` (creada desde `develop`)
- **Responsable de esta HU:** Benjamín Paicil (Scrum Master; responsable de backend admin y frontend admin)

### Estructura del monorepo

```
FDS A.R.C.A/
├── packages/arca-core/       # entidades TypeORM + AuthModule compartidos (npm workspace)
├── apps/backend/             # API ciudadana, NestJS (npm workspace) — ÚNICO que corre migraciones
├── apps/backend-admin/       # API del panel municipal, NestJS (npm workspace)
├── apps/frontend/            # PWA ciudadana, React + Vite (NO es workspace)
├── apps/admin-web/           # Panel municipal, React + Vite (NO es workspace)
└── docs/
```

Los dos backends y el núcleo son **npm workspaces**: se instalan con un solo `npm install` en la
raíz. Los dos frontends llevan `npm install` propio dentro de su carpeta.

### Stack relevante para esta HU

| Capa | Tecnología | Versión verificada |
|---|---|---|
| Panel admin (front) | React + Vite + Tailwind | React **19.2.8**, Vite 8.2.2, Tailwind 3.4.19, TS ~6.0.2 |
| Router | react-router-dom | 7.18.3 |
| Panel admin (back) | NestJS + TypeORM + MySQL | — |
| Mapas | **Ninguna librería instalada todavía** | — |

> ⚠️ React 19 obliga a usar **react-leaflet v5 o superior**. La v4 solo soporta React 18.

---

## 2. Reglas del repositorio (obligatorias)

Están en `AGENTS.md` en la raíz. Las que aplican directamente a esta HU:

| Regla | Qué exige |
|---|---|
| **A.1 No inventar** | Nunca generar datos, endpoints, columnas o decisiones que no estén en las fuentes. Si algo no está documentado, decirlo y preguntar. |
| **A.2 Verificar antes de responder** | Precedencia: código del repo > documentación del repo > Drive > GitHub. Si un doc y el repo se contradicen, gana el repo. |
| **A.4 Alcance acotado** | Hacer solo lo pedido. Si aparece un problema fuera de alcance, **reportarlo, no arreglarlo**. |
| **A.7 Una sola área por sesión** | El trabajo se limita a un área. Si hace falta tocar otra, **parar y avisar**: se resuelve con un PR aparte, no metiendo el cambio en la misma rama. |
| **A.9 Confirmar antes de commitear** | Mostrar los cambios primero. El commit, merge y push se hacen solo con visto bueno explícito, **por vez**. |
| **A.10 Documentación al día** | Actualizar los `.md` que queden desfasados es parte de la tarea, no trabajo extra. |
| **A.11 Convenciones** | Tipos explícitos en TS. Controladores delgados, lógica en services. DTOs con `class-validator`. **Ninguna pantalla hace `fetch` directo**: todo pasa por la capa de API. Comentarios solo para lógica no obvia. |
| **A.12 Qué no tocar** | `.env*`, migraciones ya aplicadas (se corrigen con una migración nueva), `ARCA_database_schema.dbml`, ramas `master`/`develop` en directo. |
| **A.13 Trailers de commit** | Todo commit termina con tres líneas obligatorias (ver sección 9). Un hook local rechaza el commit si falta alguna. |
| **A.6 Idioma** | Código, comentarios, commits y documentación en **español neutro**, sin modismos regionales. |
| **B.2 Datos sensibles** | Nunca usar datos reales de vecinos para probar. Datos ficticios siempre. |

### Áreas y responsables (regla A.7)

| Área | Carpeta | Responsable |
|---|---|---|
| Backend ciudadano | `apps/backend/` | Miguel + Javier |
| Frontend ciudadano | `apps/frontend/` | Ana + Maxi |
| **Backend admin** | `apps/backend-admin/` | **Benjamín — esta HU** |
| **Frontend admin** | `apps/admin-web/` | **Benjamín — esta HU** |
| Núcleo compartido | `packages/arca-core/` | Cambia solo por PR revisado por backend ciudadano |
| Base de datos | migraciones en `apps/backend/` | — |

**Esta HU trabaja únicamente en `apps/backend-admin/` y `apps/admin-web/`.** Cualquier necesidad de
tocar otra carpeta se detiene y se avisa.

---

## 3. La historia de usuario

| Campo | Valor |
|---|---|
| **ID** | HU-07 |
| **Épica** | EP-04 — Dashboard Administrativo Municipal |
| **Descripción** | Dashboard de solicitudes de retiro con mapa (admin) |
| **Prioridad** | High |
| **Alcance declarado** | Front + Back |
| **Fuente** | `CLAUDE_proyecto.md:202` |

### Alcance de esta rama

Construir **el mapa funcional de punta a punta** en el panel municipal: endpoint de agregación en
`backend-admin` y pantalla en `admin-web`.

La captura de la ubicación en la app ciudadana **queda declarada como pendiente** y se resuelve
después, en su propio PR (es área de Ana y Maxi). El mapa se construye contra el contrato y se
llena solo cuando esa captura entre.

---

## 4. Estado verificado del código

Comprobado leyendo el repositorio. Las referencias son `archivo:línea`.

| Pieza | Estado | Evidencia |
|---|---|---|
| Columnas `latitud_capturada`, `longitud_capturada`, `direccion_anonimizada` | ✅ **Existen**, nullable | `apps/backend/src/database/migrations/1782163400000-create-solicitudes-retiro.ts:15` |
| Entidad `SolicitudRetiro` con esos campos | ✅ Existe | `packages/arca-core/src/entities/solicitud-retiro.entity.ts:36-60` |
| DTO del backend ciudadano acepta lat/lng | ✅ Existe | `apps/backend/src/solicitudes-retiro/dto/create-solicitud-retiro.dto.ts:26-34` |
| La PWA envía la ubicación al crear la solicitud | ❌ **No** | `apps/frontend/src/features/solicitud-retiro/NuevaSolicitud.tsx:40-44` manda solo `usuarioCiudadanoId`, `residuoCatalogoId` y `descripcion` |
| Concepto de «sector» (columna, tabla, catálogo o doc) | ❌ **No existe en ningún lado** | `grep` sobre `*.ts`, `*.tsx`, `*.md`, `*.dbml` → 0 resultados |
| Endpoint de agregación para el mapa | ❌ No existe | `apps/backend-admin/src/solicitudes/solicitudes-admin.controller.ts` solo tiene `GET /`, `GET /:id`, `PATCH /:id` |
| Ruta y pantalla del mapa | ❌ No existe | `apps/admin-web/src/App.tsx:14` solo tiene `/` y `/auditoria` |
| Leaflet u otra librería de mapas | ❌ No instalada | `apps/admin-web/package.json:12-16` |
| `RolesGuard` y `@Roles` reutilizables | ✅ Existen en `@arca/core` | `apps/backend-admin/src/solicitudes/solicitudes-admin.controller.ts:11` |

### Consecuencia

Las columnas de geolocalización existen y están migradas, pero **siempre valen `NULL`** porque nadie
las llena. El mapa arrancará vacío hasta que entre el PR pendiente del frontend ciudadano. Eso es
correcto y esperado: hay que mostrar un estado vacío explícito, no datos inventados.

---

## 5. Piezas de código existentes que hay que conocer

### 5.1 Entidad `SolicitudRetiro`

`packages/arca-core/src/entities/solicitud-retiro.entity.ts` — tabla `solicitudes_retiro`.
**No se modifica en esta HU** (es área de núcleo compartido, regla A.7).

```ts
id: number
usuarioCiudadanoId: string        // usuario_ciudadano_id, varchar(36)
residuoCatalogoId: number         // residuo_catalogo_id, int
estado: EstadoSolicitudRetiro     // enum
descripcion: string | null
direccionAnonimizada: string | null   // direccion_anonimizada, varchar(255)
latitudCapturada: string | null       // latitud_capturada, decimal(10,8)
longitudCapturada: string | null      // longitud_capturada, decimal(11,8)
fechaSolicitud: Date              // fecha_solicitud
fechaProgramada: Date | null
fechaCompletada: Date | null
operadorAsignadoId: string | null
razonRechazo: string | null
createdAt / updatedAt: Date
// Relaciones: usuarioCiudadano, residuoCatalogo, operadorAsignado
```

> Las columnas usan `snake_case` y las propiedades `camelCase`. TypeORM devuelve los `decimal` como
> **string**, no como number: hay que convertirlos explícitamente al agregar.

### 5.2 Estados de solicitud

```ts
'pendiente' | 'asignada' | 'en_proceso' | 'completada' | 'cancelada'
```

### 5.3 Controlador admin existente — patrón a replicar

`apps/backend-admin/src/solicitudes/solicitudes-admin.controller.ts`

```ts
@Controller('admin/solicitudes')
@UseGuards(RolesGuard)
@Roles(
  RolAdministrador.ADMIN,
  RolAdministrador.OPERADOR,
  RolAdministrador.PATROCINADOR,
)
export class SolicitudesAdminController {
  constructor(private readonly solicitudesAdminService: SolicitudesAdminService) {}

  @Get()
  findAll(@Query() filtros: FilterSolicitudesAdminDto) { ... }
  // ...
}
```

El módulo nuevo debe usar **el mismo guard y los mismos tres roles** para lectura.

### 5.4 Capa de API del panel

`apps/admin-web/src/api/admin.ts` — **todas** las llamadas HTTP pasan por acá (regla A.11).

```ts
const API_URL = import.meta.env.VITE_API_URL as string;

function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      ...init?.headers,
      'ngrok-skip-browser-warning': 'true',
      Authorization: `Bearer ${IDENTIDAD_DEV_PANEL}`,
    },
  });
}

async function handle<T>(res: Response): Promise<T> { /* valida ok + content-type JSON */ }

export function fetchSolicitudesAdmin(estado?: EstadoSolicitud): Promise<SolicitudRetiro[]> {
  const params = new URLSearchParams();
  if (estado) params.set('estado', estado);
  const qs = params.toString();
  return apiFetch(`${API_URL}/admin/solicitudes${qs ? `?${qs}` : ''}`)
    .then((r) => handle<SolicitudRetiro[]>(r));
}
```

> **Deuda declarada, no la resuelvas en esta HU.** `admin-web` no tiene login propio: usa un Bearer
> de desarrollo fijo (`IDENTIDAD_DEV_PANEL`) porque el `AuthGuard` de `@arca/core` es global. Eso lo
> cierra HU-12, no esta HU (regla A.4).

### 5.5 Router y navegación del panel

`apps/admin-web/src/App.tsx`:

```tsx
<BrowserRouter>
  <AdminShell>
    <Routes>
      <Route path="/" element={<Solicitudes />} />
      <Route path="/auditoria" element={<Auditoria />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AdminShell>
</BrowserRouter>
```

`apps/admin-web/src/components/AdminShell.tsx` — barra lateral fija de 240px:

```tsx
const NAV = [
  { to: '/', label: 'Solicitudes', icon: '📋', end: true },
  { to: '/auditoria', label: 'Auditoría', icon: '🛡️', end: false },
];
```

### 5.6 Primitivos de UI disponibles

`apps/admin-web/src/components/ui/index.ts` exporta: `IconBadge`, `EstadoPill`, `ESTADO_META`,
`ListItemCard`, `EmptyState`, `BackButton`. **Usar `EmptyState` para el estado vacío del mapa.**

### 5.7 Tokens de diseño

`apps/admin-web/tailwind.config.js` — espejo del UI Kit v1.0. Usar estos tokens, no colores sueltos:

```js
green: { 50:'#eff9f3', 100:'#ddf3e8', 200:'#b6ebcf', 300:'#7ed9ab',
         500:'#1bb46f', 600:'#138a57', 700:'#0F6B45', 800:'#0E5238', 900:'#0A3D29' }
gold:  { 50:'#fef7e9', 100:'#fdeccc', 400:'#f7b54e', 500:'#ef9d24', 600:'#c97e12' }
rose:  { 100:'#fbe2dc', 600:'#c4452f' }   // alertas
sky:   { 100:'#d9eef9', 600:'#1f7fb8' }   // info
ink:   { DEFAULT:'#0e1a14', 2:'#2b3a32' }
slate: { DEFAULT:'#5d6e64', 2:'#8a988f' }
line:  { DEFAULT:'#e6ece8', 2:'#eef2ef' }
canvas: '#f3f6f3'
card:  { DEFAULT:'#ffffff', 2:'#f8faf8' }
side:  '#0c3526'

fontFamily: { display: 'Bricolage Grotesque', body: 'Hanken Grotesk' }
borderRadius: { sm:'12px', md:'18px', lg:'24px', xl:'30px', pill:'999px' }
```

Colores de intensidad del mapa, tomados de esa paleta:
**alta** → `rose.600` `#c4452f` · **media** → `gold.500` `#ef9d24` · **baja** → `green.500` `#1bb46f`.

---

## 6. Decisión tomada y lo que sigue abierto

### Decidido: el sector se deriva de la ubicación, en el servidor

La app ciudadana pedirá la ubicación al crear la solicitud, y el servidor la traducirá a un sector.
Las columnas ya existen, así que **no hay migración ni cambios de base de datos**.

**Regla de diseño no negociable:** el endpoint **nunca devuelve coordenadas de solicitudes
individuales**. El navegador recibe centroides de sector y conteos. Así, aunque alguien abra las
herramientas de desarrollo, no hay dirección de ningún vecino que extraer.

Alternativas descartadas: que el vecino elija su sector de una lista (exige tres áreas ajenas y
tres PR), y deducir el sector del texto de `direccion_anonimizada` (parseo frágil y silencioso).

### 🔴 Abierto: la lista de sectores y sus coordenadas

**No existe en el repositorio.** Los siete sectores que aparecen en el prototipo de diseño son
datos de maqueta y **no tienen fuente verificable**:

```
Santo Domingo Centro · Rocas de Santo Domingo · San Enrique
Bahía · Las Brisas · El Convento · Litoral Norte
```

Por la regla A.1 **no se pueden inventar coordenadas**. El manejo correcto es:

1. Aislar el catálogo en un único archivo de constantes.
2. Marcarlo explícitamente como **provisional / pendiente de validación municipal** en un comentario.
3. Cuando llegue la lista oficial, ese es el único archivo que cambia.

### 🔴 Abierto: umbral mínimo por sector (k-anonimato)

Santo Domingo es una comuna pequeña. Un sector con una o dos solicitudes **identifica un hogar**.
Hay que definir un mínimo por debajo del cual el sector no se muestra o se agrupa, y aplicarlo
**en el servicio, nunca en el navegador**.

Esto no es un detalle técnico: es lo que separa una métrica agregada de un dato personal bajo la
**Ley de Protección de la Vida Privada**, que el proyecto se comprometió a respetar. El valor
concreto es decisión de producto — preguntar, no asumir.

---

## 7. Referencia de diseño

Existe un prototipo funcional del panel (Claude Design). Como el agente que implemente no va a
poder verlo, esta es la descripción de la pantalla objetivo.

### Barra lateral

Encabezado `ARCA / SANTO DOMINGO`. Sección **OPERACIÓN**: Dashboard · Solicitudes (con badge
numérico) · **Mapa de calor** · Operadores y rutas · Marketplace (badge) · Reportes · Auditoría.
Al pie, una tarjeta «Impacto del mes» con toneladas gestionadas y porcentaje reutilizado.

> El panel real hoy solo tiene Solicitudes y Auditoría. Esta HU agrega **Mapa de calor**; el resto
> de los ítems del prototipo **no** son parte de esta HU (regla A.4).

### Pantalla «Mapa de calor»

- **Encabezado:** título `Mapa de calor`, bajada `Distribución georreferenciada de solicitudes`.
- **Tarjeta principal** (ocupa ~2/3 del ancho): título `Comuna de Santo Domingo`, bajada
  `Intensidad por sector · datos del mes`, y arriba a la derecha un **toggle `Volumen | Pendientes`**.
- **El mapa** muestra un *blob* radial por sector, con radio proporcional al conteo y color según
  intensidad. Cada blob lleva una etiqueta tipo píldora con el nombre del sector y su número.
  **No es un mapa de calor continuo tipo gaussiano** — son círculos por sector.
- **Leyenda** fija abajo a la izquierda del mapa, titulada `INTENSIDAD`: Alta demanda (rojo) /
  Demanda media (naranja) / Demanda baja (verde).
- **Panel lateral derecho** (~1/3):
  - Tarjeta `Total comuna`: número grande de solicitudes, cantidad de pendientes y variación porcentual.
  - Tarjeta `Ranking de sectores`: lista numerada, cada fila con punto de color de intensidad,
    nombre del sector, subtítulo `N pendientes` y el conteo alineado a la derecha.
  - Botón primario al pie: `Gestionar solicitudes` (navega a la pantalla de Solicitudes, ruta `/`).
- **El toggle es funcional:** al pasar a `Pendientes` cambian los números de los blobs, se recalcula
  el color de intensidad y **se reordena el ranking**.

---

## 8. Plan de implementación

### Pendiente previo (otra área — PR aparte, NO en esta rama)

**Pedir la ubicación al crear la solicitud.**
`apps/frontend/src/features/solicitud-retiro/NuevaSolicitud.tsx` hoy manda solo usuario, residuo y
descripción. Falta pedir la ubicación y agregar los dos campos, que el DTO del backend ya acepta.
Es área de Ana y Maxi. Se avisa al equipo y se resuelve en su propio PR.

Hasta que ese PR entre, el mapa muestra su estado vacío con todos los sectores en cero. **Eso es
lo correcto:** un mapa que dibuja datos que no existen sería peor que uno vacío.

---

### Fase 1 — `backend-admin`: endpoint de agregación

Módulo propio, **no** dentro de `solicitudes/`: lo que devuelve no es el CRUD de solicitudes sino
una métrica agregada, con reglas de privacidad propias.

| Archivo | Qué hace |
|---|---|
| `src/mapa-calor/mapa-calor.controller.ts` | `GET /admin/mapa-calor`, con el mismo `RolesGuard` y los mismos tres roles que el controlador de solicitudes. Controlador delgado. |
| `src/mapa-calor/mapa-calor.service.ts` | Agregación con QueryBuilder: agrupa por sector, cuenta totales y pendientes, aplica el umbral mínimo, calcula la intensidad. |
| `src/mapa-calor/sectores.constants.ts` | Catálogo de sectores y centroides. **Marcar como provisional** (ver sección 6). |
| `src/mapa-calor/dto/filter-mapa-calor.dto.ts` | `metrica: 'volumen' \| 'pendientes'` y rango de fechas opcional, con `class-validator`. |
| `src/app.module.ts` | Registrar el módulo nuevo. |

**Contrato de respuesta** — solo agregados, nunca un punto individual:

```json
[
  {
    "sector": "Santo Domingo Centro",
    "lat": -33.6,
    "lng": -71.6,
    "total": 312,
    "pendientes": 28,
    "intensidad": "alta"
  }
]
```

Notas de implementación:
- TypeORM devuelve `decimal` como **string**: convertir antes de agregar.
- Las solicitudes sin ubicación (`latitud_capturada IS NULL`) no se pueden asignar a un sector.
  Decidir si se descartan o se reportan aparte como `sin_ubicacion`, y documentarlo.
- El umbral mínimo se aplica **acá**, no en el frontend.

---

### Fase 2 — `admin-web`: capa de API, ruta y navegación

| Archivo | Qué hace |
|---|---|
| `src/api/admin.ts` | Tipo `SectorMapaCalor` y `fetchMapaCalor(metrica)`. Reutilizar `apiFetch` y `handle<T>`. Ninguna pantalla hace `fetch` directo. |
| `src/App.tsx` | Ruta `/mapa-calor`. |
| `src/components/AdminShell.tsx` | Ítem nuevo en el arreglo `NAV`. |

---

### Fase 3 — `admin-web`: la pantalla

```bash
cd apps/admin-web
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

> **react-leaflet v5 o superior** — la v4 solo soporta React 18 y el panel corre React 19.2.8.

| Archivo | Qué hace |
|---|---|
| `src/pages/MapaCalor.tsx` | Mapa centrado en Santo Domingo, capa de teselas OpenStreetMap, un `CircleMarker` por sector, toggle Volumen/Pendientes, panel lateral con total y ranking, leyenda de intensidad. |
| `src/index.css` | Importar `leaflet/dist/leaflet.css` y dar altura explícita al contenedor del mapa. |

Detalles que se olvidan y rompen la pantalla:

- **La atribución de OpenStreetMap es obligatoria por licencia** (ODbL) y no se quita. El
  `TileLayer` la trae por defecto.
- **El contenedor del mapa necesita altura explícita** o Leaflet lo renderiza con cero píxeles de alto.
- Usar `CircleMarker` con radio proporcional al conteo y color por intensidad reproduce el diseño
  **sin necesidad del plugin `leaflet.heat`** — una dependencia menos y con tipos incluidos.
- Resolver los tres estados: cargando, error y vacío. Para el vacío existe `EmptyState`.

**Cómo verificar sin datos reales:** con la base sin ubicaciones, el mapa debe renderizar la comuna,
los sectores en cero y el estado vacío, sin errores en consola. Para ver el comportamiento con carga,
poblar `latitud_capturada` y `longitud_capturada` en unas pocas filas de prueba de la base local con
**coordenadas ficticias**. Nunca datos de vecinos reales (regla B.2).

---

### Fase 4 — Documentación y cierre

Regla A.10: actualizar la documentación es parte de la tarea.

| Archivo | Qué actualizar |
|---|---|
| `apps/backend-admin/README.md` | El endpoint nuevo y su contrato. |
| `apps/admin-web/README.md` | La pantalla nueva. |
| `docs/FRONTEND_FASE1.md:341` | Hoy dice que falta el mapa de calor en el dashboard municipal. Queda desactualizado. |

Verificación obligatoria antes de integrar (no hay CI configurado todavía):

```bash
cd apps/backend-admin  && npm run lint && npm run build
cd apps/admin-web      && npm run lint && npm run build
```

---

## 9. Convenciones de commit

Formato: `<tipo>(<scope>): <descripción corta>` — tipos `feat`, `fix`, `docs`, `style`, `refactor`,
`test`, `chore`.

**Todo commit termina con tres líneas obligatorias** (regla A.13). Un hook local las valida y
rechaza el commit si falta alguna:

```
IA: agente | asistido | no
HU: HU-07
Revisor: nombre | pendiente
```

- `IA: agente` — lo generó un agente y la persona lo revisó antes de commitear.
- `IA: asistido` — lo escribió la persona con autocompletado o sugerencias puntuales.
- `IA: no` — lo escribió la persona sin ayuda de IA.

Ejemplo:

```
feat(backend-admin): agregar endpoint de mapa de calor por sector

IA: agente
HU: HU-07
Revisor: pendiente
```

Integración: **PR contra `develop`**, nunca merge directo, nunca `push --force`. Y por regla A.9,
el commit y el push se hacen solo con visto bueno explícito de Benjamín en ese momento.

---

## 10. Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| **El mapa llega vacío a una demo o a un hito.** Mientras la app ciudadana no pida la ubicación, todas las solicitudes quedan sin sector. Es una decisión consciente, pero sorprende a quien no la conoce. | Estado vacío explícito en la pantalla, y avisar al equipo de que la carga del mapa depende del PR pendiente del frontend ciudadano. |
| **Sectores y coordenadas sin fuente.** Los siete del prototipo son datos de diseño. | Aislarlos en un archivo de constantes marcado como provisional, y pedir la lista oficial al municipio antes de presentar el mapa como dato. |
| **Un sector con pocas solicitudes identifica un hogar.** La agregación por sí sola no garantiza anonimato en una comuna chica. | Umbral mínimo por sector, aplicado en el servicio y no en el navegador. |
| **El panel sigue sin sesión propia.** `admin-web` usa un Bearer de desarrollo fijo; el endpoint nuevo hereda esa deuda. | Fuera del alcance de esta HU (regla A.4). Es trabajo de HU-12, ya declarado como deuda en el código. |

---

## 11. Checklist de cierre

- [ ] Catálogo de sectores aislado en un archivo y marcado como provisional
- [ ] Umbral mínimo por sector definido y aplicado en el servicio, no en el navegador
- [ ] Endpoint responde con agregados y sin coordenadas individuales
- [ ] Pantalla resuelve carga, error y estado vacío con la base sin ubicaciones
- [ ] Comportamiento con carga verificado con filas de prueba ficticias
- [ ] Atribución de OpenStreetMap visible en el mapa
- [ ] Lint y build en verde en `backend-admin` y `admin-web`
- [ ] `apps/backend-admin/README.md`, `apps/admin-web/README.md` y `docs/FRONTEND_FASE1.md` actualizados
- [ ] Pendiente de captura de ubicación avisado al equipo y anotado en el PR
- [ ] Commits con trailers `IA:` / `HU: HU-07` / `Revisor:`
- [ ] PR abierto contra `develop`, nunca merge directo

---

*A.R.C.A. · Equipo COM Tech · Feria de Software 2026*
*Estado del código verificado sobre la rama `2026-09-02-benja-mapa-admin-hu07` el 2026-09-02.*
