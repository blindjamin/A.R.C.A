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

### EP-05 — Seguridad, Autenticación y Trazabilidad
Base de toda la plataforma. Integración con **ClaveÚnica** (OAuth2 estatal) como único método de autenticación. Control de acceso por roles (vecino, administrador, operador, patrocinador) y registro auditable de todas las acciones críticas del sistema.

### EP-01 — Interfaz Ciudadana + Clasificación por IA
Permite al ciudadano registrar un residuo voluminoso desde su móvil. La clasificación por IA se ejecuta localmente en el navegador con **TensorFlow.js**, funcionando como **apoyo y no como decisión final**: el usuario siempre confirma o corrige la categoría sugerida, y puede clasificar manualmente desde el catálogo cuando la IA no detecta el residuo.

### EP-02 — Marketplace P2P de Reutilización
Espacio para que vecinos publiquen e intercambien artículos antes de que sean retirados por el municipio. Incluye chat en tiempo real (WebSocket), sistema de ratings, trazabilidad de entregas y confirmación con foto + GPS.

### EP-04 — Sistema de Incentivos "Circular Credits"
Gamificación basada en acciones sostenibles. Los créditos se otorgan automáticamente al confirmar entregas en el marketplace y son consultables con historial desde el perfil del usuario.

### EP-03 — Dashboard de Business Intelligence Municipal
Panel para funcionarios con métricas en tiempo real, mapa de calor georreferenciado de solicitudes, asignación de retiros a operadores y reportes exportables en PDF/CSV.

---

## 🛠️ Stack técnico

### Frontend (PWA)
![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
![Redux](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=flat&logo=redux&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=flat&logo=tensorflow&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat&logo=leaflet&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)

| Tecnología | Uso |
|---|---|
| React 18 + Redux Toolkit | UI y manejo de estado |
| Tailwind CSS | Estilos |
| Workbox | Service Worker / modo offline |
| Leaflet + OpenStreetMap | Mapas y geolocalización |
| Socket.io-client | Chat y notificaciones en tiempo real |
| TensorFlow.js | Clasificación de residuos **en el navegador** (cliente), como apoyo al usuario |

### Backend
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js_18+-339933?style=flat&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_/_MariaDB-4479A1?style=flat&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=json-web-tokens&logoColor=white)

| Tecnología | Uso |
|---|---|
| NestJS (Node.js 18+) + TypeScript | Servidor y API REST (35+ endpoints) con estructura modular |
| MySQL / MariaDB | Base de datos principal (19 tablas), administrada vía phpMyAdmin |
| Socket.io (Gateways de NestJS) | Chat y notificaciones en tiempo real |
| JWT + ClaveÚnica OAuth2 | Autenticación |
| Winston | Logs |
| Jest + Supertest | Tests |

> **Almacenamiento de imágenes:** las fotos se guardan como **archivos en un directorio protegido** del servidor (fuera del directorio público) y se sirven a través de la API con autenticación; en la base de datos solo se almacena la ruta. Esto resguarda los datos personales y de ubicación de los usuarios.

> **Principio de estructura:** arquitectura modular de NestJS — controladores delgados que delegan la lógica de negocio a *services* independientes, con *Guards* para el control de acceso por roles y *Gateways* para el tiempo real. Facilita el mantenimiento y los tests.

### DevOps
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=github-actions&logoColor=white)
![cPanel](https://img.shields.io/badge/cPanel-FF6C2C?style=flat&logo=cpanel&logoColor=white)

| Tecnología | Uso |
|---|---|
| Servidores de la Municipalidad de Santo Domingo (cPanel + SSH) | Hosting y despliegue |
| GitHub Actions | CI (lint / test / build); despliegue al servidor vía SSH |
| Git | Control de versiones |

> **Mejoras futuras de escalado:** Redis (caché y adaptador de Socket.io para múltiples procesos) y monitoreo con Sentry quedan planteados como mejora futura. El MVP corre en un solo proceso, con autenticación *stateless* vía JWT.

---

## 🚀 Despliegue

La aplicación se aloja en la **infraestructura de la Municipalidad de Santo Domingo**:

- **Acceso:** el equipo trabaja sobre el servidor municipal mediante **SSH** y **cPanel**; el motor de base de datos se administra con **phpMyAdmin** (MySQL / MariaDB). Node.js viene preinstalado en el servidor.
- **Topología:** PWA (React, archivos estáticos) servida por el servidor web → **API NestJS** como aplicación Node → **MySQL/MariaDB**, con las fotos en disco. La clasificación por IA (TensorFlow.js) ocurre en el dispositivo del usuario, antes de subir la solicitud.
- **Seguridad perimetral:** todo el dominio está detrás de un **WAF** municipal. Se coordina con el municipio una excepción para permitir las conexiones **WebSocket** (Socket.io) del chat y las notificaciones.
- **Ambientes:** los entornos de desarrollo y producción conviven en la misma infraestructura municipal, con acceso acotado del equipo; la separación específica se coordina con el municipio.

---

## 📌 Backlog

Gestionado en **[GitHub Projects](https://github.com/users/blindjamin/projects/2)**.

| ID | Épica | HUs | Fase |
|---|---|---|---|
| EP-05 | Seguridad, Autenticación y Trazabilidad | HU-12, HU-13, HU-14 | 1 — MVP |
| EP-01 | Interfaz Ciudadana + Clasificación por IA | HU-01, HU-02, HU-03 | 1 — MVP |
| EP-02 | Marketplace P2P de Reutilización | HU-04, HU-05, HU-06 | 2 — Core |
| EP-04 | Sistema de Incentivos "Circular Credits" | HU-10, HU-11 | 2 — Core |
| EP-03 | Dashboard Administrativo Municipal | HU-07, HU-08, HU-09 | 2 — Core |

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
