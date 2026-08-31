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

### Nombre de las ramas temporales: `fecha-persona-descripcion`

En minúsculas, separado por guiones:

```
2026-08-17-miguel-doc-permisos-equipo
2026-08-20-javier-endpoint-operadores
2026-08-22-maxi-catalogo-filtros
```

| Parte | Qué es |
|---|---|
| **fecha** | `AAAA-MM-DD` del día en que se crea la rama |
| **persona** | Nombre del integrante que hace el trabajo |
| **descripcion** | 2 a 4 palabras sobre la tarea |

Así se puede saber de un vistazo quién abrió cada rama y cuándo, sin tener que revisar los commits.

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

> **Atajo (Windows):** si ya están instalados Git, Node.js 18+ y Docker Desktop corriendo, `.\setup.ps1`
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

> **Una tarea, un área.** Cada rama trabaja sobre un área (backend, frontend, base de datos,
> DevOps o documentación). Si para avanzar hace falta tocar otra área, **no se mete el cambio
> en la misma rama**: se abre un **PR aparte** para esa parte, así lo revisa quien es
> responsable de esa área y el resto del equipo no queda bloqueado esperando.

### 1. Antes de empezar — crear rama temporal desde develop
```bash
git checkout develop
git pull origin develop
git checkout -b <fecha>-<persona>-<descripción>   # ej: 2026-08-20-javier-endpoint-operadores
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

## 🤖 Trabajo con IA

El repo tiene un [`AGENTS.md`](AGENTS.md) en la raíz con las **reglas de IA** del proyecto:
cómo debe comportarse el agente al trabajar en el código (fuentes de verdad, alcance, flujo de
ramas, qué no tocar) y la **política de uso** para el equipo (revisión del código generado, no
compartir datos de vecinos ni credenciales, transparencia en los commits).

Claude Code, Cursor y Copilot lo detectan y lo cargan automáticamente. Conviene leerlo antes
de usar cualquier herramienta de IA sobre este repo.

### Instalación obligatoria (una vez por persona)

La regla A.13 exige que cada commit declare cómo se produjo. Para no tener que recordar el
formato, hay que correr una sola vez, desde cualquier carpeta dentro del clon:

```bash
powershell -ExecutionPolicy Bypass -File .\instalar-reglas.ps1
```

Configura la plantilla de commit y el hook que la valida. Desde ahí, las líneas `IA:`, `HU:` y
`Revisor:` aparecen solas al commitear y solo hay que completarlas.

> `instalar-reglas.ps1` está en la raíz del repositorio. La plantilla (`.gitmessage`) y el hook
> (`.githooks/commit-msg`) los genera el script y **no se versionan**: si algo se rompe, basta
> con volver a correrlo.

---

## 📌 Convenciones de Código

### Git Commit Messages
```
<tipo>(<scope>): <descripción corta>

<descripción detallada si es necesario>

IA: agente | asistido | no
HU: HU-07 | ninguna
Revisor: nombre | pendiente
```

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Las tres últimas líneas son **obligatorias** desde la regla
[A.13 de `AGENTS.md`](AGENTS.md): declaran cómo se produjo el cambio (`IA`), qué historia de
usuario avanza (`HU`) y quién responde por la revisión (`Revisor`). Un hook rechaza el commit
si falta alguna.

No hay que escribirlas de memoria: aparecen solas al abrir el editor de commit, después de
correr una vez el instalador (ver [Trabajo con IA](#-trabajo-con-ia)).

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
Siempre se crea una **rama temporal desde `develop`**, con el formato `fecha-persona-descripcion`, y se borra al integrarla. No se trabaja directo sobre `develop` ni sobre `master`.

**¿Y si mi tarea me obliga a tocar el área de otra persona?**
No se mete en la misma rama: se abre un **PR aparte** para esa parte. Lo revisa quien es responsable de esa área y así ninguno de los dos queda bloqueado.

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

**Última actualización:** 2026-08-29 | Equipo COM Tech
