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

1. **Archivos en este repositorio** (ver sección 9 para mapa de archivos)
2. **Google Drive** — carpeta "Feria de Software" (`ID: 1hv_QMx2JeU7U8-Oa183bygpkUHbd_xOI`), subcarpeta "Hito 3" (`ID: 1TW-G_GZgn8NIJtg7Hdhb5DeOWjflh-QM`)
3. **GitHub público** — `https://github.com/blindjamin/A.R.C.A` (18 issues: 5 épicas + 14 HUs, sin código aún)

> **Si algo no está en estas fuentes, decirlo claramente. Nunca inventar datos, métricas, costos ni decisiones técnicas.**

---

## 4. Stack técnico CONFIRMADO

Todas las decisiones aquí registradas son **definitivas** y surgieron de restricciones reales del entorno municipal. No proponer alternativas salvo que Benjamín lo solicite explícitamente.

### 4.1 Frontend (PWA)

| Tecnología | Uso |
|---|---|
| React 18 + Redux Toolkit | UI y manejo de estado global |
| Tailwind CSS v4 | Estilos (tokens en `globals.css`) |
| Workbox | Service Worker / modo offline |
| Leaflet + OpenStreetMap | Mapas y geolocalización (sin costo, sin API key) |
| Socket.io-client | Chat y notificaciones en tiempo real |
| TensorFlow.js | Clasificación de residuos **en el navegador del usuario** (cliente) |

### 4.2 Backend

| Tecnología | Uso |
|---|---|
| NestJS + TypeScript (Node.js 18+) | Servidor y API REST — arquitectura modular |
| MySQL / MariaDB | Base de datos principal (19 tablas) |
| phpMyAdmin | Administración de BD (proporcionado por municipio) |
| Socket.io (NestJS Gateways) | Chat y notificaciones en tiempo real |
| JWT + ClaveÚnica OAuth2 | Autenticación — **no hay contraseñas locales** |
| Winston | Logs |
| Jest + Supertest | Tests |

### 4.3 DevOps / Infraestructura

| Tecnología | Uso |
|---|---|
| Servidores municipales (cPanel + SSH) | Hosting — provistos por la Municipalidad de Santo Domingo |
| GitHub Actions | CI (lint / test / build) + deploy vía SSH |
| PM2 o systemctl | Gestión del proceso Node.js en el servidor |
| Git | Control de versiones |

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
NestJS sobre Node.js 18+ provee estructura modular nativa (módulos, controllers, services, guards, gateways). Facilita mantenimiento y tests. Node.js viene preinstalado en el servidor municipal.

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

### Épicas (orden de roadmap, no numérico)

| Fase | ID | Épica | HUs |
|---|---|---|---|
| 1 — MVP | EP-05 | Seguridad, Autenticación y Trazabilidad | HU-12, HU-13, HU-14 |
| 1 — MVP | EP-01 | Interfaz Ciudadana + Clasificación por IA | HU-01, HU-02, HU-03 |
| 2 — Core | EP-02 | Marketplace P2P de Reutilización | HU-04, HU-05, HU-06 |
| 2 — Core | EP-04 | Sistema de Incentivos "Circular Credits" | HU-10, HU-11 |
| 2 — Core | EP-03 | Dashboard Administrativo Municipal | HU-07, HU-08, HU-09 |

> El orden EP-05 → EP-01 → EP-02 → EP-04 → EP-03 es el roadmap real. EP-03 va último aunque numéricamente sea 3.

### Resumen de Historias de Usuario

| ID | Épica | Descripción resumida | Prioridad | Asignado |
|---|---|---|---|---|
| HU-01 | EP-01 | Registrar residuo con foto desde móvil | Highest | Front + Back |
| HU-02 | EP-01 | Clasificación automática por IA (sugerencia) | High | Back |
| HU-03 | EP-01 | Seguir estado de solicitud de retiro | High | Front |
| HU-04 | EP-02 | Publicar artículo en marketplace P2P | High | Front + Back |
| HU-05 | EP-02 | Buscar y filtrar artículos en marketplace | Medium | Front |
| HU-06 | EP-02 | Contactar publicador para coordinar retiro | Medium | Back + UX |
| HU-07 | EP-03 | Dashboard de solicitudes de retiro (admin) | High | Front + Back |
| HU-08 | EP-03 | Programar y asignar retiros a operadores | Medium | Back |
| HU-09 | EP-03 | Generar reporte de gestión (PDF/CSV) | Low | Back |
| HU-10 | EP-04 | Otorgar Circular Credits por entrega en marketplace | Low | Back |
| HU-11 | EP-04 | Consultar saldo e historial de Circular Credits | Low | Front + UX |
| HU-12 | EP-05 | Iniciar sesión con ClaveÚnica | Highest | Front + Back |
| HU-13 | EP-05 | Control de acceso por roles | High | Back |
| HU-14 | EP-05 | Registro auditable de acciones críticas | Medium | Back + QA |

---

## 8. Base de datos — resumen

**19 tablas** en MySQL/MariaDB:

`usuarios` · `residuos_catalogo` · `solicitudes_retiro` · `articulos_marketplace` · `mensajes_marketplace` · `transacciones_circular_credits` · `auditoria` · `notificaciones` · `ratings` · `impacto_ambiental` · `foto_retiro` · `denuncias` · `referidos` · `horarios_retiro` · `feedback_retiro` · `faq_articulos` · `conversaciones_chatbot` · `social_shares` · `preferencias_usuario`

**35+ endpoints REST** agrupados en: auth, solicitudes-retiro, marketplace, dashboard, circular-credits, notificaciones, ratings, denuncias, referidos, horarios, feedback, faq, chatbot, social, preferencias.

**WebSocket:** `/ws/marketplace/articulos/{id}/chat` para chat en tiempo real del marketplace.

> El esquema completo está en `ARQUITECTURA_ARCA_PWA.md`. Notar que ese archivo aún referencia PostgreSQL y otras tecnologías descartadas — la fuente de verdad actualizada es `README.md` y este archivo.

---

## 9. Mapa de archivos del proyecto

```
/
├── CLAUDE.md                    ← Guía de setup colaborativo (Git Flow, ramas, convenciones)
├── CLAUDE_proyecto.md           ← Este archivo (contexto de proyecto para Claude Code)
├── README.md                    ← Fuente de verdad principal (stack, arquitectura, backlog)
├── ARCA_database_schema.dbml    ← Esquema BD en DBML (19 tablas, identidad ciudadano/admin)
├── ARQUITECTURA_ARCA_PWA.md     ← Documento Word (.docx) con esquema BD + endpoints
│                                   ⚠️ Es un .docx con extensión .md · Stack desactualizado:
│                                   usar README.md + ARCA_database_schema.dbml como verdad
├── UI_KIT_ARCA.md               ← Sistema de diseño (colores, tipografía, componentes)
│                                   ⚠️ Referenciado pero aún no presente en el repo (ver Drive)
├── docker-compose.yml           ← MySQL 8 local para desarrollo
├── docs/
│   ├── SETUP_LOCAL.md           ← Guía paso a paso de entorno local (Docker, backend, frontend)
│   ├── BACKEND_FASE1.md         ← Resumen de implementación backend Fase 1 (EP-01)
│   └── FRONTEND_FASE1.md        ← Resumen de implementación frontend Fase 1 (EP-01)
└── apps/
    ├── backend/                 ← NestJS + TypeORM (identidad, residuos, solicitudes-retiro)
    └── frontend/                ← React 18 + Vite + TS + Tailwind (PWA, flujo ciudadano EP-01)
```

---

## 10. UI Kit — referencia rápida

Definido en `UI_KIT_ARCA.md`. Puntos clave:

- **Fuente:** Inter (400 / 500 / 600 / 700)
- **Stack de estilos:** React 18 + Tailwind CSS v4 + lucide-react + recharts
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

## 12. Reglas de comportamiento para Claude Code

Estas reglas son **obligatorias** en toda sesión:

### 12.1 NO INVENTAR
Nunca generar datos, métricas, costos, nombres, decisiones técnicas ni información del proyecto que no esté en las fuentes de verdad. Si algo no está documentado, decirlo claramente y preguntar antes de asumir.

### 12.2 NO ACTUAR SIN PEDIDO EXPLÍCITO
No escribir código, crear archivos, modificar issues de GitHub, tocar el Drive ni ejecutar ninguna acción técnica a menos que Benjamín lo solicite explícitamente en ese mensaje. Ante la duda, preguntar antes de hacer.

### 12.3 VERIFICAR SIEMPRE
Antes de responder sobre épicas, HUs, arquitectura, roles o cualquier dato del proyecto, consultar primero los archivos del proyecto. No responder de memoria si hay documentación disponible.

### 12.4 ALCANCE ACOTADO
Hacer solo exactamente lo que se pide. No agregar funcionalidades no solicitadas, no proponer cambios no pedidos al backlog o arquitectura, no tomar decisiones por el equipo. Si el pedido es ambiguo, preguntar antes de proceder.

### 12.5 RESPETAR LAS DECISIONES YA TOMADAS
Las decisiones de stack documentadas en la sección 5 son definitivas y tienen contexto de negocio. No sugerir revertirlas (ej: volver a PostgreSQL, añadir Docker, usar Cloud Vision) salvo que Benjamín abra explícitamente esa discusión.

### 12.6 IDIOMA
Las respuestas y comentarios en código se escriben en **español**, salvo que Benjamín indique lo contrario.

---

## 13. Estado actual del proyecto

- **Fase:** Inicio de implementación — Fase 1 (MVP).
- **Código:** ya existe (monorepo `apps/`). Lo construido a la fecha:
  - **Backend (`apps/backend`)** — NestJS + TypeORM sobre MySQL. Implementa **EP-01**:
    catálogo de residuos y solicitudes de retiro. 6 de 19 tablas migradas (4 de identidad
    + `residuos_catalogo` + `solicitudes_retiro`). Endpoints: `GET /health`,
    `GET /residuos/catalogo`, `POST` y `GET /solicitudes-retiro`. CORS habilitado.
    Detalle en `docs/BACKEND_FASE1.md`.
  - **Frontend (`apps/frontend`)** — React 18 + Vite + TS + Tailwind + React Router.
    Flujo ciudadano EP-01 (catálogo → nueva solicitud → mis solicitudes) con **login
    temporal** (usuario dev) a la espera de auth real. Detalle en `docs/FRONTEND_FASE1.md`.
  - **Infra local** — `docker-compose.yml` (MySQL 8) + `docs/SETUP_LOCAL.md`.
- **Autenticación:** diferida. Hoy se usa un usuario dev sembrado por migración
  (`00000000-0000-4000-8000-000000000001`); el frontend lo maneja con un login temporal.
  ClaveÚnica + JWT (EP-05, Benjamín) se integrará más adelante sin reestructurar.
- **Documentos producidos:**
  - `README.md` (consolidado, decisiones finales)
  - `ARCA_database_schema.dbml` (esquema BD vigente, 19 tablas)
  - `ARQUITECTURA_ARCA_PWA.md` (.docx, esquema + endpoints — stack desactualizado)
  - `UI_KIT_ARCA.md` v1.0 (sistema de diseño)
  - `docs/{SETUP_LOCAL,BACKEND_FASE1,FRONTEND_FASE1}.md`
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
