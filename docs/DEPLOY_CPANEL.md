# Guía de despliegue en cPanel — A.R.C.A.

Cómo publicar las cuatro piezas de A.R.C.A. en el servidor municipal administrado con cPanel.
Está escrita para quien administra el servidor; la **Parte 1** la prepara el equipo COM Tech en
un computador con el repositorio y entrega cuatro archivos `.zip`, y la **Parte 2** se hace en
el cPanel.

> **Versión que se despliega:** `A.R.C.A-proyecto-develop-4aaec80.zip` (commit `4aaec80` de
> `develop`, 24-09-2026). Todo lo que sigue —rutas, variables de entorno y cantidad de
> migraciones— corresponde a esa versión. Las versiones posteriores se instalan con el
> procedimiento de §4.

---

## 0. Qué va dónde

| Pieza | Qué es | Dirección pública | Carpeta en el servidor |
|---|---|---|---|
| Frontend ciudadano | Archivos estáticos (HTML/JS/CSS) | `https://arca.santodomingo.cl` | Raíz de documentos del dominio (en cPanel → Dominios) |
| API ciudadana | Aplicación Node.js (NestJS) | `https://arca.santodomingo.cl/api` | `~/api` |
| Panel municipal | Archivos estáticos (HTML/JS/CSS) | `https://admin.arca.santodomingo.cl` | Raíz de documentos del subdominio |
| API del panel | Aplicación Node.js (NestJS) | `https://admin.arca.santodomingo.cl/api` | `~/api_arca_admin` |
| Base de datos | MySQL / MariaDB | — | `santod85_arca_db` |

Puntos clave:

- **Hay una sola base de datos.** Las dos APIs usan `santod85_arca_db`. No hay que crear
  `arca_dev`: ese nombre es solo el de la base local en Docker de los computadores del equipo.
- **Solo la API ciudadana crea tablas** (con las migraciones). La API del panel nunca las crea
  ni las modifica (`synchronize: false`); usa las mismas tablas.
- Cada frontend llama a **su propia API** en `/api` de su mismo dominio. Por eso el panel
  necesita subdominio propio y no puede ir en `arca.santodomingo.cl/panel`.
- Las carpetas `~/api` y `~/api_arca_admin` están **fuera** de `public_html`: el código y el
  archivo de configuración con contraseñas no quedan accesibles desde internet.

---

## 1. Estado actual — qué va a funcionar y qué no

Antes de desplegar conviene saber lo que se va a ver:

| Funciona en producción | Todavía no funciona en producción |
|---|---|
| Pantallas públicas de ambos frontends | Todo lo que requiere sesión iniciada (crear solicitudes, panel municipal) |
| `GET /api/health` en ambas APIs | Inicio de sesión con ClaveÚnica |
| Catálogo de residuos (`/api/residuos/catalogo`) | |

**Por qué:** la emisión de la sesión (JWT) después de ClaveÚnica está pendiente (EP-05). Con
`NODE_ENV=production`, las APIs responden `401 — Autenticación JWT no configurada en producción`
a cualquier petición autenticada, y el retorno de ClaveÚnica responde `501` a propósito.

> ⚠️ **No cambiar `NODE_ENV` a otro valor para "hacer funcionar" el login.** Fuera de
> producción las APIs aceptan un modo de desarrollo en que basta con conocer el identificador
> de un usuario para actuar en su nombre, y las migraciones siembran usuarios de prueba con
> identificadores conocidos (ver §6). En un servidor público eso deja el sistema abierto.

**ClaveÚnica:** la Redirect URI registrada debe ser exactamente
`https://arca.santodomingo.cl/api/auth/clave-unica/callback`. Según el manual de Gobierno
Digital, en producción se exige un dominio `.gob.cl` o una excepción aprobada por la Agencia.

---

## 2. Requisitos del servidor

- **"Setup Node.js App"** en cPanel (Node.js Selector de CloudLinux) con **Node.js 20 o
  superior** — NestJS 11 no corre en versiones anteriores. El equipo desarrolla con Node 24.
- **Terminal** de cPanel (o SSH).
- Base `santod85_arca_db` creada, con un usuario MySQL que tenga **todos los privilegios** sobre
  ella (en cPanel → Bases de datos MySQL → "Agregar usuario a la base de datos"). El usuario
  también lleva el prefijo `santod85_`.
- Dominio `arca.santodomingo.cl` y subdominio `admin.arca.santodomingo.cl` con HTTPS activo.

---

## Parte 1 — Preparar los paquetes (equipo COM Tech)

Se hace en un computador con Node.js instalado, a partir del código de la versión que se
despliega (descomprimir `A.R.C.A-proyecto-develop-4aaec80.zip`, o `git checkout 4aaec80` en un
clon del repositorio). El resultado son cuatro archivos: `api.zip`, `api_arca_admin.zip`,
`frontend.zip` y `admin-web.zip`.

### 1.1 Por qué hay que empaquetar

Las dos APIs dependen de `@arca/core` (`packages/arca-core`), un paquete interno del repo que
**no está publicado en npm**. Si se sube la carpeta del backend tal cual y se ejecuta
`npm install` en el servidor, falla porque npm no encuentra `@arca/core`. La solución es
compilarlo y adjuntarlo como archivo `.tgz` dentro de cada paquete.

### 1.2 Compilar

Desde la raíz del repo:

```bash
npm install
npm run build:core
npm run build -w backend
npm run build -w backend-admin
```

### 1.3 Empaquetar `@arca/core`

`npm pack` directamente sobre `packages/arca-core` **deja afuera la carpeta `dist/`** (está en
`.gitignore`), así que se empaqueta desde una carpeta aparte:

1. Crear una carpeta temporal, por ejemplo `arca-core-pack/`, fuera del repo.
2. Copiar ahí `packages/arca-core/package.json` y la carpeta `packages/arca-core/dist/`.
3. Dentro de esa carpeta, ejecutar:

   ```bash
   npm pack
   ```

   Genera `arca-core-0.0.1.tgz`.

### 1.4 Armar `api/` (API ciudadana)

Estructura final:

```
api/
├── dist/                      ← copia de apps/backend/dist/
├── vendor/
│   └── arca-core-0.0.1.tgz    ← el del paso 1.3
└── package.json               ← copia editada de apps/backend/package.json
```

En el `package.json` copiado:

1. Cambiar `"@arca/core": "*"` por `"@arca/core": "file:./vendor/arca-core-0.0.1.tgz"`.
2. Borrar las secciones `"devDependencies"` y `"jest"`.
3. Reemplazar `"scripts"` completo por:

   ```json
   "scripts": {
     "start": "node dist/main",
     "migration:run": "typeorm migration:run -d dist/database/data-source.js",
     "migration:show": "typeorm migration:show -d dist/database/data-source.js"
   }
   ```

   (Los scripts originales usan `ts-node` y el código fuente, que no se suben al servidor.)

Comprimir la carpeta como `api.zip` (el contenido, no la carpeta: al abrir el zip deben verse
`dist/`, `vendor/` y `package.json`).

**No incluir** `node_modules/` ni ningún `.env` / `.env.local`.

### 1.5 Armar `api_arca_admin/` (API del panel)

Igual que 1.4, con estos cambios:

- `dist/` es la copia de `apps/backend-admin/dist/`.
- `package.json` es la copia editada de `apps/backend-admin/package.json`.
- Los `"scripts"` quedan solo con `"start": "node dist/main"` — esta API no corre migraciones.

Comprimir como `api_arca_admin.zip`.

### 1.6 Compilar los frontends

Cada frontend lee su configuración al **compilar**, no en el servidor. Crear un archivo
`.env.production.local` (no se versiona; tiene prioridad sobre `.env.local` al compilar):

`apps/frontend/.env.production.local`
```
VITE_API_URL=/api
VITE_ADMIN_URL=https://admin.arca.santodomingo.cl
```

`apps/admin-web/.env.production.local`
```
VITE_API_URL=/api
```

Y compilar cada uno:

```bash
cd apps/frontend && npm install && npm run build
cd ../admin-web && npm install && npm run build
```

Comprimir el **contenido** de `apps/frontend/dist/` como `frontend.zip` y el de
`apps/admin-web/dist/` como `admin-web.zip`.

---

## Parte 2 — Instalar en el servidor (cPanel)

### 2.1 Base de datos

Ya existe `santod85_arca_db`. Solo verificar que el usuario MySQL tenga todos los privilegios
sobre ella. Las tablas **no se crean a mano**: las crean las migraciones en el paso 2.2.

### 2.2 API ciudadana (`~/api`)

**a) Aplicación Node.js.** En "Setup Node.js App", la aplicación de `api` debe tener:

| Campo | Valor |
|---|---|
| Node.js version | 20 o superior |
| Application mode | Production |
| Application root | `api` |
| Application URL | `arca.santodomingo.cl` / `api` |
| Application startup file | `dist/main.js` |

Detener la aplicación antes de subir archivos.

**b) Subir los archivos.** Con el Administrador de archivos, subir `api.zip` a `~/api` y
extraerlo. Deben quedar `~/api/dist/`, `~/api/vendor/` y `~/api/package.json`. Si quedó algún
archivo de una instalación anterior (por ejemplo, un `app.js` de ejemplo que crea cPanel), se
puede borrar; **no borrar** lo que cPanel haya creado como `node_modules` si ya existe.

**c) Configuración — archivo `~/api/.env.local`.** Tiene que llamarse exactamente
**`.env.local`**: la aplicación **no lee** un archivo `.env`. Crearlo con este contenido,
completando los valores:

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=santod85_<usuario>
DB_PASSWORD=<contraseña>
DB_DATABASE=santod85_arca_db

NODE_ENV=production
FRONTEND_URL=https://arca.santodomingo.cl

CLAVE_UNICA_CLIENT_ID=<entregado por Gobierno Digital>
CLAVE_UNICA_CLIENT_SECRET=<entregado por Gobierno Digital>
CLAVE_UNICA_REDIRECT_URI=https://arca.santodomingo.cl/api/auth/clave-unica/callback
CLAVE_UNICA_LOGOUT_REDIRECT_URI=https://arca.santodomingo.cl/login
CLAVE_UNICA_PEPPER=<ver abajo>
```

- `PORT` no se define: lo asigna cPanel.
- `CLAVE_UNICA_PEPPER` se genera **una sola vez** con
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y se
  **respalda en un lugar seguro**. Si se pierde o se cambia, ningún vecino vuelve a ser
  reconocido y todos pierden su historial.
- Mientras no estén las credenciales de ClaveÚnica, las variables `CLAVE_UNICA_*` pueden quedar
  vacías: la API arranca igual, y solo el botón de ClaveÚnica responde error.
- Cambiar los permisos del archivo a **600** (Administrador de archivos → Permisos).

Las variables también se pueden cargar en el formulario de "Setup Node.js App"; la aplicación
las toma igual. Pero las **migraciones** (paso d) solo leen `.env.local`, por eso se recomienda
el archivo.

**d) Instalar dependencias y crear las tablas.** En la parte superior de la página de la
aplicación, cPanel muestra un comando para "entrar al entorno virtual", con la forma
`source /home/santod85/nodevenv/api/<versión>/bin/activate && cd /home/santod85/api`.
Copiarlo, pegarlo en la **Terminal** y luego:

```bash
npm install --omit=dev
npm run migration:run
npm run migration:show
```

`migration:run` debe terminar con `has been executed successfully` para cada migración (son
**12** en esta versión), y `migration:show` debe mostrar todas con `[X]`. Si la base ya tenía las tablas de una
instalación anterior, solo aplica las que falten (por ejemplo, si ya se habían corrido las 9 de
la versión `c5800af`, aplica las 3 nuevas).

**e) Iniciar.** Volver a "Setup Node.js App" y presionar **Start** (o **Restart**).

**f) Verificar.** Abrir `https://arca.santodomingo.cl/api/health`. Debe responder:

```json
{"status":"ok","db":"connected"}
```

### 2.3 API del panel (`~/api_arca_admin`)

Igual que 2.2, con estas diferencias:

| Campo | Valor |
|---|---|
| Application root | `api_arca_admin` |
| Application URL | `admin.arca.santodomingo.cl` / `api` |
| Application startup file | `dist/main.js` |

`~/api_arca_admin/.env.local`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=santod85_<usuario>
DB_PASSWORD=<contraseña>
DB_DATABASE=santod85_arca_db

NODE_ENV=production
FRONTEND_URL=https://admin.arca.santodomingo.cl
```

- Misma base, mismo usuario y contraseña que la API ciudadana.
- En la Terminal solo `npm install --omit=dev` — **no** correr migraciones aquí.
- Verificar con `https://admin.arca.santodomingo.cl/api/health`.

### 2.4 Frontend ciudadano (`arca.santodomingo.cl`)

1. En cPanel → Dominios, ver cuál es la **raíz de documentos** de `arca.santodomingo.cl`.
2. En esa carpeta, borrar los archivos del frontend anterior (`index.html`, `assets/`, etc.)
   **excepto `.htaccess`**: cPanel guarda ahí la configuración que conecta `/api` con la
   aplicación Node.js (un bloque marcado `DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION`).
3. Subir `frontend.zip` y extraerlo ahí mismo (debe quedar `index.html` directamente en la raíz).
4. **Editar** (no reemplazar) el `.htaccess` y agregar **al final**:

   ```apache
   # A.R.C.A. — la app usa rutas del navegador (/login, /solicitudes...):
   # cualquier ruta que no sea un archivo real ni la API devuelve index.html.
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteCond %{REQUEST_URI} !^/api(/|$)
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule ^ index.html [L]
   </IfModule>
   ```

   Sin esto, recargar la página en una ruta como `/login` da error 404.

5. Verificar: abrir `https://arca.santodomingo.cl`, navegar a `/login` y recargar (F5).

### 2.5 Panel municipal (`admin.arca.santodomingo.cl`)

Igual que 2.4, en la raíz de documentos del subdominio, con `admin-web.zip` y el mismo bloque
en su `.htaccess`.

---

## 3. Verificación final

| Dirección | Resultado esperado |
|---|---|
| `https://arca.santodomingo.cl/api/health` | `{"status":"ok","db":"connected"}` |
| `https://admin.arca.santodomingo.cl/api/health` | `{"status":"ok","db":"connected"}` |
| `https://arca.santodomingo.cl/api/residuos/catalogo` | Lista de residuos en JSON |
| `https://arca.santodomingo.cl` y recargar en `/login` | Carga la app, sin 404 |
| `https://admin.arca.santodomingo.cl` | Carga el panel |
| Acciones con sesión (panel, crear solicitud) | `401` — esperado hasta EP-05 (ver §1) |

---

## 4. Actualizar a una versión nueva

1. El equipo entrega los zips nuevos (Parte 1, a partir de la versión nueva). Una versión
   nueva puede traer migraciones o dependencias adicionales, por eso el paso 4 no se puede
   saltar.
2. Detener la aplicación en "Setup Node.js App".
3. Reemplazar `dist/`, `vendor/` y `package.json`. **No tocar `.env.local`.**
4. En la Terminal (con el comando del entorno virtual):
   - `npm install --omit=dev` si cambió `package.json` o el `.tgz`.
   - En `~/api` solamente: `npm run migration:run`.
5. **Restart** de la aplicación y verificar `/api/health`.
6. Para los frontends: reemplazar los archivos, **conservando `.htaccess`**.

Orden recomendado cuando cambian ambas APIs: primero la ciudadana (con sus migraciones), después
la del panel.

---

## 5. Si algo no funciona

Primero revisar el registro de la aplicación: en "Setup Node.js App" se puede definir un
archivo de log (por ejemplo `~/api/stderr.log`); los errores de arranque quedan ahí.

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `npm install` falla con `404 @arca/core` | Se subió el `package.json` sin editar | Revisar paso 1.4: `@arca/core` debe apuntar a `file:./vendor/...tgz` |
| `Cannot find module '@arca/core'` al iniciar | Faltó `npm install` o falta `vendor/` | Repetir 2.2 d |
| `Cannot find module .../dist/main.js` | Startup file mal escrito o `dist/` no quedó en la raíz de la app | Verificar que exista `~/api/dist/main.js` |
| `Unable to connect to the database` / `Access denied` | No existe `.env.local`, se llama `.env`, o usuario/contraseña/base incorrectos | Revisar 2.2 c; el usuario lleva prefijo `santod85_` |
| `/api/health` responde `404` de NestJS (`Cannot GET ...`) | La ruta que llega a la app no coincide | Confirmar que "Application URL" termine en `/api` |
| `/api/health` responde `404` del servidor web o página del frontend | La petición no llega a la app Node | Revisar que el `.htaccess` conserve el bloque de Passenger y que la regla nueva excluya `/api` |
| `Table ... doesn't exist` | No se corrieron las migraciones | 2.2 d, en `~/api` |
| Recargar en `/login` da 404 | Falta la regla del `.htaccess` | 2.4 paso 4 |
| Error de CORS en la consola del navegador | `FRONTEND_URL` no coincide con el dominio | Debe ser `https://...` exacto, sin `/` al final |
| `401 Autenticación JWT no configurada en producción` | Esperado | Ver §1 |
| Botón ClaveÚnica responde `500` | Faltan variables `CLAVE_UNICA_*` | Completarlas cuando lleguen las credenciales |

---

## 6. Seguridad

- `.env.local` con permisos **600**, fuera de `public_html`, nunca subido al repositorio.
- `NODE_ENV=production` siempre en el servidor (ver §1).
- **Usuarios de prueba:** tres migraciones (`seed-operador-demo`, `seed-admin-demo`,
  `seed-operadores-prueba`) insertan usuarios de demostración con identificadores fijos. No
  tienen contraseña y con `NODE_ENV=production` no se pueden usar para entrar, pero **deben
  eliminarse antes de la puesta en marcha real**. Se hará con una migración nueva (las ya
  aplicadas no se modifican) — pendiente del equipo.
- Respaldar `CLAVE_UNICA_PEPPER` junto con las credenciales de ClaveÚnica.
- Respaldos periódicos de `santod85_arca_db` (cPanel → Copia de seguridad).
