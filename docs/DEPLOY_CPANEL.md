# Guía de despliegue en cPanel — A.R.C.A.

Cómo publicar A.R.C.A. en el servidor municipal administrado con cPanel. Está escrita para quien
administra el servidor: la **Parte 1** la prepara el equipo COM Tech en un computador con el
repositorio y entrega dos archivos `.zip`; la **Parte 2** se hace en el cPanel.

> **Versión que se despliega:** commit `5ef7992` de `develop` (27-09-2026), la primera con la
> **app unificada**: vecino y panel municipal en un solo sitio. Si el servidor tiene la
> estructura anterior (subdominio del panel y una segunda API), la sección **2.4** explica cómo
> desmontarla. Las versiones posteriores se instalan con el procedimiento de §4.

---

## 0. Qué va dónde

| Pieza | Qué es | Dirección pública | Carpeta en el servidor |
|---|---|---|---|
| Frontend | Archivos estáticos (HTML/JS/CSS). Incluye la app del vecino y el panel municipal en `/admin` | `https://arca.santodomingo.cl` | Raíz de documentos del dominio (cPanel → Dominios) |
| API | Aplicación Node.js (NestJS) | `https://arca.santodomingo.cl/api` | `~/api` |
| Base de datos | MySQL / MariaDB | — | `santod85_arca_db` |

Puntos clave:

- **Un solo dominio.** Vecinos y funcionarios entran por `arca.santodomingo.cl` con ClaveÚnica.
  Después del login, cada persona ve lo que le corresponde según su rol: el vecino, su app; el
  funcionario y el administrador, además, el panel en `/admin`. Quién puede ver qué lo decide la
  API en cada petición, no la dirección desde donde se entra.
- **Una sola integración de ClaveÚnica**, con una sola dirección de retorno. Por eso el panel
  ya no lleva subdominio propio: con dos dominios habrían hecho falta dos integraciones.
- **La sesión es una cookie** (`arca_sesion`) que emite la API después de ClaveÚnica. Solo
  funciona con HTTPS, porque en producción la cookie se marca como segura.
- **Una sola base.** No hay que crear `arca_dev`: ese es el nombre de la base local de los
  computadores del equipo.
- La carpeta `~/api` queda **fuera** de `public_html`: el código y el archivo con contraseñas no
  quedan accesibles desde internet.

---

## 1. Estado actual — qué funciona

| Con las credenciales de ClaveÚnica configuradas | Sin credenciales de ClaveÚnica |
|---|---|
| Todo: login, solicitudes, marketplace, panel municipal según el rol | Solo las pantallas públicas, `GET /api/health` y el catálogo de residuos |
| | Todo lo que requiere sesión responde `401` |

**En producción no hay otra forma de entrar que ClaveÚnica.** El "login de desarrollo" que usa
el equipo en sus computadores se activa con la variable `ALLOW_DEV_LOGIN=true`, y la API **se
niega a arrancar** si la encuentra junto con `NODE_ENV=production`. Es a propósito: con ese modo,
cualquiera podría entrar como funcionario sin ClaveÚnica. Los botones "Vecino (dev)" y
"Funcionario (dev)" tampoco aparecen en el build de producción.

**ClaveÚnica:** la Redirect URI registrada debe ser exactamente
`https://arca.santodomingo.cl/api/auth/clave-unica/callback`, y la Logout URI
`https://arca.santodomingo.cl/login`. Según el manual de Gobierno Digital, en producción se
exige un dominio `.gob.cl` o una excepción aprobada por la Agencia.

---

## 2. Requisitos del servidor

- **"Setup Node.js App"** en cPanel (Node.js Selector de CloudLinux) con **Node.js 22.12.0 o
  superior** (el equipo desarrolla con Node 24). Con versiones anteriores la API no arranca.
- **Terminal** de cPanel (o SSH).
- Base `santod85_arca_db` con un usuario MySQL que tenga **todos los privilegios** sobre ella
  (cPanel → Bases de datos MySQL → "Agregar usuario a la base de datos"). El usuario lleva el
  prefijo `santod85_`.
- `arca.santodomingo.cl` con **HTTPS activo**. Sin HTTPS la sesión no se guarda en el navegador.

---

## Parte 1 — Preparar los paquetes (equipo COM Tech)

Se hace en un computador con Node.js 22.12 o superior, desde el código de la versión que se
despliega (`git checkout <commit>` en un clon del repositorio). El resultado son dos archivos:
`api.zip` y `frontend.zip`.

### 1.1 Compilar la API

Desde la raíz del repo:

```bash
npm install
npm run build -w backend
```

Deja el código compilado en `apps/backend/dist/`.

### 1.2 Armar `api/`

Estructura final:

```
api/
├── dist/            ← copia de apps/backend/dist/
└── package.json     ← copia editada de apps/backend/package.json
```

En el `package.json` copiado:

1. Borrar las secciones `"devDependencies"` y `"jest"`.
2. Reemplazar `"scripts"` completo por:

   ```json
   "scripts": {
     "start": "node dist/main",
     "migration:run": "typeorm migration:run -d dist/database/data-source.js",
     "migration:show": "typeorm migration:show -d dist/database/data-source.js"
   }
   ```

   (Los scripts originales usan `ts-node` y el código fuente, que no se sube al servidor.)

Comprimir el **contenido** de la carpeta como `api.zip`: al abrir el zip deben verse `dist/` y
`package.json`. **No incluir** `node_modules/` ni ningún `.env` / `.env.local`.

> **En Windows, no usar `Compress-Archive` de PowerShell 5.1:** guarda las rutas con `\`, y al
> descomprimir en el servidor (Linux) aparecen archivos llamados `dist\main.js` en vez de la
> carpeta `dist/`. Usar el `tar` incluido en Windows, desde dentro de la carpeta:
> `tar.exe -a -c -f ..\api.zip dist package.json`. Lo mismo para `frontend.zip`.

> Ya no hace falta empaquetar `@arca/core` ni un archivo `.tgz`: desde la unificación, el
> núcleo compartido vive dentro de la API (`apps/backend/src/core`).

### 1.3 Compilar el frontend

El frontend lee su configuración al **compilar**, no en el servidor. Crear
`apps/frontend/.env.production.local` (no se versiona; tiene prioridad sobre `.env.local` al
compilar) con una sola línea:

```
VITE_API_URL=/api
```

Y compilar:

```bash
cd apps/frontend && npm install && npm run build
```

Comprobar que en `apps/frontend/dist/assets/` exista un archivo `AdminApp-*.js`: es el panel
municipal, que se descarga solo cuando entra un funcionario. Comprimir el **contenido** de
`apps/frontend/dist/` como `frontend.zip`.

---

## Parte 2 — Instalar en el servidor (cPanel)

### 2.1 Base de datos

Solo verificar que el usuario MySQL tenga todos los privilegios sobre `santod85_arca_db`. Las
tablas **no se crean a mano**: las crean las migraciones en el paso 2.2.

### 2.2 API (`~/api`)

**a) Aplicación Node.js.** En "Setup Node.js App", la aplicación de `api` debe tener:

| Campo | Valor |
|---|---|
| Node.js version | 22.12 o superior |
| Application mode | Production |
| Application root | `api` |
| Application URL | `arca.santodomingo.cl` / `api` |
| Application startup file | `dist/main.js` |

Detener la aplicación antes de subir archivos. Si el formulario permite definir un archivo de
log, poner `~/api/stderr.log`: ahí quedan los errores de arranque (§5).

**b) Subir los archivos.** Con el Administrador de archivos, en `~/api`:

1. Borrar `dist/`, `vendor/` y `package.json` de la instalación anterior, si existen. `vendor/`
   era el `.tgz` de `@arca/core`, que ya no se usa. **No borrar** `.env.local` ni lo que cPanel
   haya creado como `node_modules`.
2. Subir `api.zip` y extraerlo ahí mismo. Deben quedar `~/api/dist/` y `~/api/package.json`.

**c) Configuración — archivo `~/api/.env.local`.** Tiene que llamarse exactamente
**`.env.local`**: la aplicación **no lee** un archivo `.env`. Crearlo (o revisarlo, si ya
existe) con este contenido, completando los valores:

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=santod85_<usuario>
DB_PASSWORD=<contraseña>
DB_DATABASE=santod85_arca_db

NODE_ENV=production
FRONTEND_URL=https://arca.santodomingo.cl
TRUST_PROXY=loopback

CLAVE_UNICA_CLIENT_ID=<entregado por Gobierno Digital>
CLAVE_UNICA_CLIENT_SECRET=<entregado por Gobierno Digital>
CLAVE_UNICA_REDIRECT_URI=https://arca.santodomingo.cl/api/auth/clave-unica/callback
CLAVE_UNICA_LOGOUT_REDIRECT_URI=https://arca.santodomingo.cl/login
CLAVE_UNICA_PEPPER=<ver abajo>
```

- **No agregar `ALLOW_DEV_LOGIN`.** Si aparece con `NODE_ENV=production`, la API no arranca (§1).
- `PORT` no se define: lo asigna cPanel.
- `TRUST_PROXY=loopback` permite que la API vea la IP real de cada visitante detrás del proxy
  del servidor, para el límite de consultas. **No poner `true`**: cualquiera podría inventar su
  IP y saltarse el límite. Ver §6 sobre Cloudflare.
- `CLAVE_UNICA_PEPPER` se genera **una sola vez** con
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y se **respalda en
  un lugar seguro**. Si se pierde o se cambia, ningún vecino vuelve a ser reconocido y todos
  pierden su historial. Si ya existe de una instalación anterior, **no cambiarlo**.
- Mientras no estén las credenciales de ClaveÚnica, `CLIENT_ID` y `CLIENT_SECRET` pueden quedar
  vacías: la API arranca igual, y solo el botón de ClaveÚnica responde error.
- Permisos del archivo: **600** (Administrador de archivos → Permisos).

Las variables también se pueden cargar en el formulario de "Setup Node.js App", pero las
**migraciones** (paso d) solo leen `.env.local`; por eso se recomienda el archivo.

**d) Instalar dependencias y crear las tablas.** En la parte superior de la página de la
aplicación, cPanel muestra un comando para "entrar al entorno virtual", con la forma
`source /home/santod85/nodevenv/api/<versión>/bin/activate && cd /home/santod85/api`. Copiarlo,
pegarlo en la **Terminal** y luego:

```bash
npm install --omit=dev
npm run migration:run
npm run migration:show
```

Son **12** migraciones, las mismas de la versión `4aaec80`. Si ya se habían corrido,
`migration:run` responde `No migrations are pending` y no cambia nada. `migration:show` debe
mostrar las 12 con `[X]`.

**e) Iniciar.** Volver a "Setup Node.js App" y presionar **Start** (o **Restart**).

**f) Verificar.** Abrir `https://arca.santodomingo.cl/api/health`. Debe responder:

```json
{"status":"ok","db":"connected"}
```

Si responde una página de error del servidor (`500 Internal Server Error`), la aplicación no
arrancó: revisar `~/api/stderr.log` (§5).

### 2.3 Frontend (`arca.santodomingo.cl`)

1. En cPanel → Dominios, ver cuál es la **raíz de documentos** de `arca.santodomingo.cl`.
2. En esa carpeta, borrar los archivos del frontend anterior (`index.html`, `assets/`, etc.)
   **excepto `.htaccess`**: cPanel guarda ahí la configuración que conecta `/api` con la
   aplicación Node.js (un bloque marcado `DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION`).
3. Subir `frontend.zip` y extraerlo ahí mismo (`index.html` debe quedar directamente en la raíz).
   Junto a `index.html` quedan `assets/` y `claveunica/`: esta última trae el estilo y el logo
   del botón oficial de ClaveÚnica. Es parte del sitio; no borrarla.
4. Revisar que el `.htaccess` tenga **al final** este bloque (si viene de la instalación
   anterior ya debería estar; si no, agregarlo sin tocar lo demás):

   ```apache
   # A.R.C.A. — la app usa rutas del navegador (/login, /admin...):
   # cualquier ruta que no sea un archivo real ni la API devuelve index.html.
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteCond %{REQUEST_URI} !^/api(/|$)
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule ^ index.html [L]
   </IfModule>
   ```

   Sin esto, recargar la página en `/login` o `/admin` da error 404.

### 2.4 Desmontar la estructura anterior (solo si existe)

Antes de la unificación, el panel tenía su propio subdominio y su propia API. Ya no se usan:

1. **API del panel.** En "Setup Node.js App", detener y **eliminar** la aplicación
   `api_arca_admin`. Después, borrar la carpeta `~/api_arca_admin` completa: su `.env.local`
   tiene la contraseña de la base, y no conviene dejarla en un lugar que ya nadie revisa.
2. **Subdominio del panel** (por ejemplo `arcapanel.santodomingo.cl`). Borrar sus archivos y
   dejar una **redirección permanente (301)** hacia `https://arca.santodomingo.cl/admin`
   (cPanel → Dominios → Redirecciones), para que quien tenga guardada la dirección antigua
   llegue al lugar nuevo. Si se le había puesto "Directory Privacy", ya no hace falta.
3. En `~/api`, borrar la carpeta `vendor/` si quedó de la versión anterior (paso 2.2 b).

---

## 3. Verificación final

| Qué probar | Resultado esperado |
|---|---|
| `https://arca.santodomingo.cl/api/health` | `{"status":"ok","db":"connected"}` |
| `https://arca.santodomingo.cl/api/residuos/catalogo` | Lista de residuos en JSON |
| `https://arca.santodomingo.cl/api/sesion` sin haber iniciado sesión | `401` en JSON |
| `https://arca.santodomingo.cl/api/no-existe` | `404` en JSON (`Cannot GET ...`), no una página de error del servidor |
| `https://arca.santodomingo.cl`, navegar a `/login` y recargar (F5) | Carga la app, sin 404 |
| Recargar en `https://arca.santodomingo.cl/admin` sin sesión | Carga la app y lleva a `/login` |
| Con credenciales de ClaveÚnica: entrar como vecino | Queda en la app del vecino; no puede abrir `/admin` |
| Con credenciales de ClaveÚnica: entrar como funcionario | Puede elegir "Modo funcionario" y abrir el panel en `/admin` |
| Si existía: `https://arcapanel.santodomingo.cl` | Redirige a `https://arca.santodomingo.cl/admin` |

---

## 4. Actualizar a una versión nueva

1. El equipo entrega los zips nuevos (Parte 1). Una versión nueva puede traer migraciones o
   dependencias adicionales, por eso el paso 4 no se puede saltar.
2. Detener la aplicación en "Setup Node.js App".
3. En `~/api`, reemplazar `dist/` y `package.json`. **No tocar `.env.local`.**
4. En la Terminal (con el comando del entorno virtual):
   - `npm install --omit=dev` si cambió `package.json`.
   - `npm run migration:run`.
5. **Restart** de la aplicación y verificar `/api/health`.
6. Frontend: reemplazar los archivos de la raíz, **conservando `.htaccess`**.

---

## 5. Si algo no funciona

Primero revisar el registro de la aplicación (`~/api/stderr.log`, o el archivo de log definido
en "Setup Node.js App"): los errores de arranque quedan ahí. **Antes de compartir ese archivo,
revisar que no traiga contraseñas.**

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| **Cualquier** `/api/...` (incluso una ruta que no existe) responde una página `500 Internal Server Error` | La aplicación Node no arrancó o se cae al iniciar | Leer `~/api/stderr.log`; revisar las filas siguientes |
| `ALLOW_DEV_LOGIN=true no está permitido con NODE_ENV=production` | Se copió `ALLOW_DEV_LOGIN` a `.env.local` | Borrar esa línea y reiniciar |
| Error de sintaxis o `Unsupported engine` al iniciar | Node.js menor a 22.12 | Cambiar la versión en "Setup Node.js App" |
| `Cannot find module .../dist/main.js` | Startup file mal escrito o `dist/` no quedó en la raíz de la app | Verificar que exista `~/api/dist/main.js` |
| `Cannot find module '@nestjs/...'` | Faltó `npm install --omit=dev` | Repetir 2.2 d |
| `Unable to connect to the database` / `Access denied` | No existe `.env.local`, se llama `.env`, o usuario/contraseña/base incorrectos | Revisar 2.2 c; el usuario lleva prefijo `santod85_` |
| `/api/health` responde `404` de NestJS (`Cannot GET ...`) | La ruta que llega a la app no coincide | Confirmar que "Application URL" termine en `/api` |
| `/api/health` responde la página del frontend | La petición no llega a la app Node | Revisar que el `.htaccess` conserve el bloque de Passenger y que la regla de 2.3 excluya `/api` |
| `Table ... doesn't exist` | No se corrieron las migraciones | 2.2 d |
| Recargar en `/login` o `/admin` da 404 | Falta la regla del `.htaccess` | 2.3 paso 4 |
| Se inicia sesión con ClaveÚnica pero se vuelve al login | La cookie no se guarda: el sitio no está en HTTPS | Activar HTTPS en el dominio |
| Error de CORS en la consola del navegador | `FRONTEND_URL` no coincide con el dominio | Debe ser `https://arca.santodomingo.cl` exacto, sin `/` al final |
| `429 Demasiadas solicitudes` a muchas personas a la vez | El límite de consultas agrupa a todos en una IP | Ver §6, Cloudflare |
| Botón ClaveÚnica responde error; en el log `Falta la variable de entorno CLAVE_UNICA_CLIENT_ID` | Faltan `CLAVE_UNICA_CLIENT_ID` / `CLIENT_SECRET` | Completarlas cuando lleguen las credenciales. El resto de la API sigue funcionando |

---

## 6. Seguridad

- `.env.local` con permisos **600**, fuera de `public_html`, nunca subido al repositorio.
- `NODE_ENV=production` siempre en el servidor, y **nunca** `ALLOW_DEV_LOGIN`.
- Respaldar `CLAVE_UNICA_PEPPER` junto con las credenciales de ClaveÚnica.
- **Usuarios de prueba:** tres migraciones (`seed-operador-demo`, `seed-admin-demo`,
  `seed-operadores-prueba`) insertan usuarios de demostración con identificadores fijos. En
  producción no se puede entrar con ellos (solo se entra por ClaveÚnica), pero **deben
  eliminarse antes de la puesta en marcha real**, con una migración nueva — pendiente del equipo.
- Respaldos periódicos de `santod85_arca_db` (cPanel → Copia de seguridad).
- **Cloudflare y el límite de consultas.** El sitio pasa por Cloudflare (se ve en las páginas
  de error del servidor). La API limita las consultas por IP; si el servidor no le entrega la
  IP real del visitante, verá las IP de Cloudflare y podría bloquear a muchos vecinos a la vez.
  Para comprobarlo después de instalar: abrir el sitio desde un teléfono con datos móviles,
  buscar la IP pública de ese teléfono (por ejemplo, en una página tipo "cuál es mi IP") y
  revisar en cPanel → **Métricas → Visitantes** (o "Registros de acceso sin procesar") qué IP
  quedó registrada para esa visita. Si aparece la IP del teléfono, está bien. Si aparece otra
  (de Cloudflare, que suelen empezar con `104.`, `162.158.` o `172.64.`–`172.71.`), avisar al
  equipo: hay que ajustar cómo la API obtiene la IP. Hasta que se confirme, este punto queda
  pendiente de decisión del encargado de seguridad.
