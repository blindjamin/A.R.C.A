# Guía de despliegue en cPanel — A.R.C.A.

Cómo publicar A.R.C.A. en el servidor municipal administrado con cPanel. Está escrita para quien
administra el servidor: la **Parte 1** la prepara el equipo COM Tech en un computador con el
repositorio y entrega dos archivos `.zip`; la **Parte 2** se hace en el cPanel.

> **Versión que se despliega:** paquete del **10-11-2026**, `develop` en `8287e12` (incluye
> hasta el PR #179). Suma, respecto de la versión de octubre (`864991c`): pago del retiro con
> **Webpay Plus**, denuncias y bloqueo de vecinos en el Marketplace, Circular Credits con cifras
> reales, reporte de gestión por fechas con exportación CSV, correo verificado del vecino, baja
> voluntaria, manuales de uso y el panel de Métricas renovado.
>
> **Antes de instalar, revisar los cuatro cambios que piden acción en el servidor:**
> 1. Variables nuevas de **Webpay** en `.env.local`: sin `WEBPAY_ENV` la API no arranca (2.2 c).
> 2. Ahora son **26** migraciones (2.2 d).
> 3. Desactivar las **cuentas de demostración** con `desactivar-cuentas-demo.sql` (§7.4).
> 4. **Feria de Software (13-11-2026):** se usa una **base de datos de prueba** aparte, con
>    límites por IP más altos y las fotos en otra carpeta. Después de la feria se borra todo y se
>    vuelve a la base definitiva. Pasos en el **§8**.
>
> Si el servidor tiene una versión anterior, se actualiza con el procedimiento de §4.
> Si tiene la estructura de dos apps (subdominio del panel y una segunda API), la sección **2.4**
> explica cómo desmontarla.

---

## 0. Qué va dónde

| Pieza | Qué es | Dirección pública | Carpeta en el servidor |
|---|---|---|---|
| Frontend | Archivos estáticos (HTML/JS/CSS). Incluye la app del vecino y el panel municipal en `/admin` | `https://arca.santodomingo.cl` | Raíz de documentos del dominio (cPanel → Dominios) |
| API | Aplicación Node.js (NestJS) | `https://arca.santodomingo.cl/api` | `~/api` |
| Base de datos | MySQL / MariaDB | — | `<cuenta>_arca_db` |

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
- Base `<cuenta>_arca_db` con un usuario MySQL que tenga **todos los privilegios** sobre ella
  (cPanel → Bases de datos MySQL → "Agregar usuario a la base de datos"). El usuario lleva el
  prefijo `<cuenta>_`.

> `<cuenta>` es el nombre de la cuenta cPanel de la Municipalidad, que cPanel antepone a las bases
> y usuarios MySQL. Lo entrega TI municipal y **no se escribe en el repositorio**, que es público.
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

Solo verificar que el usuario MySQL tenga todos los privilegios sobre `<cuenta>_arca_db`. Las
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
DB_USERNAME=<cuenta>_<usuario>
DB_PASSWORD=<contraseña>
DB_DATABASE=<cuenta>_arca_db

NODE_ENV=production
FRONTEND_URL=https://arca.santodomingo.cl
TRUST_PROXY=loopback

MAIL_USER=<cuenta de correo emisora>
MAIL_PASS=<contraseña de aplicación>
MAIL_FROM=A.R.C.A. Santo Domingo <cuenta de correo emisora>

# Opcionales. Pisos: 120, 10, 90, 30 y 10 por minuto. Un número menor se ignora.
# En la Feria se suben (valores en el §8) y después se borran estas líneas.
# LIMITE_IP_GENERAL=120
# LIMITE_IP_LOGIN=10
# LIMITE_IP_UBICACION=90
# LIMITE_IP_CHAT=30
# LIMITE_IP_CORREO=10

CLAVE_UNICA_CLIENT_ID=<entregado por Gobierno Digital>
CLAVE_UNICA_CLIENT_SECRET=<entregado por Gobierno Digital>
CLAVE_UNICA_REDIRECT_URI=https://arca.santodomingo.cl/
CLAVE_UNICA_LOGOUT_REDIRECT_URI=https://arca.santodomingo.cl/login
CLAVE_UNICA_PEPPER=<ver abajo>

# Opcionales: avisos push del chat (ver abajo)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:<correo de contacto>

# Obligatorias: pago del retiro con Webpay Plus (ver abajo)
WEBPAY_ENV=integration
WEBPAY_RETURN_URL=https://arca.santodomingo.cl/api/pagos/retorno
# Solo con WEBPAY_ENV=production (los entrega Transbank a la Municipalidad):
# WEBPAY_COMMERCE_CODE=
# WEBPAY_API_KEY=
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
  En otra municipalidad se genera **uno nuevo**: nunca se copia el de Santo Domingo
  (ver [`SEGURIDAD_ARQUITECTURA.md` §3.6](SEGURIDAD_ARQUITECTURA.md)).
- `CLAVE_UNICA_REDIRECT_URI` es la raíz **con la barra final** (§1). No es la ruta `/api/...`.
- **Credenciales:** Gobierno Digital entregó tres pares (sandbox, QA y producción). Para probar
  y certificar se usan las de **QA**; las de producción no funcionan hasta que la integración
  quede certificada y se pida su activación a la Mesa de Servicio. Al activarlas, se cambian
  `CLIENT_ID` y `CLIENT_SECRET` y se reinicia la aplicación; **el pepper no se cambia**.
- Mientras no estén las credenciales de ClaveÚnica, `CLIENT_ID` y `CLIENT_SECRET` pueden quedar
  vacías: la API arranca igual, y solo el botón de ClaveÚnica responde error.
- **Avisos push del chat (opcionales).** Sin las tres variables `VAPID_*` la API arranca igual y
  el chat funciona, pero no llegan avisos al celular cuando la app está cerrada (el log dice
  «Notificaciones push deshabilitadas»). Para activarlos, generar el par **una sola vez** con
  `npx web-push generate-vapid-keys` (desde el repositorio, o en la Terminal de cPanel con
  `npx` tras `npm install`), copiar la clave pública y la privada a `VAPID_PUBLIC_KEY` y
  `VAPID_PRIVATE_KEY`, y poner en `VAPID_SUBJECT` un `mailto:` o una URL `https:` de contacto.
  Si se cambian, todos los dispositivos dejan de recibir avisos hasta volver a suscribirse.
  Respaldar la clave privada como el pepper.
- **Webpay Plus (pago del retiro).** Con `NODE_ENV=production`, **la API no arranca sin
  `WEBPAY_ENV`** (el log dice «WEBPAY_ENV es obligatorio con NODE_ENV=production»). Es a
  propósito: sin la variable se usarían las credenciales públicas de prueba y se marcarían
  solicitudes como pagadas sin cobro real.
  - `integration`: ambiente de **prueba** de Transbank. Los pagos se hacen con tarjetas de
    prueba y **no se cobra dinero**. Sirve para la feria y para probar el flujo completo.
  - `production`: cobro real. Exige `WEBPAY_COMMERCE_CODE` y `WEBPAY_API_KEY`, que Transbank
    entrega a la Municipalidad al afiliar el comercio. Respaldarlos como el pepper.
  - `WEBPAY_RETURN_URL` es la dirección a la que Transbank devuelve al vecino después de pagar.
    En producción es obligatoria y tiene que ser `https`.
- **Correo:** con `NODE_ENV=production`, si falta `MAIL_PASS` la API arranca, pero pedir un
  código de verificación de correo responde error (en los computadores del equipo, el código
  se muestra en pantalla; en el servidor no). `MAIL_PASS` es una **contraseña de aplicación**
  de la cuenta emisora, no su contraseña normal.
- **Fotos del Marketplace:** se guardan en `~/api/uploads/`, fuera de `public_html`, y solo se
  entregan por la API con sesión. No hace falta configurar nada (`UPLOADS_DIR` vacío).
- Permisos del archivo: **600** (Administrador de archivos → Permisos).

Las variables también se pueden cargar en el formulario de "Setup Node.js App", pero las
**migraciones** (paso d) solo leen `.env.local`; por eso se recomienda el archivo.

**d) Instalar dependencias y crear las tablas.** En la parte superior de la página de la
aplicación, cPanel muestra un comando para "entrar al entorno virtual", con la forma
`source /home/<cuenta>/nodevenv/api/<versión>/bin/activate && cd /home/<cuenta>/api`. Copiarlo,
pegarlo en la **Terminal** y luego:

```bash
npm install --omit=dev
npm run migration:run
npm run migration:show
```

Son **26** migraciones (la versión de octubre, `864991c`, tenía 18). Si ya se habían corrido,
`migration:run` solo aplica las que falten. `migration:show` debe mostrar las 26 con `[X]`.

Las 8 nuevas de esta versión, en orden:

| Migración | Qué hace |
|---|---|
| `PagosWebpay1782165000000` | Crea `pagos_webpay`: el comprobante de cada intento de pago |
| `BajaCiudadano1782165100000` | Agrega `fecha_baja` a `usuarios_ciudadanos` (baja voluntaria del vecino) |
| `ModeracionMarketResiduoOtro1782165200000` | Moderación municipal del Marketplace y residuos fuera del catálogo escritos por el vecino |
| `CreditosArticulosMarketplace1782165300000` | Agrega `creditos` a `articulos_marketplace` |
| `ObjetosSolicitudRetiro1782165400000` | Crea `objetos_solicitud_retiro` (varios objetos por solicitud); cada solicitud existente queda con su objeto |
| `Denuncias1782165500000` | Crea `denuncias` (denuncias entre vecinos del Marketplace) |
| `BloqueosCiudadano1782165600000` | Crea `bloqueos_ciudadano` (historial de bloqueos y desbloqueos) |
| `CorreoContacto1782165700000` | Agrega `email` a `contacto_ciudadano` (correo verificado del vecino) |

Ninguna borra datos de vecinos. Como siempre, **respaldar la base antes** (cPanel → Copia de
seguridad).

La del chat (`ChatMarketplace1782164700000`) agrega `interesado_id` a `mensajes_marketplace` y
crea `suscripciones_push`. Completa las filas sembradas y borra las que no tienen interlocutor.
La siguiente (`InteresReservaMarketplace1782164800000`) crea `interesados_marketplace` y agrega a los artículos el código de entrega, los intentos y la fecha de reserva; a las conversaciones que ya existían les crea su interés.
La última (`Notificaciones1782164900000`) crea la tabla `notificaciones` de la campanita.

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
| Vecino con una solicitud aprobada → **Pagar retiro** | Lleva al formulario de Webpay; al terminar, vuelve a `arca.santodomingo.cl/pago/...` con el resultado. Con `WEBPAY_ENV=integration` se paga con las tarjetas de prueba de Transbank |
| `https://arca.santodomingo.cl/ayuda` | Aparecen los enlaces a los manuales de vecinos y funcionarios, y sus capturas cargan |
| Después de §7.4: consulta de revisión del SQL | Las siete cuentas de demostración con `activo = 0` |
| Si existía: `https://arcapanel.santodomingo.cl` | Redirige a `https://arca.santodomingo.cl/admin` |

---

## 4. Actualizar a una versión nueva

1. El equipo entrega los zips nuevos (Parte 1). Una versión nueva puede traer migraciones o
   dependencias adicionales, por eso el paso 4 no se puede saltar.
2. **Respaldar la base** (cPanel → Copia de seguridad) y detener la aplicación en
   "Setup Node.js App".
3. En `~/api`, reemplazar `dist/` y `package.json`. **No tocar `.env.local` ni `uploads/`**
   (ahí están las fotos que subieron los vecinos).
4. Revisar `~/api/.env.local` contra la lista de 2.2 c y agregar las variables nuevas de la
   versión. **En la del 10-11-2026: las de Webpay**, sin las cuales la API no arranca.
5. En la Terminal (con el comando del entorno virtual):
   - `npm install --omit=dev` si cambió `package.json` (en la versión del 10-11-2026, sí).
   - `npm run migration:run` y `npm run migration:show` (26 con `[X]`).
6. **Restart** de la aplicación y verificar `/api/health`.
7. Frontend: reemplazar los archivos de la raíz, **conservando `.htaccess`**.
8. Si la versión trae `desactivar-cuentas-demo.sql` y aún no se ha corrido, correrlo (§7.4).

---

### 4.1 Chat en tiempo real (WebSocket)

El chat del Marketplace usa socket.io en la ruta **`/api/socket.io`** (bajo `/api` para que viaje
la cookie de sesión). Para que los mensajes lleguen al instante:

- **Un solo proceso de Node.** Los avisos se envían a los sockets conectados en el mismo
  proceso, igual que el límite de consultas, que cuenta en memoria. Si Passenger levanta
  varios procesos, un mensaje puede no llegar al otro participante hasta que recargue. El
  número de procesos no se fija desde `.htaccess`: lo confirma TI municipal.
- **WAF y Cloudflare.** La excepción pedida originalmente fue para `/socket.io/*` y `/ws/*`;
  hace falta que cubra también **`/api/socket.io/*`** y que permita el *upgrade* a WebSocket.
- **Si no se puede cumplir alguna de las dos,** el chat sigue funcionando por REST (enviar y leer
  mensajes, y los contadores al recargar), pero sin tiempo real fiable.

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
| `Unable to connect to the database` / `Access denied` | No existe `.env.local`, se llama `.env`, o usuario/contraseña/base incorrectos | Revisar 2.2 c; el usuario lleva prefijo `<cuenta>_` |
| `/api/health` responde `404` de NestJS (`Cannot GET ...`) | La ruta que llega a la app no coincide | Confirmar que "Application URL" termine en `/api` |
| `/api/health` responde la página del frontend | La petición no llega a la app Node | Revisar que el `.htaccess` conserve el bloque de Passenger y que la regla de 2.3 excluya `/api` |
| `Table ... doesn't exist` | No se corrieron las migraciones | 2.2 d |
| Recargar en `/login` o `/admin` da 404 | Falta la regla del `.htaccess` | 2.3 paso 4 |
| Se inicia sesión con ClaveÚnica pero se vuelve al login | La cookie no se guarda: el sitio no está en HTTPS | Activar HTTPS en el dominio |
| Error de CORS en la consola del navegador | `FRONTEND_URL` no coincide con el dominio | Debe ser `https://arca.santodomingo.cl` exacto, sin `/` al final |
| `429 Demasiadas solicitudes` a muchas personas a la vez | El límite de consultas agrupa a todos en una IP | Ver §6, Cloudflare |
| En el chat, los mensajes solo llegan al recargar | El WebSocket no conecta (WAF o Cloudflare lo bloquean en `/api/socket.io/*`) o Passenger corre más de un proceso | Ver 4.1. En las herramientas del navegador (Red), `/api/socket.io/` no debe quedar en rojo |
| El chat funciona pero no llegan avisos al celular | Faltan las variables `VAPID_*` (2.2 c) o el navegador no dio permiso de notificaciones | Revisar el log: «Notificaciones push deshabilitadas» |
| `WEBPAY_ENV es obligatorio con NODE_ENV=production` o `WEBPAY_ENV debe ser integration o production` | Falta `WEBPAY_ENV` en `.env.local` o tiene otro valor | Agregarla (2.2 c) y reiniciar |
| Al pagar, Webpay responde error o no vuelve a la app | `WEBPAY_RETURN_URL` mal escrita, sin `https`, o código y llave que no corresponden al ambiente | Revisar 2.2 c: con `production` van el código y la llave de la Municipalidad |
| Pedir un código de verificación de correo responde «No pudimos enviar el código» | Falta `MAIL_PASS` o no es una contraseña de aplicación válida | Revisar 2.2 c y el log (`Error enviando código de verificación`) |
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
  producción no se puede entrar con ellos (solo se entra por ClaveÚnica), pero **se
  desactivan al instalar** con `desactivar-cuentas-demo.sql`, que viene junto a los zips (§7.4).
- Respaldos periódicos de `<cuenta>_arca_db` (cPanel → Copia de seguridad).
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

En phpMyAdmin (cPanel → phpMyAdmin → `<cuenta>_arca_db` → SQL):

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

### 7.4 Desactivar las cuentas de demostración

**Una vez, al instalar la versión del 10-11-2026** (después de las migraciones), en phpMyAdmin →
SQL. El mismo bloque viene como `desactivar-cuentas-demo.sql` junto a los zips. Desactiva las siete cuentas que crean las migraciones (el vecino de desarrollo, Camila, Carlos
y los operadores de prueba) y cierra sus sesiones.

Se desactivan y no se borran: tienen historial (solicitudes, revisiones, lotes) y entradas en la
auditoría, que no se toca. Con `activo = 0` la cuenta ya no puede iniciar sesión, y una sesión
abierta deja de valer en la siguiente acción. El cambio queda en la auditoría con actor `sistema`.

```sql
START TRANSACTION;

-- Las cuentas demo se reconocen por su clave_unica_id inventado; las reales
-- guardan una huella de 64 caracteres y nunca calzan con este filtro.
CREATE TEMPORARY TABLE cuentas_demo AS
  SELECT id FROM usuarios_ciudadanos
   WHERE clave_unica_id LIKE 'demo-%' OR clave_unica_id = 'dev-claveunica-test';

UPDATE usuarios_ciudadanos c JOIN cuentas_demo d ON d.id = c.id
   SET c.activo = 0;
UPDATE usuarios_administradores a JOIN cuentas_demo d ON d.id = a.usuario_ciudadano_id
   SET a.activo = 0;
UPDATE sesiones_ciudadano s JOIN cuentas_demo d ON d.id = s.usuario_ciudadano_id
   SET s.activa = 0;
UPDATE sesiones_administrador s
  JOIN usuarios_administradores a ON a.id = s.usuario_administrador_id
  JOIN cuentas_demo d ON d.id = a.usuario_ciudadano_id
   SET s.activa = 0;

INSERT INTO auditoria (tipo_actor, entidad, accion, datos_nuevos, user_agent, fecha_accion)
SELECT 'sistema', 'usuarios_ciudadanos', 'UPDATE',
       JSON_OBJECT('activo', false, 'cuentas_demo', JSON_ARRAYAGG(id)),
       'desactivar cuentas demo', UTC_TIMESTAMP()
  FROM cuentas_demo;

COMMIT;

-- Revisar: las siete deben quedar con activo y activo_panel en 0
SELECT c.id, c.clave_unica_id, c.activo, a.nombre, a.rol, a.activo AS activo_panel
  FROM usuarios_ciudadanos c
  LEFT JOIN usuarios_administradores a ON a.usuario_ciudadano_id = c.id
 WHERE c.clave_unica_id LIKE 'demo-%' OR c.clave_unica_id = 'dev-claveunica-test';
```

Para deshacerlo, el mismo bloque con `SET c.activo = 1` y `SET a.activo = 1`, sin los dos
`UPDATE` de sesiones, y `'reactivar cuentas demo'` en el `INSERT`.

No es una migración a propósito: una migración correría también en la base de cada integrante
y apagaría los botones de desarrollo (Vecino, Funcionario y Admin entran con estas cuentas) y
la demo de la feria.

---

## 8. Feria de Software (13-11-2026): base de prueba

Para la feria, A.R.C.A. corre sobre una **base de datos aparte**, para que lo que hagan los
visitantes (cuentas, solicitudes, fotos, pagos de prueba) no quede mezclado con la base
definitiva. Después de la feria se borra todo y la aplicación vuelve a la base definitiva. El
**pepper es el mismo** en las dos bases y **no se cambia** en ningún paso.

### 8.1 Antes de la feria

1. **Respaldar** la base definitiva (cPanel → Copia de seguridad) y descargar una copia de
   `~/api/.env.local`.
2. cPanel → **Bases de datos MySQL**:
   - Crear la base `<cuenta>_arca_feria`.
   - En «Añadir usuario a la base de datos», agregar el **mismo usuario** de `DB_USERNAME` a
     `<cuenta>_arca_feria`, con **todos los privilegios**.
3. Instalar los archivos de esta versión con el §4 (pasos 1 a 4: detener la aplicación,
   reemplazar `dist/` y `package.json`, y agregar las variables de Webpay).
4. En `~/api/.env.local`, cambiar o agregar estas dos líneas. **No tocar las demás**, y menos
   `CLAVE_UNICA_PEPPER`:

   ```
   DB_DATABASE=<cuenta>_arca_feria
   UPLOADS_DIR=uploads-feria
   ```

   `UPLOADS_DIR` deja las fotos de la feria en `~/api/uploads-feria/`, separadas de
   `~/api/uploads/`, para borrarlas después sin riesgo.
5. En la Terminal (con el comando del entorno virtual): `npm install --omit=dev`,
   `npm run migration:run` y `npm run migration:show`. Tienen que aparecer las **26 con `[X]`**,
   ahora en la base de la feria.
6. phpMyAdmin → `<cuenta>_arca_feria` → SQL: correr `desactivar-cuentas-demo.sql` (§7.4).
7. **Restart** y revisar `https://arca.santodomingo.cl/api/health` →
   `{"status":"ok","db":"connected"}`.
8. Frontend: borrar los archivos anteriores de la raíz **excepto `.htaccess`** y extraer
   `frontend.zip` (2.3).
9. Hacer la **prueba de Cloudflare del §6** ahora, con los límites normales. Si la API ve la IP
   de Cloudflare, subir los límites no basta: primero hay que corregir `TRUST_PROXY`.
10. **Subir los límites por IP.** Los visitantes conectados al **mismo wifi** salen a internet
    con una sola IP, y la API los cuenta como una sola persona: con los valores normales (10
    ingresos por minuto) se bloquearían entre ellos. Con **datos móviles** cada celular suele
    tener su propia IP, aunque las compañías a veces agrupan a varios clientes en una. Agregar a
    `~/api/.env.local`:

    ```
    # Solo durante la Feria: borrar después (§8.3)
    LIMITE_IP_GENERAL=3000
    LIMITE_IP_LOGIN=150
    LIMITE_IP_UBICACION=1500
    LIMITE_IP_CHAT=300
    LIMITE_IP_CORREO=100
    ```

    Y hacer **Restart** (los límites se leen al arrancar). Si alguien igual ve «Demasiadas
    solicitudes», se pueden subir más y reiniciar. `LIMITE_IP_CORREO` importa: para pedir un
    retiro el vecino **tiene que verificar su correo**, y cada código se envía desde la cuenta de
    `MAIL_USER`. Revisar antes de la feria que esa cuenta envíe bien (pedir un código de prueba).
11. **Roles para la demo del panel:** las personas del equipo que muestren el panel entran
    **una vez** con ClaveÚnica y después se les da el rol con el §7, **en
    `<cuenta>_arca_feria`**. Los roles de esta base no pasan a la definitiva.
12. Verificación final con la tabla del §3. Los pagos se hacen con las tarjetas de prueba de
    Transbank (`WEBPAY_ENV=integration`): no se cobra dinero.

### 8.2 Si ClaveÚnica no está activa en producción

En el servidor solo se entra con ClaveÚnica. Si para el 12-11 Gobierno Digital no ha activado
las credenciales de producción, los visitantes no pueden entrar con su ClaveÚnica. En ese caso:

- La demo de la feria se hace en un computador del equipo, con la aplicación en local y el
  acceso de desarrollo (que en el servidor no existe).
- El servidor queda instalado igual, con esta versión. Cuando lleguen las credenciales se
  cambian `CLAVE_UNICA_CLIENT_ID` y `CLAVE_UNICA_CLIENT_SECRET` y se reinicia (2.2 c); el pepper
  no se cambia.
- Si no hubo visitantes en el servidor, el §8.3 se hace igual para volver a la base definitiva.

### 8.3 Después de la feria: volver a la base definitiva

1. Detener la aplicación en «Setup Node.js App».
2. En `~/api/.env.local`:
   - `DB_DATABASE=<cuenta>_arca_db` (la definitiva).
   - Borrar la línea `UPLOADS_DIR=uploads-feria`.
   - Borrar las cinco líneas `LIMITE_IP_*` de la feria.
   - **No cambiar `CLAVE_UNICA_PEPPER`** ni las demás variables.
3. En la Terminal: `npm run migration:run` y `npm run migration:show` → **26 con `[X]`**, ahora
   en la base definitiva.
4. phpMyAdmin → `<cuenta>_arca_db` → SQL: correr `desactivar-cuentas-demo.sql`, si no se había
   corrido en esa base.
5. **Restart** y revisar `/api/health` y la tabla del §3.
6. Dar los roles definitivos con el §7, en `<cuenta>_arca_db`.
7. **Borrar los datos de la feria:**
   - cPanel → Bases de datos MySQL → eliminar `<cuenta>_arca_feria`.
   - Administrador de archivos → eliminar la carpeta `~/api/uploads-feria/` completa.
   - Borrar las copias de `.env.local` descargadas en el paso 1 del §8.1.

   Esa base y esa carpeta tienen datos de los visitantes (huellas de ClaveÚnica, nombres, fotos,
   mensajes). Se borran completas: no se pasan a la base definitiva.
8. Avisar al equipo que el servidor ya está en la base definitiva.
