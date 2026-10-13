# Guía de despliegue en cPanel — A.R.C.A.

Cómo publicar A.R.C.A. en el servidor municipal administrado con cPanel. Está escrita para quien
administra el servidor: la **Parte 1** la prepara el equipo COM Tech en un computador con el
repositorio y entrega dos archivos `.zip`; la **Parte 2** se hace en el cPanel.

> **Versión que se despliega:** `develop` en `864991c` (13-10-2026). Es la versión para la
> **certificación de ClaveÚnica**: trae el botón oficial v2.0, la vuelta de ClaveÚnica por la
> raíz del sitio (la dirección registrada) y el cierre de sesión que exige el manual. Además suma
> el Marketplace con fotos, la accesibilidad y el panel municipal usable desde el celular.
> Si el servidor tiene la versión anterior (`2eb03dd`), se actualiza con el procedimiento de §4.
> Si tiene la estructura de dos apps (subdominio del panel y una segunda API), la sección **2.4**
> explica cómo desmontarla.

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

**ClaveÚnica:** la Redirect URI registrada en CeroFilas (solicitud N° 38844002) es la **raíz
del sitio**, `https://arca.santodomingo.cl/`, y la Logout URI `https://arca.santodomingo.cl/login`.
ClaveÚnica devuelve a la persona a la raíz; el `index.html` del frontend reenvía ese retorno a
la API (`/api/auth/clave-unica/callback`), que valida y crea la sesión. Por eso
`CLAVE_UNICA_REDIRECT_URI` (2.2 c) tiene que ser **exactamente** la raíz, con la barra final: si
no coincide carácter por carácter con la registrada, ClaveÚnica rechaza el ingreso.

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
CLAVE_UNICA_REDIRECT_URI=https://arca.santodomingo.cl/
CLAVE_UNICA_LOGOUT_REDIRECT_URI=https://arca.santodomingo.cl/login
CLAVE_UNICA_PEPPER=<ver abajo>
```

- **No agregar `ALLOW_DEV_LOGIN`.** Si aparece con `NODE_ENV=production`, la API no arranca (§1).
- `PORT` no se define: lo asigna cPanel.
- `TRUST_PROXY=loopback` permite que la API vea la IP real de cada visitante detrás del proxy
  del servidor, para el límite de consultas. **No poner `true`**: cualquiera podría inventar su
  IP y saltarse el límite. Si la prueba de §6 lo indica, se le agregan los rangos de Cloudflare.
- `CLAVE_UNICA_PEPPER` se genera **una sola vez** con
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y se **respalda en
  un lugar seguro**. Si se pierde o se cambia, ningún vecino vuelve a ser reconocido y todos
  pierden su historial. Si ya existe de una instalación anterior, **no cambiarlo**.
- `CLAVE_UNICA_REDIRECT_URI` es la raíz **con la barra final** (§1). No es la ruta `/api/...`.
- **Credenciales:** Gobierno Digital entregó tres pares (sandbox, QA y producción). Para probar
  y certificar se usan las de **QA**; las de producción no funcionan hasta que la integración
  quede certificada y se pida su activación a la Mesa de Servicio. Al activarlas, se cambian
  `CLIENT_ID` y `CLIENT_SECRET` y se reinicia la aplicación; **el pepper no se cambia**.
- Mientras no estén las credenciales de ClaveÚnica, `CLIENT_ID` y `CLIENT_SECRET` pueden quedar
  vacías: la API arranca igual, y solo el botón de ClaveÚnica responde error.
- **Fotos del Marketplace:** se guardan en `~/api/uploads/`, fuera de `public_html`, y solo se
  entregan por la API con sesión. No hace falta configurar nada (`UPLOADS_DIR` vacío).
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

Son **13** migraciones (la versión `2eb03dd` tenía 12; la nueva crea las tablas del
Marketplace y los Circular Credits). Si ya se habían corrido, `migration:run` solo aplica las
que falten. `migration:show` debe mostrar las 13 con `[X]`.

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
| Página de inicio (`/login`) | Solo el botón oficial «Iniciar sesión» de ClaveÚnica; **no** aparecen botones "(dev)" |
| Con credenciales de ClaveÚnica: entrar como vecino | Vuelve a `arca.santodomingo.cl/`, pasa solo a `/inicio` (app del vecino) y no puede abrir `/admin` |
| Con credenciales de ClaveÚnica: entrar como funcionario o administrador (§7) | Ve la pantalla para elegir el modo y puede abrir el panel en `/admin` |
| Botón **Salir** | Cierra la sesión de A.R.C.A. **y la de ClaveÚnica**, y vuelve a `/login` |
| Ingreso que no se completa (por ejemplo, cancelar en ClaveÚnica) | Vuelve a `/login` con el aviso «No pudimos completar tu ingreso con ClaveÚnica» |
| Si existía: `https://arcapanel.santodomingo.cl` | Redirige a `https://arca.santodomingo.cl/admin` |

---

## 4. Actualizar a una versión nueva

1. El equipo entrega los zips nuevos (Parte 1). Una versión nueva puede traer migraciones o
   dependencias adicionales, por eso el paso 4 no se puede saltar.
2. Detener la aplicación en "Setup Node.js App".
3. En `~/api`, reemplazar `dist/` y `package.json`. **No tocar `.env.local` ni `uploads/`**
   (ahí están las fotos que subieron los vecinos).
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
- **La base de datos es la llave de los roles** (§7): quien puede escribir en
  `usuarios_administradores` puede darse acceso al panel. Por eso:
  - MySQL **sin acceso remoto** (cPanel → "MySQL remoto" sin hosts agregados): la API se conecta
    por `localhost` y nadie más necesita entrar desde fuera.
  - El usuario y la contraseña de la base solo en `~/api/.env.local`; contraseña larga y única.
  - El acceso a cPanel y phpMyAdmin, solo para TI municipal, con segundo factor si cPanel lo
    ofrece.
  - Respaldos periódicos y revisar de vez en cuando la lista de funcionarios (§7, consulta
    final).
- **Usuarios de prueba:** tres migraciones (`seed-operador-demo`, `seed-admin-demo`,
  `seed-operadores-prueba`) insertan usuarios de demostración con identificadores fijos. En
  producción no se puede entrar con ellos (solo se entra por ClaveÚnica), pero **deben
  eliminarse antes de la puesta en marcha real**, con una migración nueva — pendiente del equipo.
- Respaldos periódicos de `santod85_arca_db` (cPanel → Copia de seguridad).
- **Cloudflare y el límite de consultas.** La API limita las consultas por IP de cada
  visitante. El sitio pasa por Cloudflare (se ve en las páginas de error del servidor), y si
  la API recibe la IP de Cloudflare en vez de la del visitante, podría bloquear a muchos
  vecinos a la vez. **Prueba, después de instalar:**

  1. Desde un teléfono con datos móviles, abrir
     `https://arca.santodomingo.cl/api/auth/clave-unica/login` **11 veces seguidas** (el límite
     del login es 10 por minuto; la 11.ª debe mostrar "Demasiadas solicitudes").
  2. **Inmediatamente después**, abrir la misma dirección desde un computador en otra red (por
     ejemplo, el wifi de la municipalidad).
  3. Si el computador **no** recibe "Demasiadas solicitudes", está bien: cada visitante cuenta
     por separado. No hay que hacer nada más.
  4. Si el computador **también** lo recibe, la API está viendo la IP de Cloudflare. Reemplazar
     la línea `TRUST_PROXY` de `~/api/.env.local` por esta (una sola línea; son los rangos
     oficiales de Cloudflare, publicados en `https://www.cloudflare.com/ips/`):

     ```
     TRUST_PROXY=loopback, 173.245.48.0/20, 103.21.244.0/22, 103.22.200.0/22, 103.31.4.0/22, 141.101.64.0/18, 108.162.192.0/18, 190.93.240.0/20, 188.114.96.0/20, 197.234.240.0/22, 198.41.128.0/17, 162.158.0.0/15, 104.16.0.0/13, 104.24.0.0/14, 172.64.0.0/13, 131.0.72.0/22, 2400:cb00::/32, 2606:4700::/32, 2803:f800::/32, 2405:b500::/32, 2405:8100::/32, 2a06:98c0::/29, 2c0f:f248::/32
     ```

     Reiniciar la aplicación, esperar un minuto y repetir la prueba. Si sigue fallando, avisar
     al equipo.

  Solo se confía en esos rangos: un visitante no puede inventar su IP enviando la cabecera
  `X-Forwarded-For` por su cuenta. La conexión interna del servidor (Passenger) ya se reconoce
  sola desde la versión `2eb03dd`.

---

## 7. Asignar funcionarios y administradores

A.R.C.A. **no tiene una pantalla para dar roles**, a propósito: si existiera, una falla en la
app podría permitir que alguien se diera acceso al panel. Los roles se asignan directamente en
la base de datos, y lo hace **solo el equipo de TI municipal** desde cPanel. Ninguna ruta de la
API permite cambiar un rol.

| Rol | Qué ve |
|---|---|
| (sin fila en `usuarios_administradores`) | Vecino: solo la app ciudadana |
| `funcionario` | Elige entre la app del vecino y el panel: revisión de solicitudes, métricas, mapa, derivación |
| `admin` | Lo mismo que el funcionario, más el registro de **auditoría** |

**Requisito:** la persona tiene que haber entrado **una vez** con ClaveÚnica. Ese primer
ingreso crea su cuenta (`usuarios_ciudadanos`); recién entonces se le puede dar un rol.

### 7.1 Encontrar la cuenta de la persona

A.R.C.A. **no guarda el RUN**: guarda una huella calculada con el RUN y el pepper
(`clave_unica_id`). Para encontrar la cuenta se calcula esa huella en la Terminal, con el
comando del entorno virtual (2.2 d), desde `~/api`. Reemplazar `12345678-K` por el RUN de la
persona: **sin puntos, con guion y con el dígito verificador en mayúscula**.

```bash
CLAVE_UNICA_PEPPER="$(grep '^CLAVE_UNICA_PEPPER=' .env.local | cut -d= -f2-)" \
  node -e "console.log(require('crypto').createHmac('sha256', process.env.CLAVE_UNICA_PEPPER).update(process.argv[1]).digest('hex'))" 12345678-K
history -c
```

El resultado es un texto de 64 caracteres (la huella). `history -c` borra el RUN del
historial de la Terminal.

### 7.2 Dar el rol

En phpMyAdmin (cPanel → phpMyAdmin → `santod85_arca_db` → SQL):

```sql
-- 1. El id de la cuenta (pegar la huella del paso 7.1)
SELECT id FROM usuarios_ciudadanos WHERE clave_unica_id = '<huella>';

-- 2. Darle el rol: 'funcionario' o 'admin'
INSERT INTO usuarios_administradores
  (id, usuario_ciudadano_id, nombre, apellido, email_institucional,
   telefono_institucional, rol, cargo, fecha_ingreso, activo)
VALUES
  (UUID(), '<id del paso 1>', 'Nombre', 'Apellido', 'nombre.apellido@santodomingo.cl',
   NULL, 'funcionario', 'Cargo', NOW(), 1);
```

Si el `SELECT` no devuelve nada, la persona todavía no ha entrado con ClaveÚnica o el RUN se
escribió con otro formato.

### 7.3 Cambiar o quitar un rol

```sql
-- Cambiar de funcionario a administrador (o al revés)
UPDATE usuarios_administradores SET rol = 'admin'
 WHERE email_institucional = 'nombre.apellido@santodomingo.cl';

-- Quitar el acceso al panel (no se borra: queda el registro de quién fue funcionario)
UPDATE usuarios_administradores SET activo = 0
 WHERE email_institucional = 'nombre.apellido@santodomingo.cl';

-- Revisar quiénes tienen acceso al panel
SELECT nombre, apellido, email_institucional, rol, cargo, activo
  FROM usuarios_administradores ORDER BY activo DESC, rol;
```

El cambio rige **en la siguiente acción** de la persona, sin esperar a que cierre sesión: la API
consulta el rol en cada petición. Con `activo = 0`, la persona sigue entrando, pero como vecino.

**Antes de la puesta en marcha real**, quitar el acceso a las cuentas de demostración que crean
las migraciones (§6, usuarios de prueba).
