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

### EP-01 — Interfaz Ciudadana + Clasificación por IA
Permite al ciudadano registrar un residuo voluminoso desde su móvil. La plataforma sugiere automáticamente la categoría usando **Google Cloud Vision API**, con soporte local vía **TensorFlow.js**. El usuario siempre confirma o corrige la clasificación.

### EP-02 — Marketplace P2P de Reutilización
Espacio para que vecinos publiquen e intercambien artículos antes de que sean retirados por el municipio. Incluye chat en tiempo real (WebSocket), sistema de ratings, trazabilidad de entregas y confirmación con foto + GPS.

### EP-03 — Dashboard de Business Intelligence Municipal
Panel para funcionarios con métricas en tiempo real, mapa de calor georreferenciado de solicitudes, asignación de retiros a operadores y reportes exportables en PDF/CSV.

### EP-04 — Sistema de Incentivos "Circular Credits"
Gamificación basada en acciones sostenibles. Los créditos se otorgan automáticamente al confirmar entregas en el marketplace y son consultables con historial desde el perfil del usuario.

### EP-05 — Seguridad, Autenticación y Trazabilidad
Integración con **ClaveÚnica** (OAuth2 estatal) como único método de autenticación. Control de acceso por roles y registro auditable de todas las acciones críticas del sistema.

---

## 🛠️ Stack técnico

### Frontend (PWA)
![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=flat&logo=redux&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat&logo=leaflet&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)

| Tecnología | Uso |
|---|---|
| React 18 + Redux Toolkit | UI y manejo de estado |
| Tailwind CSS | Estilos |
| Workbox | Service Worker / modo offline |
| Leaflet + OpenStreetMap | Mapas y geolocalización |
| Socket.io-client | Chat y notificaciones en tiempo real |
| TensorFlow.js | Clasificación local de residuos |

### Backend
![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_14+-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=json-web-tokens&logoColor=white)

| Tecnología | Uso |
|---|---|
| Node.js 18+ / Express.js o NestJS | Servidor y API REST (35+ endpoints) |
| PostgreSQL 14+ | Base de datos principal (19 tablas) |
| Redis | Caché y sesiones |
| Socket.io + Redis Adapter | Tiempo real escalable |
| JWT + ClaveÚnica OAuth2 | Autenticación |
| Winston | Logs |
| Jest + Supertest | Tests |

> **Principio de estructura:** controladores delgados que delegan la lógica de negocio a servicios independientes, facilitando el mantenimiento y los tests.

### DevOps
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white)

| Tecnología | Uso |
|---|---|
| Docker + Docker Compose | Contenedores |
| GitHub Actions | CI/CD |
| AWS / GCP / DigitalOcean | Hosting |
| Sentry + DataDog | Monitoreo y alertas |

---

## 📌 Backlog

Gestionado en **[GitHub Projects](https://github.com/users/blindjamin/projects/2)**.

| ID | Épica | HUs |
|---|---|---|
| EP-01 | Interfaz Ciudadana + Clasificación por IA | HU-01, HU-02, HU-03 |
| EP-02 | Marketplace P2P de Reutilización | HU-04, HU-05, HU-06 |
| EP-03 | Dashboard Administrativo Municipal | HU-07, HU-08, HU-09 |
| EP-04 | Sistema de Incentivos "Circular Credits" | HU-10, HU-11 |
| EP-05 | Seguridad, Autenticación y Trazabilidad | HU-12, HU-13, HU-14 |

### Roadmap

```
Fase 1 — MVP        (sem. 1–4)   BD + API base + ClaveÚnica + PWA básica
Fase 2 — Core       (sem. 5–12)  Marketplace + Chat RT + Notificaciones + Credits + Dashboard
Fase 3 — Polish     (sem. 13–16) FAQ + Chatbot + Modo oscuro + Ratings + Tests
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
