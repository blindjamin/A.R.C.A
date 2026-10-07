# Setup local — Guía para el equipo COM Tech

> Entorno de desarrollo compartido para **A.R.C.A.**  
> Setup detallado paso a paso. Para Git Flow y ramas, ver [`CLAUDE.md`](../CLAUDE.md).

---

## Prerrequisitos

Instalar en tu máquina (WSL2 / Linux / Mac):

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| **Node.js** | 24.18.0 (mínimo 22.12.0, lo exige Vite 8) | `node -v` |
| **npm** | incluido con Node | `npm -v` |
| **Git** | reciente | `git --version` |
| **Docker Desktop** | con WSL integrado (si usas WSL) | `docker --version` |

Opcional:

- **Nest CLI:** `npm install -g @nestjs/cli` (solo si vas a generar módulos NestJS)

---

## 1. Clonar y ubicarse en develop

```bash
git clone https://github.com/blindjamin/A.R.C.A.git
cd A.R.C.A
git fetch origin
git checkout develop
git pull origin develop
```

> **Modo de trabajo:** se trabaja sobre `develop` mediante **ramas temporales** por tarea
> (creadas desde `develop`, borradas al integrar). `master`/`main` solo recibe versiones
> completas. Detalle en [`../CLAUDE.md`](../CLAUDE.md). Para tu tarea:
> ```bash
> git checkout -b <descripción-tarea>   # ej: catalogo-filtros
> ```

---

## 2. Levantar MySQL (Docker)

Desde la **raíz del repo**:

```bash
docker compose up -d
docker compose ps   # debe mostrar arca-mysql healthy/running
```

Credenciales locales (definidas en `docker-compose.yml`):

| Variable | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `3306` |
| Base de datos | `arca_dev` |
| Usuario | `arca_user` |
| Contraseña | `arca_pass` |

---

## 3. Backend (npm workspace)

`apps/backend` es un **npm workspace**: el `package.json` de la raíz lo administra. Sirve la
API ciudadana, la del panel municipal (`src/admin/`, rutas `/api/admin/*`) y el núcleo
(`src/core/`: entidades, ClaveÚnica, sesión, auditoría). **Un solo `npm install` desde la
raíz**:

```bash
npm install          # desde la raíz del repo — NO desde apps/backend
```

> **No correr `npm install` dentro de `apps/backend`.** Rompe el hoisting de dependencias del
> workspace: algunos paquetes (`ts-node`, `@nestjs/platform-express`) quedan instalados en el
> lugar equivocado y el servidor no arranca o `migration:run` falla con `Cannot find module`.
> Si eso pasa, borrar `node_modules` de la raíz y de `apps/backend` y volver a correr
> `npm install` desde la raíz.

### 3.1 Backend (`apps/backend`, :3000)

```bash
cd apps/backend
cp .env.example .env.local
```

Editar `apps/backend/.env.local` y completar credenciales BD:

```env
DB_USERNAME=arca_user
DB_PASSWORD=arca_pass
```

El resto puede quedar como en `.env.example`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=arca_dev
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Para entrar en local sin ClaveÚnica (accesos de desarrollo vecino, funcionario y admin),
agregar también:

```env
ALLOW_DEV_LOGIN=true
```

Habilita `POST /api/auth/dev/login`. **Solo en local:** el backend se niega a arrancar si
está junto con `NODE_ENV=production`, y nunca va en el servidor. `scripts/setup.ps1` todavía no lo
agrega solo.

Ejecutar migraciones y arrancar:

```bash
npm run migration:run
npm run start:dev
```

### Verificar backend

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/residuos/catalogo
```

Respuesta health esperada: `{"status":"ok","db":"connected"}`

> **Nota:** todas las rutas van bajo el prefijo `/api` (`app.setGlobalPrefix('api')` en
> `main.ts`); las del panel, bajo `/api/admin`.

---

## 4. Frontend — Guía para Maximiliano

### 4.1 Rama y carpeta

> **Nota:** la app frontend **ya existe** en `apps/frontend/` (ver [`FRONTEND_FASE1.md`](./FRONTEND_FASE1.md)).
> Esta sección queda como referencia histórica del scaffold inicial.

Trabajar desde `develop` con una rama temporal:

```bash
git fetch origin
git checkout develop
git pull origin develop
git checkout -b <descripción-tarea>   # ej: frontend-filtros
```

Scaffold original (solo referencia, ya ejecutado):

```bash
cd A.R.C.A
mkdir -p apps/frontend
cd apps/frontend
npm create vite@latest . -- --template react-ts
npm install
```

### 4.2 Stack del proyecto (según README)

Instalar dependencias planificadas:

```bash
npm install @reduxjs/toolkit react-redux
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

(Otras dependencias — Leaflet, Socket.io, TensorFlow.js — según avance de cada épica.)

### 4.3 Variables de entorno frontend

Crear `apps/frontend/.env.local`:

```env
VITE_API_URL=/api
```

Agregar a `.gitignore` del frontend (Vite suele ignorar `.env.local` por defecto).

> **Ruta relativa a propósito:** `vite.config.ts` tiene un proxy que reenvía `/api` al backend
> (`http://localhost:3000`). Así el frontend y el backend quedan detrás de un único origen —
> funciona igual en local que detrás de un túnel, sin tener que cambiar variables de entorno
> según el entorno.

### 4.4 CORS — ya configurado en backend

El backend acepta peticiones desde `http://localhost:5173` (puerto default de Vite). En el flujo
normal (frontend llamando vía el proxy `/api` de Vite) el navegador nunca cruza orígenes, así que
CORS no entra en juego — solo importa si algo llama al backend directo en `localhost:3000`.

- Backend: `FRONTEND_URL=http://localhost:5173` en `apps/backend/.env.local` (acepta una lista
  separada por comas si hace falta agregar más orígenes)
- Si Vite usa otro puerto, actualizar `FRONTEND_URL` en backend

**Probar CORS:** con backend y frontend corriendo, en consola del navegador (`localhost:5173`):

```javascript
fetch(`${import.meta.env.VITE_API_URL}/residuos/catalogo`)
  .then((r) => r.json())
  .then(console.log);
```

### 4.5 Arrancar frontend

```bash
cd apps/frontend
npm run dev
```

Abrir: **http://localhost:5173**

### 4.6 Flujo EP-01 a implementar (MVP ciudadano)

Orden sugerido de pantallas:

1. **Catálogo de residuos**  
   - `GET {VITE_API_URL}/residuos/catalogo`  
   - Mostrar lista (nombre, categoría, `puedeReutilizarse`)

2. **Formulario solicitud de retiro**  
   - Usuario selecciona ítem del catálogo  
   - `POST {VITE_API_URL}/solicitudes-retiro`  
   - Body (temporal, sin auth real):

   ```json
   {
     "usuarioCiudadanoId": "00000000-0000-4000-8000-000000000001",
     "residuoCatalogoId": 1,
     "descripcion": "Texto opcional"
   }
   ```

3. **Mis solicitudes**  
   - `GET {VITE_API_URL}/solicitudes-retiro?usuarioCiudadanoId=00000000-0000-4000-8000-000000000001`  
   - Listar estado (`en_revision`, etc.) y residuo asociado

> **Auth (actualizado):** hoy toda llamada requiere la cookie de sesión `arca_sesion` (ClaveÚnica
> o, en local, los accesos de desarrollo). El body todavía lleva `usuarioCiudadanoId`, pero el
> backend responde 403 si no coincide con el vecino de la sesión.

### 4.7 Ejemplo mínimo de servicio API (TypeScript)

```typescript
const API_URL = import.meta.env.VITE_API_URL;

export async function fetchCatalogo() {
  const res = await fetch(`${API_URL}/residuos/catalogo`);
  if (!res.ok) throw new Error('Error al cargar catálogo');
  return res.json();
}

export async function crearSolicitudRetiro(data: {
  usuarioCiudadanoId: string;
  residuoCatalogoId: number;
  descripcion?: string;
}) {
  const res = await fetch(`${API_URL}/solicitudes-retiro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al crear solicitud');
  return res.json();
}
```

### 4.8 Checklist Maxi — primera entrega frontend

- [ ] Scaffold Vite + React TS en `apps/frontend`
- [ ] `VITE_API_URL` configurado
- [ ] Pantalla catálogo consumiendo `GET /residuos/catalogo`
- [ ] Formulario POST solicitud de retiro
- [ ] Listado de solicitudes del usuario dev
- [ ] Integrar a `develop` y borrar la rama temporal

---

## 4.9 Panel municipal (`apps/frontend/src/admin`, `/admin`)

El panel es parte del mismo frontend: no tiene `npm install` ni servidor propios. Con el backend
y el frontend corriendo, abrir **http://localhost:5173/admin**.

Para entrar, usar en `/login` el acceso de desarrollo **Funcionario (dev)** o **Admin (dev)**
(requiere `ALLOW_DEV_LOGIN=true` en el backend, ver §3.1) y elegir «Panel municipal». Las rutas
`/admin/*` exigen rol funcionario o admin; la auditoría, solo admin. Si el panel responde con
errores de columnas inexistentes, falta correr `npm run migration:run` en `apps/backend`.

---

## 5. Otros roles — inicio rápido

### Benjamín (auth)

- ClaveÚnica y sesión en `apps/backend/src/core/auth/` (ver [`SEGURIDAD_ARQUITECTURA.md`](./SEGURIDAD_ARQUITECTURA.md))
- Rama temporal desde `develop`
- Backend debe estar corriendo + migraciones aplicadas
- ClaveÚnica real: pendiente de las credenciales del municipio; mientras tanto, `ALLOW_DEV_LOGIN=true`

### Ana (QA / UX)

- Probar flujo con curl o Postman (ver [`BACKEND_FASE1.md`](./BACKEND_FASE1.md))
- Cuando exista frontend, casos de prueba sobre EP-01

---

## 6. Comandos útiles

```bash
# Raíz — Docker
docker compose up -d
docker compose down
docker compose logs mysql

# Raíz — workspace del backend
npm install

# Backend
cd apps/backend
npm run start:dev
npm run migration:run
npm run migration:revert   # revertir última migración
npm run build
npm test

# Ver tablas en MySQL
docker compose exec mysql mysql -u arca_user -parca_pass arca_dev -e "SHOW TABLES;"
```

---

## 7. Problemas frecuentes

| Error | Solución |
|---|---|
| `EADDRINUSE :3000` | Puerto ocupado: `kill $(lsof -t -i :3000)` y reiniciar |
| `ECONNREFUSED :3306` | `docker compose up -d` |
| `Access denied` MySQL | Revisar `.env.local` vs `docker-compose.yml` |
| CORS blocked | Backend corriendo; frontend en `5173`; `FRONTEND_URL` correcto |
| `Usuario ciudadano no encontrado` | Correr `npm run migration:run` (incluye usuario dev) |
| `git add` no encuentra `.gitignore` | Ejecutar git desde **raíz** del repo, no desde `apps/backend` |
| Docker no funciona en WSL | Docker Desktop → Settings → WSL Integration |
| `wsl --update` da `REGDB_E_CLASSNOTREG` | Reparar Windows Installer: `net stop msiserver`, `msiexec /unregister`, `msiexec /regserver`, `net start msiserver`. Si persiste, `sfc /scannow` + `DISM /Online /Cleanup-Image /RestoreHealth` y reintentar `wsl --install` |
| Script `.ps1` tira `TerminatorExpectedAtEndOfString` en una línea que se ve bien | Encoding: PowerShell 5.1 sin BOM lee mal tildes/guiones especiales. Evitar caracteres no-ASCII en los `.ps1` |
| `EADDRINUSE` al reiniciar backend/frontend | Puede haber procesos `node` colgados de corridas anteriores: `Get-Process node | Stop-Process -Force` y volver a arrancar |
| `Cannot find module 'ts-node'` en `migration:run`, o `No driver (HTTP) has been selected` al arrancar el backend | `npm install` se corrió dentro de `apps/backend` en vez de la raíz, y quedó mal el hoisting del workspace. Borrar `node_modules` de la raíz y de `apps/backend`, y `npm install` de nuevo **desde la raíz** |
| `Entity metadata for X#relacion was not found` al arrancar el backend | Falta una entidad relacionada en el `entities:` de TypeORM (o en el `forFeature()` del módulo) — TypeORM necesita conocer toda entidad que aparezca en una relación |
| Los accesos de desarrollo de `/login` responden 404 | Falta `ALLOW_DEV_LOGIN=true` en `apps/backend/.env.local` (ver §3.1); reiniciar el backend |

---

## 8. Documentación relacionada

- [`BACKEND_FASE1.md`](./BACKEND_FASE1.md) — Qué se implementó en el backend ciudadano Fase 1
- [`../apps/backend/README.md`](../apps/backend/README.md) — API ciudadana y del panel, autenticación
- [`../apps/frontend/README.md`](../apps/frontend/README.md) — PWA y panel municipal
- [`SEGURIDAD_ARQUITECTURA.md`](./SEGURIDAD_ARQUITECTURA.md) — Sesión, control de acceso y auditoría
- [`CLAUDE.md`](../CLAUDE.md) — Git Flow y convenciones del equipo
- [`README.md`](../README.md) — Producto, stack y roadmap
- [`ARCA_database_schema.dbml`](ARCA_database_schema.dbml) — Schema completo (19 tablas)

---

## 9. Resumen — PC nuevo desde cero

Guía mínima si instalas todo en una máquina que nunca ha corrido el proyecto.

### A. Instalar una sola vez en el PC

| Herramienta | Versión | Verificar |
|---|---|---|
| Git | reciente | `git --version` |
| Node.js | 24.18.0 (mínimo 22.12.0) | `node -v` |
| Docker | con WSL integrado (Windows) | `docker compose version` |

No hace falta instalar MySQL ni Nest CLI global; MySQL va en Docker y NestJS vive en el repo.

### B. Levantar el proyecto (cada clone / PC nuevo)

```bash
git clone https://github.com/blindjamin/A.R.C.A.git
cd A.R.C.A
git fetch origin
git checkout develop
git pull origin develop

docker compose up -d

# Workspace: un solo npm install en la raíz resuelve el backend.
# NO correr npm install dentro de apps/backend.
npm install

cd apps/backend
cp .env.example .env.local
# Completar en .env.local: DB_USERNAME=arca_user  DB_PASSWORD=arca_pass
# y, solo en local, ALLOW_DEV_LOGIN=true
npm run migration:run
npm run start:dev
```

Verificar:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/residuos/catalogo
```

### C. Frontend (con su propio `npm install`)

Con el backend corriendo:

```bash
cd apps/frontend
npm install
# .env.local → VITE_API_URL=/api
npm run dev
```

Abrir `http://localhost:5173` (PWA) y `http://localhost:5173/admin` (panel).

### Checklist mínimo

- [ ] Git, Node 22.12.0 o superior (recomendado 24.18.0), Docker instalados
- [ ] Repo clonado y rama correcta
- [ ] `docker compose up -d`
- [ ] `npm install` en la **raíz** (workspace del backend)
- [ ] `.env.local` en `apps/backend` (con `ALLOW_DEV_LOGIN=true` para entrar en local)
- [ ] `npm run migration:run` en `apps/backend`
- [ ] `npm run start:dev` en `apps/backend` → `/api/health` responde OK en :3000
- [ ] `npm install` + `.env.local` + `npm run dev` en `apps/frontend`

---

## 10. Acceso remoto

El equipo trabaja **en local**; no hay túnel público configurado. Lo único que se demuestra a
distancia (a la municipalidad) es la PWA ciudadana, y por ahora eso se hace en persona o con
capturas — no hace falta exponer nada a internet para el trabajo diario. Si en algún momento
hace falta volver a exponer un servicio (por ejemplo para una demo remota), evaluarlo en ese
momento: la arquitectura de un solo origen (`VITE_API_URL=/api` + proxy de Vite) sigue
haciendo que cualquier solución de túnel sea simple de aplicar.
