# 🌿 A.R.C.A. — Guía de Setup Colaborativo

> **Equipo:** COM Tech | 5 integrantes | Feria de Software 2026

---

## 📍 Estructura de Ramas

El proyecto usa un flujo simplificado con **dos ramas permanentes** y **ramas temporales** por tarea:

```
master (main) ── solo versiones completas / releases
└── develop ── rama de trabajo e integración principal
    ├── <rama-temporal-tarea-1>   (se crea desde develop, se borra al integrar)
    ├── <rama-temporal-tarea-2>
    └── ...
```

- **`master` (o `main`):** solo recibe **versiones completas** (releases), como el estado actual. No se trabaja directamente sobre ella.
- **`develop`:** rama principal de trabajo e integración. Todo lo del día a día vive aquí.
- **Ramas temporales:** se crean **desde `develop`** cada vez que se trabaja una tarea y **se borran al integrarse** (commit/merge a `develop`). No hay ramas fijas por persona ni por módulo.

> Cambio respecto al modelo anterior: ya **no existen** ramas permanentes por módulo (`feature/frontend`, `feature/backend`, etc.). Fueron eliminadas; todo se consolidó en `develop`.

---

## 👥 Roles del Equipo

| Integrante | Rol | Áreas de responsabilidad |
|---|---|---|
| **Benjamín Paicil** | Scrum Master / Líder | Seguridad, ClaveÚnica, autenticación JWT, coordinación general |
| **Miguel Segovia** | Product Owner | Requisitos, priorización, stakeholder management |
| **Maximiliano López** | Front-End | React 18, Redux, Tailwind, UI/UX, Leaflet, Socket.io-client |
| **Javier Figueroa** | Back-End | NestJS, API REST, MySQL, Gateways, Services |
| **Ana Araya** | UX/UI & QA | Testing, reportes municipales, experiencia de usuario |

> Los roles indican el área principal de cada quien, pero **todos trabajan sobre `develop`** mediante ramas temporales; ya no hay una rama dedicada por persona.

---

## 🚀 Setup Inicial

> **Atajo (Windows):** si ya tenés Git, Node.js 18+ y Docker Desktop corriendo, `.\setup.ps1`
> en la raíz hace los pasos 3 a 5 por vos (MySQL, dependencias, `.env.local` y migraciones)
> y deja backend y frontend levantados. Los pasos de abajo son el equivalente manual.

### 1. Clonar el repositorio
```bash
git clone https://github.com/blindjamin/A.R.C.A.git
cd A.R.C.A
```

### 2. Ubicarse en develop
```bash
git fetch origin
git checkout develop
git pull origin develop
```

### 3. Instalar dependencias
```bash
# Frontend
cd apps/frontend
npm install

# Backend
cd ../backend
npm install
```

### 4. Configurar variables de entorno
Crear archivos `.env.local` en cada aplicación (no se versionan):

- `apps/backend/.env.local` — copiar de `.env.example` y completar
  `DB_USERNAME=arca_user` y `DB_PASSWORD=arca_pass` (las del `docker-compose.yml`).
- `apps/frontend/.env.local` — una sola línea: `VITE_API_URL=/api`

### 5. Levantar MySQL y correr migraciones
```bash
docker compose up -d              # desde la raíz del repo
cd apps/backend && npm run migration:run
```

> **Setup local detallado (Docker, migraciones, frontend):** ver [`docs/SETUP_LOCAL.md`](docs/SETUP_LOCAL.md)

---

## 📋 Workflow de Colaboración

Cada tarea = una **rama temporal** creada desde `develop`, que se borra al integrarse.

### 1. Antes de empezar — crear rama temporal desde develop
```bash
git checkout develop
git pull origin develop
git checkout -b <descripción-tarea>   # ej: catalogo-filtros, fix-login
```

### 2. Mientras trabajas
1. **Commits frecuentes** con mensajes claros (ver convenciones más abajo):
   ```
   feat(frontend): agregar filtros al catálogo
   fix(backend): corregir validación de solicitud
   ```
2. (Opcional) Pushear la rama temporal para respaldo: `git push -u origin <rama-temporal>`

### 3. Integrar a develop y borrar la rama temporal
```bash
git checkout develop
git pull origin develop
git merge <rama-temporal>        # o PR a develop si prefieren revisión
git push origin develop

# borrar la rama temporal (local y remota si se pusheó)
git branch -d <rama-temporal>
git push origin --delete <rama-temporal>   # solo si la pusheaste
```

### 4. Publicar una versión completa (release)
Cuando `develop` tiene un hito estable, se sube a `master` (o `main`) **solo en ese momento**, normalmente vía PR `develop → master`. `master` siempre refleja una versión completa.

---

## 🔄 Integración Continua

> **Estado: planificado.** Todavía **no hay workflows** en el repo (`.github/workflows/`).
> Por ahora lint, tests y build se corren localmente antes de integrar a `develop`.

Cuando se configure, **GitHub Actions** debería ejecutar:
  - Linting (ESLint, Prettier)
  - Tests (Jest + Supertest)
  - Build (TypeScript)
  - Despliegue a staging en cPanel

Mientras tanto, antes de integrar:
```bash
cd apps/backend  && npm run lint && npm run test && npm run build
cd apps/frontend && npm run lint && npm run build
```

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

**¿Sobre qué rama trabajo?**
Siempre creas una **rama temporal desde `develop`** para tu tarea, y la borras al integrarla. No se trabaja directo sobre `develop` ni sobre `master`.

**¿Cómo sincronizo mi rama temporal con los últimos cambios de `develop`?**
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

**¿Puedo tener varias tareas a la vez?**
Sí: una rama temporal por tarea, todas creadas desde `develop`.

**¿Cuándo se toca `master`/`main`?**
Solo para publicar versiones completas (releases), vía PR `develop → master`.

**¿Dónde reporto bugs?**
En [GitHub Issues](https://github.com/blindjamin/A.R.C.A/issues) con etiqueta y descripción clara.

---

**Última actualización:** 2026-06-23 | Equipo COM Tech
