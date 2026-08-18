# Setup local — Guía para el equipo COM Tech

> Entorno de desarrollo compartido para **A.R.C.A.**  
> Setup detallado paso a paso. Para Git Flow y ramas, ver [`CLAUDE.md`](../CLAUDE.md).

---

## Prerrequisitos

Instalar en tu máquina (WSL2 / Linux / Mac):

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| **Node.js** | 18+ | `node -v` |
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

## 3. Backend (NestJS)

```bash
cd apps/backend
npm install
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

Ejecutar migraciones y arrancar:

```bash
npm run migration:run
npm run start:dev
```

API en: **http://localhost:3000**

### Verificar backend

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/residuos/catalogo
```

Respuesta health esperada: `{"status":"ok","db":"connected"}`

> **Nota:** el backend expone todas sus rutas bajo el prefijo `/api` (`app.setGlobalPrefix('api')`
> en `main.ts`), para poder compartir un único origen con el frontend detrás de ngrok.

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
> funciona igual en `localhost:5173` que a través de un túnel ngrok con dominio fijo, sin tener
> que cambiar variables de entorno según el entorno.

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
   - Listar estado (`pendiente`, etc.) y residuo asociado

> **Auth:** el UUID de arriba es **solo desarrollo**. Cuando Benjamín integre JWT, el frontend usará el token y dejará de enviar `usuarioCiudadanoId` en el body.

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

## 5. Otros roles — inicio rápido

### Benjamín (auth)

- Base en `apps/backend/src/users/` (entidades identidad)
- Rama temporal desde `develop` (ej: `auth-jwt`)
- Backend debe estar corriendo + migraciones aplicadas
- ClaveÚnica real: pendiente aprobación municipal; puede empezar con JWT mock

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
| ngrok: `Error reading configuration file ... unknown version '3'` | `ngrok.yml` debe usar `version: "2"` (el agente instalado no soporta `"3"`) |
| ngrok: `ERR_NGROK_4018` (sesión no autenticada) al usar `--config` propio | El `--config` custom no incluye el archivo por defecto con el authtoken. Pasar ambos: `--config <default> --config ngrok.yml` (ya lo hace `start-ngrok.ps1`) |
| ngrok: `ERR_NGROK_121` (agente muy viejo) | `ngrok update` (el instalado por winget puede quedar desactualizado) |
| ngrok: dos túneles devuelven la misma URL | La cuenta free solo tiene 1 dominio estático — no se pueden tunelizar backend y frontend por separado con dominios propios gratis. Ver sección 10 (arquitectura de un solo túnel) |

---

## 8. Documentación relacionada

- [`BACKEND_FASE1.md`](./BACKEND_FASE1.md) — Qué se implementó en backend Fase 1
- [`CLAUDE.md`](../CLAUDE.md) — Git Flow y convenciones del equipo
- [`README.md`](../README.md) — Producto, stack y roadmap
- [`ARCA_database_schema.dbml`](../ARCA_database_schema.dbml) — Schema completo (19 tablas)

---

## 9. Resumen — PC nuevo desde cero

Guía mínima si instalas todo en una máquina que nunca ha corrido el proyecto.

### A. Instalar una sola vez en el PC

| Herramienta | Versión | Verificar |
|---|---|---|
| Git | reciente | `git --version` |
| Node.js | 18+ | `node -v` |
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

cd apps/backend
npm install
cp .env.example .env.local
# Completar en .env.local: DB_USERNAME=arca_user  DB_PASSWORD=arca_pass

npm run migration:run
npm run start:dev
```

Verificar:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/residuos/catalogo
```

### C. Frontend (solo Maximiliano)

Con el backend corriendo en `:3000`:

```bash
cd apps/frontend
npm install
# .env.local → VITE_API_URL=/api
npm run dev
```

Abrir `http://localhost:5173`.

### Checklist mínimo

- [ ] Git, Node 18+, Docker instalados
- [ ] Repo clonado y rama correcta
- [ ] `docker compose up -d`
- [ ] `npm install` + `.env.local` en `apps/backend`
- [ ] `npm run migration:run`
- [ ] `npm run start:dev` → `/api/health` responde OK

---

## 10. Acceso desde el celular (ngrok) + scripts de automatización

Para probar la PWA en un celular real (no solo en el navegador de la PC), el equipo usa **ngrok**
con **un solo túnel de dominio fijo** apuntando al frontend. El propio Vite hace de proxy interno
hacia el backend, así que todo el tráfico (HTML, JS, y llamadas a la API) pasa por **un único
origen** — no hace falta exponer el backend por separado ni reconfigurar nada cada vez que se
reinicia el túnel.

```
Celular → https://<dominio-fijo>.ngrok-free.dev
              │
              ▼
        Vite dev server (:5173)
              │  proxy interno /api/* → http://localhost:3000
              ▼
        Backend NestJS (:3000, prefijo global /api)
              │
              ▼
        MySQL (Docker, :3306)
```

Por eso el backend expone todo bajo `/api` (`app.setGlobalPrefix('api')` en `main.ts`) y el
frontend usa `VITE_API_URL=/api` (ruta relativa, no absoluta) — así el mismo build funciona
tanto en `localhost:5173` como detrás del túnel, sin variables que cambien según el entorno.

### Scripts (raíz del repo)

| Script | Qué hace |
|---|---|
| `setup.ps1` | Instala dependencias, configura `.env.local` (backend y frontend), levanta MySQL, corre migraciones y arranca backend + frontend en ventanas nuevas. Idempotente: se puede correr de nuevo sin romper nada. |
| `start-ngrok.ps1` | Levanta el túnel ngrok (`ngrok.yml`) con el dominio fijo reservado en la cuenta y muestra la URL pública. Verifica que backend/frontend estén corriendo antes de levantar el túnel. |
| `ngrok.yml` | Config de ngrok: un único túnel `app` → `localhost:5173` con `domain:` fijo. |

### Prerrequisitos de ngrok (una sola vez por PC/cuenta)

1. Instalar: `winget install ngrok.ngrok`
2. Autenticar (con tu propio token, nunca lo compartas por chat/Slack en texto plano):
   ```powershell
   ngrok config add-authtoken TU_TOKEN
   ```
3. Reservar un dominio estático gratis en https://dashboard.ngrok.com/domains y ponerlo en el
   campo `domain:` de `ngrok.yml`. **Es por cuenta:** si otro integrante del equipo corre este
   script con su propia cuenta ngrok, tiene que reservar su propio dominio y reemplazarlo ahí.

### Uso

```powershell
cd "FDS A.R.C.A"
.\setup.ps1         # si no estan corriendo backend/frontend
.\start-ngrok.ps1
```

Abrir la URL que imprime el script desde el celular. La **primera vez** ngrok muestra una
pantalla de aviso ("You are about to visit...") — hay que tocar **Visit Site** una vez; después
no vuelve a aparecer para esa sesión de navegador. Las llamadas `fetch` del frontend ya mandan el
header `ngrok-skip-browser-warning` para no depender de esa cookie.
