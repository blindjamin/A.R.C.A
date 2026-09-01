# CLAUDE.md — Proyecto A.R.C.A.
> Archivo de contexto para sesiones de Claude Code · COM Tech · Feria de Software 2026
> Leer completo antes de escribir cualquier línea de código o responder sobre el proyecto.

---

## 1. Descripción del proyecto

**ARCA** (Administración de Residuos y Colaboración Automatizada) es una **Progressive Web App (PWA)** desarrollada por el equipo **COM Tech** para la **Ilustre Municipalidad de Santo Domingo, Chile** (patrocinador: Juan Pablo Vidal).

Digitaliza y optimiza la gestión de residuos voluminosos conectando a vecinos y funcionarios municipales en una sola plataforma. Prioriza la **economía circular**: antes de retirar un objeto como desecho, ARCA le da la oportunidad de ser reutilizado entre vecinos vía marketplace P2P.

**Contexto del curso:** Feria de Software · actualmente en **Hito 3 — Definición Técnica**.

---

## 2. Equipo COM Tech

| Rol | Integrante |
|---|---|
| Scrum Master / Líder | Benjamín Paicil |
| Product Owner | Miguel Segovia |
| Front-End | Maximiliano López |
| Back-End | Javier Figueroa |
| UX/UI & QA Specialist | Ana Araya |

---

## 3. Fuentes de verdad — verificar SIEMPRE antes de responder

El orden de precedencia es:

1. **Archivos en este repositorio** (ver sección 9 para mapa de archivos). Los `package.json` mandan sobre cualquier prosa: si un documento afirma que se usa una librería y no aparece como dependencia, el documento está equivocado.
2. **Google Drive** — carpeta "Feria de Software" (`ID: 1hv_QMx2JeU7U8-Oa183bygpkUHbd_xOI`), subcarpeta "Hito 3" (`ID: 1TW-G_GZgn8NIJtg7Hdhb5DeOWjflh-QM`).
   > ⚠️ `ARQUITECTURA_ARCA_PWA.md` y `EPICAS_HISTORIAS_USUARIO_V2.md` (mayo 2026) están **desactualizados**: proponen PostgreSQL, Redis, Express y épicas EP-01 a EP-11. Nada de eso rige — ver secciones 4, 5 y 7.
3. **GitHub público** — `https://github.com/blindjamin/A.R.C.A` (issues y Project). **Es la fuente de verdad de la numeración de épicas**: si la documentación y el tablero difieren, manda el tablero. Falta crear ahí la épica EP-06 y las 13 historias incorporadas en el refinamiento.

> **Si algo no está en estas fuentes, decirlo claramente. Nunca inventar datos, métricas, costos ni decisiones técnicas.**

---

## 4. Stack técnico CONFIRMADO

Todas las decisiones aquí registradas son **definitivas** y surgieron de restricciones reales del entorno municipal. No proponer alternativas salvo que Benjamín lo solicite explícitamente.

> **Distinguir siempre instalado de previsto.** Las versiones son las de los `package.json` y las
> comprometidas al municipio el 14-08-2026. No afirmar que algo está en uso si no aparece como
> dependencia.

### 4.1 Frontend (PWA)

**Instalado** — 3 dependencias de producción, 15 de desarrollo:

| Tecnología | Versión | Uso |
|---|---|---|
| React + React DOM | 19.2.6 | UI |
| React Router DOM | 7.18.0 | Navegación entre pantallas |
| Vite | 8 | Compilador y servidor de desarrollo |
| Tailwind CSS (+ PostCSS, Autoprefixer) | 3.4 | Estilos y tokens de diseño |
| TypeScript | 6.0 | Tipado |
| ESLint | 10.3 | Linting |

**Previsto (segunda etapa), todavía no instalado:** Redux Toolkit (estado global), TensorFlow.js
(clasificación en el navegador del usuario), Leaflet + OpenStreetMap (mapas, sin costo ni API key),
Socket.io-client (tiempo real), Workbox (Service Worker / modo offline).

> El estado hoy se maneja con React local + `SessionContext`. **No introducir Redux** hasta que el
> estado local sea insuficiente y esté acordado con Maximiliano.

### 4.2 Backend

**Instalado** — 12 dependencias de producción, 23 de desarrollo:

| Tecnología | Versión | Uso |
|---|---|---|
| NestJS (`common`, `core`, `platform-express`) | 11.0.1 | Servidor y API REST — arquitectura modular |
| `@nestjs/config` + `dotenv` | 4.0.4 / 16.6 | Configuración por ambiente |
| `@nestjs/typeorm` + TypeORM | 11.0.2 / 1.0 | ORM y migraciones versionadas |
| `mysql2` | 3.22.5 | Conector MySQL 8 / MariaDB 10.6+ |
| `class-validator` + `class-transformer` | 0.15 / 0.5 | Validación y transformación de DTOs |
| Jest + Supertest | 30 / 7 | Tests |
| TypeScript · ESLint · Prettier | 5.7 · 9.18 · 3.4 | Tipado, linting y formato |

**Previsto (segunda etapa), todavía no instalado:** `@nestjs/jwt` + ClaveÚnica OAuth2 (autenticación
— **no hay contraseñas locales**), Socket.io vía Gateways de NestJS (tiempo real), Winston (logs).

**Runtime:** Node.js **24.18.0** (línea 24.x LTS), mínimo **22.12.0** — lo exige Vite 8. npm 11.x
incluido. phpMyAdmin para administrar la BD, proporcionado por el municipio.

### 4.3 DevOps / Infraestructura

| Tecnología | Uso |
|---|---|
| Servidores municipales (cPanel + SSH) | Hosting — provistos por la Municipalidad de Santo Domingo |
| PM2 o systemd | Gestión del proceso Node.js en el servidor (cPanel «Setup Node.js App» ya lo cubre) |
| Docker Compose | MySQL 8 **solo en desarrollo local** — no se instala en el servidor municipal |
| GitHub Actions | CI (lint / test / build) + deploy vía SSH — planificado, aún sin workflows |
| Git | Control de versiones |

**Ambiente en el servidor municipal** (solicitado el 14-08-2026): base `arca_db` vacía con usuario
`arca_user` (`utf8mb4` / `utf8mb4_unicode_ci`), puerto interno **3000/TCP** en `127.0.0.1`
(alternativa 3010), proxy inverso de `/api/` y `/socket.io/` desde el 443, y excepción en el WAF del
dominio para WebSocket en `/socket.io/*` y `/ws/*`. El usuario de BD necesita privilegios DDL
(`SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES`) acotados solo a `arca_db`,
porque las migraciones crean el esquema. Un solo proceso Node, 150–300 MB de RAM, <2 GB de disco
inicial. **Sin Docker ni Redis en producción.**

---

## 5. Decisiones de arquitectura y por qué

Estas decisiones surgieron de restricciones reales. **No revertirlas.**

### 5.1 MySQL/MariaDB — NO PostgreSQL
El servidor municipal tiene cPanel con phpMyAdmin, que gestiona MySQL/MariaDB de forma nativa. PostgreSQL no está disponible en ese entorno.

### 5.2 TensorFlow.js cliente — NO Google Cloud Vision API
- El servidor municipal es compartido (cPanel) sin capacidad de cómputo pesado.
- Google Cloud Vision requiere cuenta de facturación y clave API, generando costos y dependencia externa.
- TensorFlow.js corre en el navegador del usuario: cero costo, sin límites de API, sin cuentas externas.
- **Principio "IA como apoyo, no como decisión"**: el usuario siempre confirma o corrige la sugerencia. Si la IA no detecta nada, el usuario clasifica manualmente desde el catálogo.

### 5.3 NestJS — NO Express.js puro
NestJS sobre Node.js 24.18 provee estructura modular nativa (módulos, controllers, services, guards, gateways). Facilita mantenimiento y tests. Se solicitó al municipio instalar o confirmar Node.js 24.18.0 en el servidor (mínimo 22.12.0).

### 5.4 Sin Docker en producción, sin Redis (MVP)
- Docker no está disponible en entornos cPanel compartidos, por lo que **en producción** la app corre directamente sobre Node.js del servidor municipal.
- **En desarrollo local sí se usa Docker** (`docker-compose.yml`) únicamente para levantar MySQL 8 de forma reproducible. No se despliega Docker al servidor.
- Redis queda planteado como mejora futura de escalado; el MVP corre en un solo proceso con autenticación stateless vía JWT.

### 5.5 Sin AWS/GCP/DigitalOcean
Todo el hosting es en servidores de la Municipalidad de Santo Domingo. Decisión impuesta por el patrocinador.

### 5.6 WAF municipal + WebSocket
Todo el dominio está detrás de un WAF municipal. Se coordina con el municipio una **excepción de firewall para WebSocket** (Socket.io) del chat en tiempo real.

### 5.7 Almacenamiento de imágenes
Las fotos se guardan como **archivos en directorio protegido** del servidor (fuera del directorio público) y se sirven vía API con autenticación. En la BD solo se almacena la ruta relativa. Esto protege datos personales y de ubicación.

### 5.8 ClaveÚnica como único método de autenticación
No existe registro con usuario/contraseña local. Toda autenticación pasa por ClaveÚnica OAuth2. Los roles (vecino, administrador, operador, patrocinador) se gestionan en la base de datos.

### 5.9 Dominio propio
El equipo decidió mantener un dominio de pago (no subdomain gratuito). El costo anual está reflejado en la tabla de costos de la arquitectura convertido a valor mensual aproximado.

---

## 6. Principios de código

- **Clean Architecture light**: controladores delgados que delegan lógica de negocio a *services* independientes. Los *Guards* manejan autorización por roles. Los *Gateways* manejan tiempo real.
- **Stateless**: autenticación JWT sin sesiones en servidor — facilita el MVP en proceso único.
- **IA como apoyo**: nunca tomar una decisión automática sin confirmación del usuario.
- **Sin CAS Chile**: el sistema Power Builder + Sybase que usa el municipio está **fuera del alcance de ARCA**. No integrar.

---

## 7. Backlog

**27 historias de usuario en 5 épicas activas**, según el refinamiento de agosto de 2026. Se
la numeración es la del **tablero de GitHub**, que es donde el equipo trabaja: EP-05 está cerrada y
EP-06 todavía no existe como issue.

### Épicas

| Fase | ID | Épica | HUs |
|---|---|---|---|
| 1 — MVP | EP-01 | Fundación y Seguridad | HU-12, HU-13, HU-14, HU-01, HU-37, HU-38 |
| 1 — MVP | EP-02 | Interfaz Ciudadana | HU-02, HU-03, HU-17, HU-23, HU-39 |
| 2 — Core | EP-03 | Marketplace e Incentivos | HU-04, HU-05, HU-06, HU-10, HU-11, HU-19, HU-20 |
| 2 — Core | EP-04 | Dashboard Administrativo Municipal | HU-07, HU-08, HU-09, HU-31, HU-32, HU-33 |
| 3 — Polish | EP-06 | Confianza y Comunidad | HU-15, HU-16, HU-18 |
| — | ~~EP-05~~ | ~~Seguridad, Autenticación y Trazabilidad~~ | **CERRADA** — HU-12, HU-13 y HU-14 pasaron a EP-01 |

> ⚠️ **No confundir con la numeración vieja del README.** Hasta agosto de 2026 este archivo y el
> `README.md` usaban otra correspondencia (EP-01 Interfaz Ciudadana, EP-03 Dashboard, EP-05
> Seguridad). Esa numeración **nunca coincidió con los issues** y quedó corregida. Ante cualquier
> duda sobre a qué épica pertenece una historia, **manda el tablero de GitHub**.
>
> **EP-05 se cierra, no se elimina.** Sus tres historias se absorbieron en EP-01 porque autenticación,
> control de acceso y auditoría son la base sobre la que se levanta todo lo demás. Se conserva cerrada
> para no romper la trazabilidad del historial y de los issues ya creados.
>
> **EP-06 todavía no existe en GitHub**: hay que crearla, junto con las 13 historias nuevas.

### Resumen de Historias de Usuario

| ID | Épica | Descripción resumida | Prioridad | Asignado |
|---|---|---|---|---|
| HU-01 | EP-01 | Registrar residuo con foto desde móvil | Highest | Front + Back |
| HU-02 | EP-02 | Clasificación automática por IA (sugerencia) | High | Back |
| HU-03 | EP-02 | Seguir estado de solicitud de retiro | High | Front |
| HU-17 | EP-02 | Feedback post-retiro detallado | Medium | Front + UX |
| HU-23 | EP-02 | Recibir notificaciones de cambios de estado | Medium | Back |
| HU-39 | EP-02 | Ver preguntas frecuentes por categoría (estática) | Low | Front |
| HU-04 | EP-03 | Publicar artículo en marketplace P2P | High | Front + Back |
| HU-05 | EP-03 | Buscar y filtrar artículos en marketplace | Medium | Front |
| HU-06 | EP-03 | Contactar publicador para coordinar retiro (chat P2P) | Medium | Back + UX |
| HU-10 | EP-03 | Otorgar Circular Credits por entrega en marketplace | Low | Back |
| HU-11 | EP-03 | Consultar saldo e historial de Circular Credits | Low | Front + UX |
| HU-19 | EP-03 | Estadísticas personales de CO₂ ahorrado | Low | Front + Back |
| HU-20 | EP-03 | Ranking de ciudadanos por impacto | Low | Back |
| HU-07 | EP-04 | Dashboard de solicitudes de retiro con mapa (admin) | High | Front + Back |
| HU-08 | EP-04 | Programar y asignar retiros a operadores | Medium | Back |
| HU-09 | EP-04 | Generar reporte de gestión (PDF/CSV) | Low | Back |
| HU-31 | EP-04 | Marcar solicitud como «en ruta» | Medium | Back |
| HU-32 | EP-04 | Subir foto del retiro con GPS | Medium | Front + Back |
| HU-33 | EP-04 | Marcar solicitud como «retirado» | Medium | Back |
| HU-12 | EP-01 | Iniciar sesión con ClaveÚnica | Highest | Front + Back |
| HU-13 | EP-01 | Control de acceso por roles | High | Back |
| HU-14 | EP-01 | Registro auditable de acciones críticas | Medium | Back + QA |
| HU-37 | EP-01 | Editar perfil | Low | Front + Back |
| HU-38 | EP-01 | Eliminar cuenta | Low | Back |
| HU-15 | EP-06 | Calificar a otros usuarios (ratings) | Medium | Front + Back |
| HU-16 | EP-06 | Denunciar incumplimiento | Medium | Back |
| HU-18 | EP-06 | Admin revisa y bloquea usuarios | Medium | Back + UX |

### Historias fuera de alcance — no reproponer

**En pausa, recuperables:** HU-26 (preferencias de notificaciones, complementa a HU-23) ·
HU-27, HU-28, HU-29 (referidos) · HU-30 (ver ruta asignada en mapa).

**Propuestas para eliminar:** HU-21 (badges) · HU-22 (compartir en redes) · HU-34 (tema oscuro) ·
HU-35 (cambiar idioma) · HU-36 (zona horaria) · HU-40 (chatbot de FAQ — elimina además la superficie
de inyección de prompts) · HU-41 (escalado del chatbot) · HU-42 (analítica de preguntas).

**Sin historia asociada:** HU-24 y HU-25 — borrar o renumerar.

---

## 8. Base de datos — resumen

Motor: **MySQL 8** en local (Docker, base `arca_dev`) y **MySQL 8 / MariaDB 10.6+** en el servidor
municipal (base `arca_db`, `utf8mb4_unicode_ci`). La aplicación crea el esquema con migraciones
versionadas de TypeORM; la base se entrega vacía.

**6 tablas implementadas hoy** — primera etapa, 5 migraciones aplicadas:

`usuarios_ciudadanos` · `sesiones_ciudadano` · `usuarios_administradores` · `sesiones_administrador` · `residuos_catalogo` · `solicitudes_retiro`

**22 tablas contempladas** en `ARCA_database_schema.dbml` para las etapas siguientes, todas dentro de
la misma base. Además de las 6 anteriores:

`horarios_retiro` · `foto_retiro` · `impacto_ambiental` · `feedback_retiro` · `articulos_marketplace` · `mensajes_marketplace` · `ratings` · `denuncias` · `referidos` · `transacciones_circular_credits` · `auditoria` · `notificaciones` · `faq_articulos` · `conversaciones_chatbot` · `social_shares` · `preferencias_usuario`

> Tras el refinamiento del backlog, **`social_shares`, `conversaciones_chatbot`, `referidos` y
> `preferencias_usuario` quedan sin ninguna historia que las use** (ver sección 7). No construir sobre
> ellas sin consultarlo antes con Miguel.

**9 endpoints REST** implementados bajo el prefijo `/api`:

| Método | Ruta | Módulo |
|---|---|---|
| `GET` | `/api` · `/api/health` | raíz y health check |
| `GET` | `/api/residuos/catalogo` | catálogo de residuos con precios reales |
| `POST` `GET` | `/api/solicitudes-retiro` | crear y listar solicitudes |
| `GET` `PATCH` | `/api/solicitudes-retiro/:id` | detalle y cambio de estado |
| `PATCH` | `/api/solicitudes-retiro/:id/cancelar` | cancelar solicitud |
| `GET` | `/api/usuarios/:ciudadanoId/perfil-acceso` | gate de login diferido |

**WebSocket:** previsto en `/socket.io/*` y `/ws/*` para el chat y las notificaciones en tiempo real
de la segunda etapa. Todavía no implementado; requiere la excepción en el WAF municipal (sección 4.3).

> El esquema completo y actualizado es `ARCA_database_schema.dbml`. El archivo del Drive
> `ARQUITECTURA_ARCA_PWA.md` está **desactualizado** (referencia PostgreSQL, Redis, Express y una tabla
> `usuarios` única en vez del par ciudadano/administrador) — no usarlo como fuente.

---

## 9. Mapa de archivos del proyecto

```
/
├── AGENTS.md                    ← Reglas de IA: comportamiento del agente + política de uso del equipo
│                                   (lo cargan solas Claude Code / Cursor / Copilot)
├── CLAUDE.md                    ← Guía de setup colaborativo (Git Flow, ramas, convenciones)
├── CLAUDE_proyecto.md           ← Este archivo (contexto de proyecto para Claude Code)
├── README.md                    ← Fuente de verdad principal (stack, arquitectura, backlog)
├── ARCA_database_schema.dbml    ← Esquema BD en DBML (22 tablas, identidad ciudadano/admin)
├── ARQUITECTURA_ARCA_PWA.md     ← Documento Word (.docx) con esquema BD + endpoints
│                                   ⚠️ Es un .docx con extensión .md · Stack desactualizado:
│                                   usar README.md + ARCA_database_schema.dbml como verdad
├── UI_KIT_ARCA.md               ← Sistema de diseño (colores, tipografía, componentes)
│                                   ⚠️ Referenciado pero aún no presente en el repo (ver Drive)
├── docker-compose.yml           ← MySQL 8 local para desarrollo
├── setup.ps1                    ← Automatiza setup local completo (deps, .env.local, Docker, migraciones, arranque de los 4 proyectos)
├── package.json                 ← npm workspaces: packages/arca-core + apps/backend + apps/backend-admin
│                                   (los frontends NO son workspaces, npm install independiente en cada uno)
├── packages/
│   └── arca-core/               ← @arca/core: entidades TypeORM + AuthModule que ambos backends importan
│       ├── README.md            ← Qué vive acá y la regla de PR revisado para tocarlo
│       └── src/
│           ├── entities/        ← usuarios, sesiones, catálogo, solicitudes-retiro (fuente única, ex apps/backend)
│           └── auth/            ← AuthGuard, RolesGuard, ClaveÚnica, decorators (ex apps/backend/src/auth)
├── docs/
│   ├── SETUP_LOCAL.md           ← Guía paso a paso de entorno local (Docker, workspaces, backends, frontends, scripts)
│   ├── BACKEND_FASE1.md         ← Resumen de implementación backend ciudadano Fase 1 (EP-02)
│   ├── FRONTEND_FASE1.md        ← Resumen de implementación frontend ciudadano Fase 1 (EP-02)
│   └── PLAN_FRONTEND.md         ← Roadmap del frontend por fases + deuda técnica (documento vivo)
└── apps/
    ├── backend/                 ← API ciudadana — NestJS + TypeORM (residuos, solicitudes-retiro), rutas bajo /api
    │   ├── README.md            ← Guía de la API: scripts, entorno, endpoints, migraciones
    │   └── src/database/migrations/  ← único dueño del esquema; incluye precio real del catalogo (26 items)
    ├── backend-admin/           ← API del panel municipal — NestJS, misma base de datos, sin migraciones propias
    │   ├── README.md            ← Guía de la API del panel: scripts, entorno, endpoints
    │   └── src/
    │       ├── identity/        ← resolución de identidad propia (duplicado declarado de UsersService)
    │       └── solicitudes/     ← GET/PATCH /api/admin/solicitudes (listado sin filtro por dueño)
    ├── frontend/                ← React 19 + Vite 8 + TS + Tailwind (PWA, flujo ciudadano EP-02)
    │   ├── README.md            ← Guía de la PWA: scripts, estructura de src/, convenciones
    │   └── src/
    │       ├── components/ui/   ← primitivos reutilizables entre modulos (IconBadge, EstadoPill, etc.)
    │       ├── features/solicitud-retiro/  ← modulo propio del flujo "Solicitar retiro"
    │       └── pages/           ← pantallas que son islas independientes (Inicio, MisSolicitudes, ...)
    └── admin-web/                ← Panel municipal — React 19 + Vite 8 + Tailwind, propio (:5174)
        ├── README.md            ← Guía del panel: scripts, estructura de src/, deuda declarada
        └── src/
            ├── components/ui/   ← copia de los 6 átomos que usa (fuente de verdad: apps/frontend)
            ├── components/AdminShell.tsx  ← layout de escritorio (sidebar), reemplaza el header por pantalla
            └── pages/           ← Solicitudes.tsx, Auditoria.tsx
```

---

## 10. UI Kit — referencia rápida

Definido en `UI_KIT_ARCA.md`. Puntos clave:

- **Fuente:** Inter (400 / 500 / 600 / 700)
- **Stack de estilos:** React 19 + Tailwind CSS 3.4. `lucide-react` (íconos) y `recharts`
  (gráficos del panel municipal) están **previstos pero todavía no instalados**
- **Color primario:** `#1A3D2B` (Verde Oscuro) · acento: `#52B788` (Verde Claro)
- **Regla 60·30·10:** 60% fondo blanco · 30% verde oscuro · 10% verde claro
- **Íconos:** lucide-react, `strokeWidth={1.5}`
- **Bordes:** `rounded-xl` (botones/inputs) · `rounded-2xl` (cards) · `rounded-3xl` (modales)
- **Grid móvil:** padding lateral 16px · header fijo 56px · bottom nav 64px · FAB sobresale 15px
- **Grid desktop (panel municipal):** sidebar fijo 192px

---

## 11. Usuarios del sistema

| Persona | Tipo | Dispositivo principal |
|---|---|---|
| **Carmen González** (45 años, Santo Domingo, dueña de hogar) | Vecina / Ciudadana | Móvil (Android) |
| **Carlos Álvarez** (36 años, funcionario TI municipal) | Administrador municipal | Computador de escritorio (navegador) |

---

## 12. Reglas de comportamiento para IA

> **Movidas a [`AGENTS.md`](AGENTS.md)** (raíz del repo). Ese archivo es ahora la **única
> fuente de verdad** de las reglas, para que no queden dos copias que se contradigan.
> Herramientas como Claude Code, Cursor y Copilot lo detectan y lo cargan solas.

Resumen de lo que contiene:

| Parte | Contenido |
|---|---|
| **A — Reglas para el agente de IA** | No inventar · Verificar antes de responder · No actuar sin pedido explícito · Alcance acotado · Respetar decisiones tomadas · Idioma · **Una sola área por sesión** · **Ramas `fecha-persona-descripcion`** · **Confirmar antes de commitear** · **Cerrar la sesión con la documentación al día** · Convenciones de código · Qué no tocar nunca |
| **B — Política de uso para el equipo** | Responsabilidad de quien commitea · No compartir datos sensibles · Verificar lo que la IA afirme · Qué delegar y qué no · Transparencia en commits |

Tres reglas que conviene tener presentes porque cambian cómo se trabaja:

- **A.7 — Una sola área por sesión.** Se define al empezar (backend, frontend, BD, DevOps, docs)
  y el trabajo no sale de ahí. Si hace falta tocar otra área, se para, se avisa y se resuelve
  con un **PR aparte**, para que el resto del equipo pueda seguir avanzando en paralelo.
- **A.8 — Ramas `fecha-persona-descripcion`** (ej: `2026-08-17-miguel-doc-permisos-equipo`).
  No se crea la rama sin esos tres datos.
- **A.9 — Confirmar antes de commitear.** Nada llega a `develop` ni a `master` sin visto bueno
  explícito, y la autorización es por vez.

---

## 13. Estado actual del proyecto

- **Fase:** Inicio de implementación — Fase 1 (MVP).
- **Código:** ya existe (monorepo `apps/`). Lo construido a la fecha:
  - **Backend (`apps/backend`)** — NestJS + TypeORM sobre MySQL. Implementa **EP-02**:
    catálogo de residuos y solicitudes de retiro. 6 de 22 tablas migradas (4 de identidad
    + `residuos_catalogo` + `solicitudes_retiro`). Endpoints bajo prefijo global **`/api`**
    (`app.setGlobalPrefix('api')`): `GET /api/health`, `GET /api/residuos/catalogo`,
    `POST`/`GET /api/solicitudes-retiro` (+ `:id`, `:id/cancelar`),
    `GET /api/usuarios/:id/perfil-acceso`. CORS habilitado (orígenes separados por coma en
    `FRONTEND_URL`). `ResiduoCatalogo` tiene **precio real** (CLP): el catálogo son los
    26 ítems de `costo retiro Voluminosos.xlsx` (municipalidad), no valores referenciales.
    Detalle en `docs/BACKEND_FASE1.md`.
  - **Frontend (`apps/frontend`)** — React 19 + Vite 8 + TS + Tailwind + React Router.
    Flujo ciudadano EP-02 (catálogo → nueva solicitud → mis solicitudes) con **login
    temporal** (usuario dev) a la espera de auth real. El precio se muestra real (viene
    del backend), ya no se estima por categoría. UI componentizada en `components/ui/`
    (`IconBadge`, `EstadoPill`, `ListItemCard`, `ScreenHeader`, `EmptyState`, `BackButton`,
    `PriceTag` — reutilizados entre Catálogo, Mis solicitudes e Inicio) y el flujo
    "Solicitar retiro" modularizado en `features/solicitud-retiro/` (pantallas + estado
    compartido + sus propias rutas, separado de `App.tsx`). Detalle en
    `docs/FRONTEND_FASE1.md`.
  - **Panel admin (`apps/admin-web` + `apps/backend-admin`)** — separado del frontend/backend
    ciudadano en la migración de 2026-09-01. Copia de los mismos 6 átomos de UI, capa de API
    propia, sin login/guard de sesión todavía (deuda declarada). Detalle en los README de
    ambos proyectos.
  - **Infra local** — `docker-compose.yml` (MySQL 8) + `docs/SETUP_LOCAL.md`.
  - **Automatización local** — `setup.ps1` instala todo (workspaces del núcleo compartido y
    los dos backends, `npm install` propio en cada frontend) y levanta los cuatro proyectos.
    El frontend ciudadano usa `VITE_API_URL=/api` (ruta relativa) y Vite proxea `/api` a su
    backend; el panel admin hace lo mismo contra el suyo, en el puerto 3001. Detalle en
    `docs/SETUP_LOCAL.md`.
- **Autenticación:** diferida. Hoy se usa un usuario dev sembrado por migración
  (`00000000-0000-4000-8000-000000000001`); el frontend lo maneja con un login temporal.
  ClaveÚnica + JWT (EP-01, Benjamín) se integrará más adelante sin reestructurar.
- **Documentos producidos:**
  - `README.md` (consolidado, decisiones finales)
  - `ARCA_database_schema.dbml` (esquema BD vigente, 22 tablas)
  - `ARQUITECTURA_ARCA_PWA.md` (.docx, esquema + endpoints — stack desactualizado)
  - `UI_KIT_ARCA.md` v1.0 (sistema de diseño)
  - `docs/{SETUP_LOCAL,BACKEND_FASE1,FRONTEND_FASE1,PLAN_FRONTEND}.md`
  - `apps/backend/README.md` y `apps/frontend/README.md` (guías por app; antes eran el
    boilerplate de NestJS y Vite)
  - `AGENTS.md` (reglas de IA: comportamiento del agente + política de uso del equipo)
- **Pendiente:** resto de migraciones del DBML (marketplace, credits, dashboard, etc.),
  auth real, y confirmación de acceso SSH al servidor municipal para despliegue.
- **Escalado futuro (post-MVP):** Redis (caché + adaptador Socket.io multi-proceso), modelo TensorFlow.js personalizado entrenado con datos reales de la municipalidad, Sentry para monitoreo.

---

## 14. Marco normativo

- Estrategia Nacional de Residuos 2025 (Chile)
- Ley REP — Responsabilidad Extendida del Productor
- Ley Orgánica de Municipalidades
- Ley de Protección de la Vida Privada

---

*COM Tech · Feria de Software 2026 · Última actualización: Junio 2026*
