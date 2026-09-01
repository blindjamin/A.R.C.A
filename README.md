# 🌿 A.R.C.A.
### Administración de Residuos y Colaboración Automatizada

> PWA desarrollada por el equipo **COM Tech** para la **Ilustre Municipalidad de Santo Domingo, Chile.**  
> Transforma la gestión de residuos voluminosos priorizando la circularidad antes de que el residuo llegue al vertedero.

---

## 📋 Índice

- [¿Qué es ARCA?](#-qué-es-arca)
- [Diagnóstico del problema](#-diagnóstico-del-problema)
- [Módulos funcionales](#-módulos-funcionales)
- [Stack técnico](#-stack-técnico)
- [Inicio rápido (desarrollo local)](#-inicio-rápido-desarrollo-local)
- [Estructura del repositorio](#-estructura-del-repositorio)
- [Estado actual de implementación](#-estado-actual-de-implementación)
- [Documentación](#-documentación)
- [Despliegue](#-despliegue)
- [Backlog](#-backlog)
- [Equipo](#-equipo)
- [Marco normativo](#-marco-normativo)

---

## 🌱 ¿Qué es ARCA?

ARCA es una **Progressive Web App (PWA)** que digitaliza y optimiza la gestión de residuos voluminosos en la comuna de Santo Domingo, conectando a vecinos y funcionarios municipales en una misma plataforma.

La plataforma prioriza la **economía circular**: antes de que un objeto sea retirado como desecho, ARCA le da la oportunidad de ser reutilizado entre vecinos a través de un marketplace P2P.

---

## 🔍 Diagnóstico del problema

| Problema | Descripción |
|---|---|
| 💸 **Ineficiencia financiera** | Costo actual de gestión: **$64.849 por tonelada**. La reutilización reduce directamente este costo. |
| 📊 **Brecha tecnológica** | Dependencia de planillas Excel y solicitudes desordenadas por teléfono/correo. |
| 🗺️ **Falta de trazabilidad** | Sin datos estructurados, los funcionarios planifican rutas y operaciones a ciegas. |

---

## ⚙️ Módulos funcionales

> Se listan en **orden de roadmap**, no numérico.

### EP-01 — Fundación y Seguridad
Base de toda la plataforma. Integración con **ClaveÚnica** (OAuth2 estatal) como único método de autenticación. Control de acceso por roles (vecino, administrador, operador, patrocinador) y registro auditable de todas las acciones críticas. Incluye el primer flujo ciudadano —registrar un residuo con foto— y la gestión que la persona hace de su propia cuenta: editar perfil y eliminar cuenta.

### EP-02 — Interfaz Ciudadana
Completa la experiencia del vecino. La clasificación por IA se ejecuta localmente en el navegador con **TensorFlow.js**, funcionando como **apoyo y no como decisión final**: el usuario siempre confirma o corrige la categoría sugerida, y puede clasificar manualmente desde el catálogo cuando la IA no detecta el residuo. Suma el seguimiento de la solicitud, las notificaciones de cambio de estado, el feedback post-retiro y una FAQ por categoría.

### EP-03 — Marketplace e Incentivos
Espacio para que vecinos publiquen e intercambien artículos antes de que sean retirados por el municipio. Incluye chat en tiempo real (WebSocket) y trazabilidad de entregas. Absorbe el sistema de incentivos **Circular Credits**: los créditos se otorgan al confirmar la entrega y son consultables con historial desde el perfil, junto con las estadísticas de CO₂ ahorrado y el ranking de impacto.

### EP-04 — Dashboard Administrativo Municipal
Panel para funcionarios con métricas en tiempo real, mapa georreferenciado de solicitudes, asignación de retiros a operadores y reportes exportables en PDF/CSV. Incorpora el ciclo operativo del retiro: marcar «en ruta», subir la foto del retiro con GPS y marcar «retirado».

### EP-06 — Confianza y Comunidad
Garantiza la confianza entre vecinos en el intercambio P2P: reputación mediante calificaciones, denuncia de incumplimientos y moderación municipal con bloqueo de usuarios.

### EP-05 — Seguridad, Autenticación y Trazabilidad · cerrada
Épica **cerrada**. Sus historias (HU-12, HU-13 y HU-14) se integraron en **EP-01**, porque la autenticación, el control de acceso y la auditoría son la base sobre la que se levanta todo lo demás. Se conserva cerrada en el tablero para no romper la trazabilidad del historial.

---

## 🛠️ Stack técnico

> Las tablas de abajo distinguen lo que **ya está instalado** en el proyecto de lo que está
> **previsto** para la siguiente etapa. Las versiones son las declaradas en los `package.json` y las
> mismas que se comprometieron al municipio en el listado de requerimientos del servidor
> (14-08-2026).

### Frontend (PWA)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=flat&logo=typescript&logoColor=white)

**Instalado** — 3 dependencias de producción, 15 de desarrollo:

| Tecnología | Versión | Uso |
|---|---|---|
| React + React DOM | 19.2.6 | UI |
| React Router DOM | 7.18.0 | Navegación entre pantallas |
| Vite | 8 | Compilador y servidor de desarrollo |
| Tailwind CSS (+ PostCSS, Autoprefixer) | 3.4 | Estilos y tokens de diseño |
| TypeScript | 6.0 | Tipado |
| ESLint | 10.3 | Linting |

**Previsto para la segunda etapa** — todavía no instalado:

| Tecnología | Uso previsto |
|---|---|
| Redux Toolkit | Manejo de estado global, cuando el estado local deje de alcanzar |
| TensorFlow.js | Clasificación de residuos **en el navegador** (cliente), como apoyo al usuario |
| Leaflet + OpenStreetMap | Mapas y geolocalización — sin costo ni API key |
| Socket.io-client | Chat y notificaciones en tiempo real |
| Workbox | Service Worker / modo offline |

### Backend
![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=flat&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_5.7-3178C6?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_24.18-339933?style=flat&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8_/_MariaDB-4479A1?style=flat&logo=mysql&logoColor=white)

**Instalado** — 12 dependencias de producción, 23 de desarrollo:

| Tecnología | Versión | Uso |
|---|---|---|
| NestJS (`common`, `core`, `platform-express`) | 11.0.1 | Servidor y API REST con estructura modular |
| `@nestjs/config` + `dotenv` | 4.0.4 / 16.6 | Configuración por ambiente |
| `@nestjs/typeorm` + TypeORM | 11.0.2 / 1.0 | ORM y migraciones versionadas del esquema |
| `mysql2` | 3.22.5 | Conector MySQL / MariaDB |
| `class-validator` + `class-transformer` | 0.15 / 0.5 | Validación y transformación de DTOs |
| Jest + Supertest | 30 / 7 | Tests |
| TypeScript · ESLint · Prettier | 5.7 · 9.18 · 3.4 | Tipado, linting y formato |

**Previsto para la segunda etapa** — todavía no instalado:

| Tecnología | Uso previsto |
|---|---|
| `@nestjs/jwt` + ClaveÚnica OAuth2 | Autenticación — **no habrá contraseñas locales** |
| Socket.io (Gateways de NestJS) | Chat y notificaciones en tiempo real |
| Winston | Logs estructurados |

> **Runtime:** Node.js **24.18.0** (línea 24.x LTS) — mínimo aceptable **22.12.0**, que es lo que
> exige Vite 8. npm 11.x viene incluido. Es la versión solicitada al municipio para el servidor y la
> que usa el equipo en desarrollo.

> **Superficie actual de la API:** 9 endpoints REST bajo el prefijo `/api` (health, catálogo de
> residuos, CRUD de solicitudes de retiro y perfil de acceso). Las **6 tablas** de esta primera etapa
> se crean solas con las migraciones; el esquema completo en `ARCA_database_schema.dbml` contempla
> **22 tablas** para las etapas siguientes, todas dentro de la misma base.

> **Almacenamiento de imágenes:** las fotos se guardan como **archivos en un directorio protegido** del servidor (fuera del directorio público) y se sirven a través de la API con autenticación; en la base de datos solo se almacena la ruta. Esto resguarda los datos personales y de ubicación de los usuarios.

> **Principio de estructura:** arquitectura modular de NestJS — controladores delgados que delegan la lógica de negocio a *services* independientes. Cuando entren la autenticación y el tiempo real se sumarán *Guards* para el control de acceso por roles y *Gateways* para WebSocket, sin reestructurar lo existente. Facilita el mantenimiento y los tests.

### DevOps
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white)
![cPanel](https://img.shields.io/badge/cPanel-FF6C2C?style=flat&logo=cpanel&logoColor=white)

| Tecnología | Uso |
|---|---|
| Servidores de la Municipalidad de Santo Domingo (cPanel + SSH) | Hosting y despliegue |
| PM2 o systemd | Mantiene vivo el proceso Node y lo reinicia ante caídas — si el servidor usa cPanel «Setup Node.js App», esa función ya lo cubre |
| Docker Compose | MySQL 8 **solo en desarrollo local**. No se instala en el servidor municipal |
| GitHub Actions | CI (lint / test / build) y despliegue vía SSH — **planificado**, aún sin workflows en el repo |
| Git | Control de versiones |

> **Mejoras futuras de escalado:** Redis (caché y adaptador de Socket.io para múltiples procesos) y monitoreo con Sentry quedan planteados como mejora futura. El MVP corre en **un solo proceso** de Node (150–300 MB de RAM), con autenticación *stateless* vía JWT.

---

## ▶️ Inicio rápido (desarrollo local)

**Windows / PowerShell — automatizado.** Requiere Git, **Node.js 24.18.0** (mínimo 22.12.0) y Docker Desktop corriendo:

```powershell
git clone https://github.com/blindjamin/A.R.C.A.git
cd A.R.C.A
git checkout develop
.\setup.ps1
```

`setup.ps1` verifica prerrequisitos, levanta MySQL en Docker, instala dependencias (workspaces
para el núcleo compartido y los dos backends; `npm install` propio para cada frontend), crea los
`.env.local`, corre las migraciones y abre los cuatro proyectos en ventanas separadas.

| Servicio | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Panel admin (Vite) | http://localhost:5174 |
| Backend ciudadano (NestJS) | http://localhost:3000/api |
| Backend admin (NestJS) | http://localhost:3001/api |
| MySQL (Docker) | `localhost:3306` · base `arca_dev` |

El panel admin se usa **en local**: no hay túnel público para él. Lo que se demuestra a la
municipalidad es la PWA ciudadana.

> Setup manual paso a paso, otros sistemas operativos y problemas frecuentes:
> [`docs/SETUP_LOCAL.md`](docs/SETUP_LOCAL.md)

---

## 📂 Estructura del repositorio

```
A.R.C.A/
├── package.json                 # npm workspaces: packages/arca-core + apps/backend(-admin)
├── packages/
│   └── arca-core/                # Entidades TypeORM + AuthModule compartidos (@arca/core)
├── apps/
│   ├── backend/                  # API ciudadana — NestJS + TypeORM + MySQL
│   ├── backend-admin/             # API del panel municipal — misma base de datos
│   ├── frontend/                 # PWA ciudadana — React 19 + Vite 8 + Tailwind
│   └── admin-web/                 # Panel municipal — React 19 + Vite 8 + Tailwind
├── docs/                        # Documentación técnica del proyecto
├── ARCA_database_schema.dbml    # Schema de la base de datos (fuente de verdad)
├── docker-compose.yml           # MySQL 8 para desarrollo local
├── setup.ps1                    # Setup local automatizado (Windows)
├── AGENTS.md                    # Reglas de IA: comportamiento del agente + política del equipo
├── CLAUDE.md                    # Ramas, workflow del equipo y convenciones
└── CLAUDE_proyecto.md           # Contexto técnico completo del proyecto
```

---

## 📊 Estado actual de implementación

Fase 1 (MVP) en curso. Lo que ya corre end-to-end:

| Área | Estado |
|---|---|
| **Catálogo de residuos** | ✅ `GET /api/residuos/catalogo` con **precios reales** en base de datos |
| **Solicitud de retiro** | ✅ Crear, listar, ver detalle y cancelar — conectado al backend |
| **Panel municipal (EP-04 base)** | ✅ Listar, filtrar por estado, detalle y cambio de estado reversible |
| **Login diferido** | ✅ Gate por `perfil-acceso`: funcionario elige contexto, ciudadano va directo a la PWA |
| **Flujo "Solicitar con IA"** | 🟡 Esqueleto navegable — cámara y TensorFlow.js todavía mock |
| **UI Kit** | ✅ Primitivos en `components/ui/` + tokens de diseño en Tailwind |
| **Autenticación ClaveÚnica** | ⛔ Pendiente — hoy `SessionContext` es una identidad temporal |
| **Marketplace P2P (EP-03)** | ⛔ Pendiente — placeholders "Próximamente" |
| **Circular Credits (HU-10, HU-11 en EP-03)** | ⛔ Pendiente — la tarjeta de impacto del Inicio es estática |
| **Confianza y Comunidad (EP-06)** | ⛔ Pendiente — ratings, denuncias y moderación no iniciados |

Detalle por capa: [`docs/BACKEND_FASE1.md`](docs/BACKEND_FASE1.md) ·
[`docs/FRONTEND_FASE1.md`](docs/FRONTEND_FASE1.md) ·
roadmap por fases en [`docs/PLAN_FRONTEND.md`](docs/PLAN_FRONTEND.md)

---

## 📚 Documentación

| Documento | Para qué sirve |
|---|---|
| [`AGENTS.md`](AGENTS.md) | **Reglas de IA:** cómo debe comportarse el agente en el repo y cómo debe usar IA el equipo |
| [`CLAUDE.md`](CLAUDE.md) | Estructura de ramas, workflow de colaboración y convenciones de código |
| [`CLAUDE_proyecto.md`](CLAUDE_proyecto.md) | Contexto técnico completo: stack confirmado, decisiones de arquitectura y su porqué |
| [`docs/SETUP_LOCAL.md`](docs/SETUP_LOCAL.md) | Levantar el proyecto desde cero, por rol, y troubleshooting |
| [`docs/BACKEND_FASE1.md`](docs/BACKEND_FASE1.md) | Qué se implementó en el backend ciudadano: endpoints, entidades, migraciones |
| [`docs/FRONTEND_FASE1.md`](docs/FRONTEND_FASE1.md) | Qué se implementó en el frontend ciudadano: UI Kit, pantallas, capa de API |
| [`docs/PLAN_FRONTEND.md`](docs/PLAN_FRONTEND.md) | Roadmap del frontend por fases y deuda técnica |
| [`apps/backend/README.md`](apps/backend/README.md) | Guía de la API ciudadana: scripts, entorno, endpoints, migraciones |
| [`apps/backend-admin/README.md`](apps/backend-admin/README.md) | Guía de la API del panel: scripts, entorno, endpoints |
| [`apps/frontend/README.md`](apps/frontend/README.md) | Guía de la PWA: scripts, estructura de `src/`, convenciones |
| [`apps/admin-web/README.md`](apps/admin-web/README.md) | Guía del panel: scripts, estructura de `src/`, deuda declarada |
| [`packages/arca-core/README.md`](packages/arca-core/README.md) | Qué vive en el núcleo compartido y la regla de PR revisado para tocarlo |

---

## 🚀 Despliegue

La aplicación se aloja en la **infraestructura de la Municipalidad de Santo Domingo**:

- **Acceso:** el equipo trabaja sobre el servidor municipal mediante **SSH** y **cPanel**; el motor de base de datos se administra con **phpMyAdmin** (MySQL / MariaDB).
- **Topología:** PWA (React, archivos estáticos) servida por el servidor web → **API NestJS** como proceso Node en un puerto interno → **MySQL/MariaDB**, con las fotos en disco. El tráfico público entra por 443 (HTTPS) y el servidor web hace *proxy* inverso de `/api/` y `/socket.io/` hacia `127.0.0.1:3000`; la aplicación nunca recibe conexiones directas desde el exterior. La clasificación por IA (TensorFlow.js) ocurre en el dispositivo del usuario, antes de subir la solicitud.
- **Seguridad perimetral:** todo el dominio está detrás de un **WAF** municipal. Se coordina con el municipio una excepción para permitir las conexiones **WebSocket** (Socket.io) del chat y las notificaciones — no es urgente para la primera puesta en marcha, porque el tiempo real es de la segunda etapa.
- **Ambientes:** los entornos de desarrollo y producción conviven en la misma infraestructura municipal, con acceso acotado del equipo; la separación específica se coordina con el municipio.

### Requerimientos solicitados al municipio

Enviados al Departamento de Informática el **14 de agosto de 2026** (documento
*Preparación de ambiente en servidor municipal*, responsable técnico: Benjamín Paicil):

| # | Requerimiento | Valor solicitado |
|---|---|---|
| 1 | Runtime de Node.js | **24.18.0** (línea 24.x LTS) — mínimo 22.12.0 |
| 2 | Gestor de procesos | PM2 o acceso a systemd (cPanel «Setup Node.js App» ya lo cubre) |
| 3 | Base de datos | **`arca_db`**, creada vacía, usuario **`arca_user`**, `utf8mb4` / `utf8mb4_unicode_ci` |
| 4 | Puerto interno | **3000/TCP** en `127.0.0.1` (alternativa: 3010) |
| 5 | Regla en el WAF del dominio | Permitir WebSocket en `/socket.io/*` y `/ws/*` hacia el puerto interno |

La base se entrega **vacía**: la aplicación crea sus tablas, claves foráneas, índices y datos
iniciales con migraciones versionadas. El usuario necesita privilegios de definición de datos
(`SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES`) acotados solo a `arca_db`.
Si cPanel antepone el prefijo de la cuenta, los nombres finales serán del tipo `cuenta_arca_db`.

**No se requiere instalar librerías a mano**: están declaradas en los `package.json` y se instalan
solas en la carpeta de la aplicación durante el despliegue. Tampoco se requiere Docker ni Redis en el
servidor. Consumo estimado: un proceso Node, 150–300 MB de RAM y menos de 2 GB de almacenamiento
inicial para las fotografías.

---

## 📌 Backlog

Gestionado en **[GitHub Projects](https://github.com/users/blindjamin/projects/2)**.

**27 historias de usuario en 5 épicas activas**, según el refinamiento de agosto de 2026. La
numeración es la del tablero de GitHub: EP-05 está cerrada y EP-06 está por crearse.

| ID | Épica | HUs | Fase |
|---|---|---|---|
| EP-01 | Fundación y Seguridad | HU-12, HU-13, HU-14, HU-01, HU-37, HU-38 | 1 — MVP |
| EP-02 | Interfaz Ciudadana | HU-02, HU-03, HU-17, HU-23, HU-39 | 1 — MVP |
| EP-03 | Marketplace e Incentivos | HU-04, HU-05, HU-06, HU-10, HU-11, HU-19, HU-20 | 2 — Core |
| EP-04 | Dashboard Administrativo Municipal | HU-07, HU-08, HU-09, HU-31, HU-32, HU-33 | 2 — Core |
| EP-06 | Confianza y Comunidad | HU-15, HU-16, HU-18 | 3 — Polish |
| ~~EP-05~~ | ~~Seguridad, Autenticación y Trazabilidad~~ | **Cerrada** — HU-12, HU-13 y HU-14 pasaron a EP-01 | — |

<details>
<summary><strong>Historias fuera de alcance</strong> — 15 historias descartadas en el refinamiento</summary>

**En pausa, con respaldo en el esquema y recuperables más adelante:**

| ID | Historia | Motivo |
|---|---|---|
| HU-26 | Preferencias de notificaciones | Complementa a HU-23, que sí se incorpora |
| HU-27, HU-28, HU-29 | Referidos: generar código, registro con código, bonificación | Tabla `referidos` |
| HU-30 | Ver ruta asignada en mapa | Sin ella el operador trabaja desde un listado en vez de un mapa |

**Propuestas para eliminar:**

| ID | Historia | Motivo |
|---|---|---|
| HU-21 | Badges / hitos desbloqueables | Gamificación decorativa, no aporta al objetivo municipal |
| HU-22 | Compartir impacto en redes sociales | Si se elimina, sobra también la tabla `social_shares` |
| HU-34 | Tema oscuro | Mejora de comodidad, no aporta al objetivo del servicio |
| HU-35 | Cambiar idioma | Una aplicación de una comuna chilena no requiere multi-idioma |
| HU-36 | Configurar zona horaria | Todo el servicio opera en una sola comuna |
| HU-40 | Chatbot básico de búsqueda en FAQ | Es prácticamente otro producto; elimina además la superficie de inyección de prompts |
| HU-41 | Escalado del chatbot a un administrador | Tabla `conversaciones_chatbot` |
| HU-42 | Analítica de preguntas frecuentes | HU-39 se incorpora en versión estática, sin analítica |

**Números sin historia asociada:** HU-24 y HU-25 — borrar o renumerar.

> Consecuencia en el esquema: `social_shares`, `conversaciones_chatbot`, `referidos` y
> `preferencias_usuario` quedan sin ninguna historia que las use.

</details>

### Roadmap

```
Fase 1 — MVP        (sem. 1–4)   BD + API base + ClaveÚnica + PWA básica
Fase 2 — Core       (sem. 5–12)  Marketplace + Credits + Chat RT + Notificaciones + Dashboard
Fase 3 — Polish     (sem. 13–16) FAQ estática + Ratings + Denuncias + Moderación + Tests
Fase 4 — Producción (sem. 17+)   Deploy + HTTPS + Backups + Monitoreo + Launch
```

---

## 👥 Equipo

| Rol | Integrante |
|---|---|
| Scrum Master / Líder | Benjamín Paicil |
| Product Owner | Miguel Segovia |
| Front-End | Maximiliano López |
| Back-End | Javier Figueroa |
| UX/UI & QA Specialist | Ana Araya |

---

## ⚖️ Marco normativo

- Estrategia Nacional de Residuos 2025 (Chile)
- Ley REP — Responsabilidad Extendida del Productor
- Ley Orgánica de Municipalidades
- Ley de Protección de la Vida Privada

---

<p align="center">
  <strong>COM Tech</strong> · Feria de Software · 2026
</p>
