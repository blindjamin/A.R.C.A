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
Base de toda la plataforma. Integración con **ClaveÚnica** (OAuth2 estatal) como único método de autenticación. Control de acceso por roles (vecino, funcionario y administrador) y registro auditable de todas las acciones críticas. Incluye el primer flujo ciudadano —registrar un residuo con foto— y la gestión que la persona hace de su propia cuenta: editar perfil y eliminar cuenta.

### EP-02 — Interfaz Ciudadana
Completa la experiencia del vecino. La clasificación por IA se ejecuta localmente en el navegador con **TensorFlow.js**, funcionando como **apoyo y no como decisión final**: el usuario siempre confirma o corrige la categoría sugerida, y puede clasificar manualmente desde el catálogo cuando la IA no detecta el residuo. Suma el seguimiento de la solicitud, las notificaciones de cambio de estado, el feedback post-retiro y una FAQ por categoría.

### EP-03 — Marketplace e Incentivos
Espacio para que vecinos publiquen e intercambien artículos antes de que sean retirados por el municipio. Incluye chat en tiempo real (WebSocket) y trazabilidad de entregas. Absorbe el sistema de incentivos **Circular Credits**: los créditos se otorgan al confirmar la entrega y son consultables con historial desde el perfil, junto con las estadísticas de CO₂ ahorrado y el ranking de impacto.

### EP-04 — Dashboard Administrativo Municipal
Panel para funcionarios que actúan como **último filtro** de cada solicitud: revisan las fotos y los datos, y aprueban, piden una modificación o rechazan. Las solicitudes aprobadas se **derivan a la empresa operadora externa** en un Excel generado con un botón, y el resultado del retiro se registra después. Incluye métricas del ciclo, mapa por sector, pago maqueteado y reportes.

> ✅ **Replanteo del 2026-09-17: implementado en el núcleo, la base de datos y el panel.**
> La empresa que ejecuta los retiros es **externa** a la municipalidad: A.R.C.A. no asigna
> operadores; el funcionario **revisa, aprueba y deriva** las solicitudes. Rol `operador` → `funcionario`.
> Los retiros en terreno («en ruta», foto con GPS, rutas) quedan **fuera del alcance**.
> Backend ciudadano (§2) y estados en la PWA adaptados. Faltan las pantallas nuevas de la PWA (§5) y lo post-merge (§3).
> Detalle: [pendientes del equipo](docs/PENDIENTES_EQUIPO.md) ·
> [mapa del panel](docs/specs/MAPA_PANEL_MUNICIPAL.md)

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

> **Principio de estructura:** arquitectura modular de NestJS — controladores delgados que delegan la lógica de negocio a *services* independientes. El control de acceso por roles ya corre con *Guards*; cuando entre el tiempo real se sumarán *Gateways* para WebSocket, sin reestructurar lo existente. Facilita el mantenimiento y los tests.

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

> **Mejoras futuras de escalado:** Redis (caché y adaptador de Socket.io para múltiples procesos) y monitoreo con Sentry quedan planteados como mejora futura. El MVP corre en **un solo proceso** de Node (150–300 MB de RAM), con sesión guardada en la base de datos (cookie `arca_sesion`), sin estado en memoria.

---

## ▶️ Inicio rápido (desarrollo local)

**Windows / PowerShell — automatizado.** Requiere Git, **Node.js 24.18.0** (mínimo 22.12.0) y Docker Desktop corriendo:

```powershell
git clone https://github.com/blindjamin/A.R.C.A.git
cd A.R.C.A
git checkout develop
.\setup.ps1
```

`setup.ps1` verifica prerrequisitos, levanta MySQL en Docker, instala dependencias (`npm install`
en la raíz para el backend y otro propio para el frontend), crea los `.env.local`, corre las
migraciones y abre el backend y el frontend en ventanas separadas.

| Servicio | URL |
|---|---|
| Frontend — PWA ciudadana (Vite) | http://localhost:5173 |
| Panel municipal (mismo frontend) | http://localhost:5173/admin |
| Backend — API ciudadana y del panel (NestJS) | http://localhost:3000/api |
| MySQL (Docker) | `localhost:3306` · base `arca_dev` |

Para entrar en local sin ClaveÚnica, el backend necesita `ALLOW_DEV_LOGIN=true` en
`apps/backend/.env.local` (habilita los accesos de desarrollo; nunca en el servidor).
`setup.ps1` todavía no lo agrega solo.

> Setup manual paso a paso, otros sistemas operativos y problemas frecuentes:
> [`docs/SETUP_LOCAL.md`](docs/SETUP_LOCAL.md)

---

## 📂 Estructura del repositorio

```
A.R.C.A/
├── package.json                 # npm workspaces: apps/backend
├── apps/
│   ├── backend/                  # NestJS + TypeORM + MySQL — API ciudadana, panel (src/admin) y núcleo (src/core)
│   └── frontend/                 # React 19 + Vite 8 + Tailwind — PWA ciudadana y panel municipal (src/admin, /admin)
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
| **Panel municipal (EP-04)** | ✅ Revisión con checklist, motivos, toma y notas internas · derivación a la empresa en Excel · métricas · mapa de calor · auditoría ([mapa](docs/specs/MAPA_PANEL_MUNICIPAL.md)) |
| **Ciclo de solicitud nuevo** | 🟡 Núcleo, BD, panel, backend ciudadano y estados de la PWA listos · faltan pantallas nuevas de la PWA ([pendientes](docs/PENDIENTES_EQUIPO.md) §5) |
| **Login diferido** | ✅ Según el rol de la sesión (`GET /api/sesion`): funcionario o admin elige contexto, vecino va directo a la PWA |
| **Flujo "Solicitar con IA"** | 🟡 Esqueleto navegable — cámara y TensorFlow.js todavía mock |
| **UI Kit** | ✅ Primitivos en `components/ui/` + tokens de diseño en Tailwind |
| **Autenticación ClaveÚnica** | 🟡 Flujo OAuth2 y sesión con cookie implementados · falta probarlo con las credenciales del municipio; mientras tanto, accesos de desarrollo (`ALLOW_DEV_LOGIN`) |
| **Marketplace P2P (EP-03)** | 🟡 Backend: publicar con foto, buscar, detalle, retirar, "Lo quiero", entrega y calificación · la PWA tiene listado, detalle, publicar y mis publicaciones con datos de ejemplo, sin conectar al backend todavía ([spec](docs/specs/SPEC-marketplace.md)) |
| **Circular Credits (HU-10, HU-11 en EP-03)** | 🟡 Backend: créditos por entrega y por estrellas, con topes mensual y por pareja, y `GET /api/creditos` (valores de prueba) · falta la billetera en la PWA; la tarjeta de impacto del Inicio sigue estática |
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
| [`docs/DEPLOY_CPANEL.md`](docs/DEPLOY_CPANEL.md) | Despliegue en el servidor municipal (cPanel): paquetes, APIs, frontends y verificación |
| [`docs/BACKEND_FASE1.md`](docs/BACKEND_FASE1.md) | Qué se implementó en el backend ciudadano: endpoints, entidades, migraciones |
| [`docs/FRONTEND_FASE1.md`](docs/FRONTEND_FASE1.md) | Qué se implementó en el frontend ciudadano: UI Kit, pantallas, capa de API |
| [`docs/PLAN_FRONTEND.md`](docs/PLAN_FRONTEND.md) | Roadmap del frontend por fases y deuda técnica |
| [`docs/specs/MAPA_PANEL_MUNICIPAL.md`](docs/specs/MAPA_PANEL_MUNICIPAL.md) | Replanteo del panel municipal: módulos, decisiones y specs de cada uno |
| [`docs/specs/SPEC-marketplace.md`](docs/specs/SPEC-marketplace.md) | Backend del marketplace y Circular Credits (Sprint 3): tablas, estados, endpoints, reglas de créditos y plan de PRs |
| [`docs/PENDIENTES_EQUIPO.md`](docs/PENDIENTES_EQUIPO.md) | Qué falta revisar, arreglar e implementar del replanteo, por área |
| [`apps/backend/README.md`](apps/backend/README.md) | Guía de la API (ciudadana y del panel): scripts, entorno, autenticación, endpoints, migraciones |
| [`apps/frontend/README.md`](apps/frontend/README.md) | Guía de la PWA y del panel: scripts, estructura de `src/`, convenciones |
| [`docs/SEGURIDAD_ARQUITECTURA.md`](docs/SEGURIDAD_ARQUITECTURA.md) | Arquitectura de seguridad del sitio único: sesión, control de acceso, auditoría |

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

**27 historias de usuario vigentes en 5 épicas activas**: las del refinamiento de agosto de 2026,
más HU-43 y HU-44 del replanteo del panel, menos HU-31 y HU-32, que quedaron fuera de alcance. La
numeración es la del tablero de GitHub, donde cada épica e historia tiene su issue; EP-05 está cerrada.

| ID | Épica | HUs | Fase |
|---|---|---|---|
| EP-01 | Fundación y Seguridad | HU-12, HU-13, HU-14, HU-01, HU-37, HU-38 | 1 — MVP |
| EP-02 | Interfaz Ciudadana | HU-02, HU-03, HU-17, HU-23, HU-39 | 1 — MVP |
| EP-03 | Marketplace e Incentivos | HU-04, HU-05, HU-06, HU-10, HU-11, HU-19, HU-20 | 2 — Core |
| EP-04 | Dashboard Administrativo Municipal | HU-07, HU-08, HU-09, HU-33, HU-43, HU-44 · ~~HU-31, HU-32~~ | 2 — Core |
| EP-06 | Confianza y Comunidad | HU-15, HU-16, HU-18 | 3 — Polish |
| ~~EP-05~~ | ~~Seguridad, Autenticación y Trazabilidad~~ | **Cerrada** — HU-12, HU-13 y HU-14 pasaron a EP-01 | — |

<details>
<summary><strong>Historias fuera de alcance</strong> — 15 historias descartadas en el refinamiento</summary>

**En pausa, con respaldo en el esquema y recuperables más adelante:**

| ID | Historia | Motivo |
|---|---|---|
| HU-26 | Preferencias de notificaciones | Complementa a HU-23, que sí se incorpora |
| HU-27, HU-28, HU-29 | Referidos: generar código, registro con código, bonificación | Tabla `referidos` |
| HU-30 | Ver ruta asignada en mapa | Con el replanteo del 2026-09-17 las rutas las gestiona la empresa externa; el PO debe reclasificarla |

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
