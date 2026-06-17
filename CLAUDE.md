# 🌿 A.R.C.A. — Guía de Setup Colaborativo

> **Equipo:** COM Tech | 5 integrantes | Feria de Software 2026

---

## 📍 Estructura de Ramas

El proyecto usa **Git Flow** con ramas por módulo funcional. Cada módulo tiene su rama dedicada que integra en `develop` (rama principal de integración).

```
master (producción)
├── develop (integración principal)
│   ├── feature/frontend
│   ├── feature/backend
│   ├── feature/auth
│   ├── feature/marketplace
│   ├── feature/dashboard
│   └── feature/devops
```

---

## 👥 Asignación de Módulos

| Integrante | Rol | Rama Principal | Responsabilidades |
|---|---|---|---|
| **Benjamín Paicil** | Scrum Master / Líder | `feature/auth` | Seguridad, ClaveÚnica, autenticación JWT, coordinación general |
| **Miguel Segovia** | Product Owner | - | Requisitos, priorización, stakeholder management |
| **Maximiliano López** | Front-End | `feature/frontend` | React 18, Redux, Tailwind, UI/UX, Leaflet, Socket.io-client |
| **Javier Figueroa** | Back-End | `feature/backend` | NestJS, API REST, MySQL, Gateways, Services |
| **Ana Araya** | UX/UI & QA | `feature/dashboard` + `feature/marketplace` | Testing, reportes municipales, experiencia de usuario |

---

## 🚀 Setup Inicial

### 1. Clonar el repositorio
```bash
git clone https://github.com/blindjamin/A.R.C.A.git
cd "Feria de Software Code"
```

### 2. Instalación de ramas
```bash
git fetch origin
git checkout feature/<tu-modulo>
```

### 3. Instalar dependencias
```bash
# Frontend
cd apps/frontend
npm install

# Backend
cd ../apps/backend
npm install
```

### 4. Configurar variables de entorno
Crear archivos `.env.local` en cada aplicación (coordinar con el equipo).

---

## 📋 Workflow de Colaboración

### Antes de empezar
1. **Sincronizar con develop:** `git fetch origin && git rebase origin/develop`
2. **Crear rama local si necesitas:** `git checkout -b feature/<tu-modulo>/<descripción-tarea>`

### Mientras trabajas
1. **Hacer commits frecuentes** con mensajes claros:
   ```
   feat(auth): agregar validación de ClaveÚnica
   fix(frontend): corregir padding en formulario
   docs(backend): actualizar schema de usuarios
   ```
2. **Pushear cambios regularmente:** `git push origin feature/<tu-modulo>`

### Antes de hacer PR
1. **Rebase contra develop:** `git rebase origin/develop`
2. **Resolver conflictos** si los hay
3. **Ejecutar tests locales:** `npm test`
4. **Hacer PR a develop** (no a master)

---

## 🔄 Integración Continua

- **GitHub Actions** ejecuta:
  - Linting (ESLint, Prettier)
  - Tests (Jest + Supertest)
  - Build (TypeScript, Webpack)
  - Despliegue a staging en cPanel

---

## 📌 Convenciones de Código

### Git Commit Messages
```
<tipo>(<scope>): <descripción corta>

<descripción detallada si es necesario>

Closes #<número-issue>
```

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### TypeScript / JavaScript
- Usar **tipos explícitos** en TypeScript
- Nombrar constantes con UPPER_SNAKE_CASE
- Nombrar variables/funciones con camelCase
- Comentarios solo para lógica no obvia

### React
- Componentes como funciones (no clases)
- Usar hooks modernos
- Props tipadas con TypeScript
- Separar estilos con Tailwind

### NestJS
- Controladores delgados, lógica en Services
- Guards para control de acceso
- Gateways para Socket.io
- Inyección de dependencias

---

## 📱 Stack Técnico — Resumen Rápido

| Capa | Tecnología | Detalles |
|---|---|---|
| **Frontend** | React 18, Redux, Tailwind, TensorFlow.js | PWA con clasificación IA local |
| **Backend** | NestJS 9+, TypeScript, MySQL/MariaDB | API modular con 35+ endpoints |
| **Real-time** | Socket.io (chat, notificaciones) | Gateways de NestJS |
| **Auth** | ClaveÚnica (OAuth2) + JWT | Control por roles |
| **Deploy** | cPanel, GitHub Actions | CI/CD automático |

---

## 🔗 Enlaces Importantes

- **Backlog:** [GitHub Projects](https://github.com/users/blindjamin/projects/2)
- **Repositorio:** https://github.com/blindjamin/A.R.C.A
- **Municipalidad:** Santo Domingo, Chile
- **Contacto:** benjajuegosteam@gmail.com

---

## ❓ Preguntas Frecuentes

**¿Cómo sincronizo mi rama con los cambios de `develop`?**
```bash
git fetch origin
git rebase origin/develop
```

**¿Qué pasa si tengo conflictos?**
Resolver conflictos manualmente en el editor, luego:
```bash
git add .
git rebase --continue
```

**¿Puedo trabajar en múltiples módulos?**
Sí, pero crea ramas de feature separadas: `feature/frontend/mi-tarea` vs `feature/auth/mi-tarea`.

**¿Dónde reporto bugs?**
En [GitHub Issues](https://github.com/blindjamin/A.R.C.A/issues) con etiqueta y descripción clara.

---

**Última actualización:** 2026-06-16 | Equipo COM Tech
