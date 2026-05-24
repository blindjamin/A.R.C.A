# 📋 A.R.C.A — Épicas e Historias de Usuario (v2.0)

> **Administración de Residuos y Colaboración Automatizada**
> 
> **Última actualización:** 23-Mayo-2026  
> **Versión:** 2.0 (Completa con EP-05 a EP-11)

---

## 🎯 LEYENDA DE ESTIMACIONES

- **S (Small):** 2-3 días | 3-5 puntos
- **M (Medium):** 4-5 días | 5-8 puntos
- **L (Large):** 6-8 días | 8-13 puntos
- **XL (Extra Large):** 9+ días | 13+ puntos

**Dependencias:** `BLOQUEANTE` / `Requiere` / `Relacionada`

---

# 📌 SPRINTS REORDENADOS (MVP Real)

## SPRINT 0: SETUP Y INFRAESTRUCTURA (1 semana)

**Actividades paralelas (no bloquean historias):**

| Tarea | Propietario | Complejidad | Status |
|-------|-------------|------------|--------|
| Inicializar repo Git + GitHub | DevOps | S | ✅ |
| Setup Docker Compose (frontend + backend + DB) | DevOps | M | ⏳ |
| CI/CD con GitHub Actions | DevOps | M | ⏳ |
| Estructura Vite + React 19 | Frontend | M | ⏳ |
| Estructura NestJS + TypeORM | Backend | M | ⏳ |
| BD PostgreSQL 16 local + migrations | Backend | S | ⏳ |

---

# SPRINT 1: FUNDACIÓN Y SEGURIDAD (Semana 1-2)

**Objetivo:** Establecer autenticación, control de acceso y primer flujo ciudadano.  
**Equipo:** 1 Frontend + 1 Backend  
**Capacidad:** 34 puntos  

---

## HU-12: Iniciar sesión con ClaveÚnica ⭐ BLOQUEANTE

**Épica:** EP-01 · Fundación y Seguridad  
**Prioridad:** P0 (CRÍTICA)  
**Estimación:** L (8 puntos)  
**Sprint:** 1  
**Tags:** `#17` `backend` `auth`  
**Dependencias:** Ninguna

**Como** ciudadano, **quiero** entrar con mi identidad oficial **para** no crear otra cuenta más.

**Criterios de Aceptación:**
- ✅ Implementar OAuth2 flow con ClaveÚnica (código → token)
- ✅ Persistencia de RUN, Nombre completo, Email en `usuarios` table
- ✅ Generación de JWT con expiry 15 minutos
- ✅ Refresh token en HttpOnly cookie con expiry 7 días
- ✅ Endpoint `POST /api/auth/clave-unica/callback` recibe code
- ✅ Endpoint `GET /api/auth/usuario-actual` retorna userData
- ✅ Manejo de logout seguro (limpiar cookies)
- ✅ Tests: OAuth flow completo, refresh token, logout

**Notas Técnicas:**
```
Backend:
  - npm install @nestjs/jwt @nestjs/passport passport-oauth2
  - Usar environment variables para ClaveÚnica clientId/secret
  - Guardar refresh token en Redis (revocable)
  - HTTPS forzado en production

Frontend:
  - Redirigir a ClaveÚnica cuando no hay JWT
  - Interceptor Axios para agregar Authorization header
  - Retry automático con refresh token si 401
```

---

## HU-13: Control de acceso por roles (RBAC)

**Épica:** EP-01 · Fundación y Seguridad  
**Prioridad:** P0 (CRÍTICA)  
**Estimación:** M (6 puntos)  
**Sprint:** 1  
**Tags:** `#18` `backend` `auth`  
**Dependencias:** `Requiere HU-12`

**Como** administrador municipal, **quiero** definir roles **para** restringir el acceso a funciones críticas.

**Criterios de Aceptación:**
- ✅ 4 roles: `vecino`, `operador`, `administrador`, `patrocinador`
- ✅ Middleware `@RequireRoles(['admin', 'operador'])` en endpoints críticos
- ✅ Vecino: solo ve su perfil + marketplace público
- ✅ Operador: ve rutas asignadas + solicitudes en ruta
- ✅ Admin: acceso total a configuración + reportes
- ✅ Patrocinador: reportes + estadísticas (sin editar)
- ✅ Tests: 5+ rutas con RBAC activo

**Matriz de Permisos:**

| Acción | Vecino | Operador | Admin | Patrocinador |
|--------|--------|----------|-------|--------------|
| Crear solicitud | ✅ | ❌ | ❌ | ❌ |
| Ver propia solicitud | ✅ | ❌ | ✅ | ❌ |
| Ver todas solicitudes | ❌ | ✅ | ✅ | ✅ |
| Publicar marketplace | ✅ | ❌ | ❌ | ❌ |
| Chat marketplace | ✅ | ❌ | ❌ | ❌ |
| Asignar retiros | ❌ | ❌ | ✅ | ❌ |
| Cambiar estado solicitud | ❌ | ✅ | ✅ | ❌ |
| Generar reportes | ❌ | ❌ | ✅ | ✅ |
| Ver usuarios | ❌ | ❌ | ✅ | ✅ |
| Bloquear usuario | ❌ | ❌ | ✅ | ❌ |

---

## HU-14: Registro auditable de acciones

**Épica:** EP-01 · Fundación y Seguridad  
**Prioridad:** P1  
**Estimación:** M (5 puntos)  
**Sprint:** 1  
**Tags:** `#19` `backend` `security`  
**Dependencias:** `Requiere HU-13`

**Como** administrador, **quiero** un log de auditoría **para** saber quién modificó qué en el sistema.

**Criterios de Aceptación:**
- ✅ Tabla `auditoria` registra: usuario_id, accion, tabla_afectada, registro_id, detalles (JSONB), timestamp, ip_cliente
- ✅ Se auditan cambios en: solicitudes_retiro, usuarios, artículos_marketplace
- ✅ Los logs NO pueden ser borrados ni editados (solo INSERT)
- ✅ Query eficiente: índice en (usuario_id, fecha_accion)
- ✅ Endpoint `GET /api/admin/auditoria?fecha_desde&fecha_hasta` (solo admin)
- ✅ Retención mínima 2 años
- ✅ Tests: auditoría registra cambios correctamente

---

## HU-01: Registrar residuo con foto

**Épica:** EP-02 · Interfaz Ciudadana  
**Prioridad:** P0 (CRÍTICA)  
**Estimación:** L (8 puntos)  
**Sprint:** 1  
**Tags:** `#6` `frontend` `backend`  
**Dependencias:** `Requiere HU-12`

**Como** vecino, **quiero** subir fotos de mi residuo desde el móvil **para que** el municipio sepa qué debe retirar.

**Criterios de Aceptación:**
- ✅ Capturar foto desde cámara O seleccionar de galería
- ✅ Comprimir imagen a max 2MB (WebP/JPEG)
- ✅ Campo descripción (max 500 caracteres)
- ✅ Seleccionar dirección (autocompletado por Leaflet + OSM)
- ✅ Obtener ubicación GPS (con permiso usuario)
- ✅ Solicitud registrada con ID único, estado "Recibida", timestamp
- ✅ Respuesta incluye: id, estado, timestamp, ubicacion
- ✅ Foto almacenada en Cloudinary (CDN)
- ✅ Tests: upload foto, validación campos, error handling

**Flujo:**
```
1. User toca "Registrar Voluminoso"
2. Camera/gallery picker
3. Foto capturada → preview
4. Form: descripción + dirección + GPS
5. Submit → POST /api/solicitudes-retiro
6. Respuesta: { id: 42, estado: "Recibida", ... }
7. Push notification: "Solicitud #42 creada"
```

---

## HU-03: Seguir estado de solicitud

**Épica:** EP-02 · Interfaz Ciudadana  
**Prioridad:** P0  
**Estimación:** M (5 puntos)  
**Sprint:** 1  
**Tags:** `#8` `frontend`  
**Dependencias:** `Requiere HU-01`

**Como** vecino, **quiero** ver en qué etapa está mi retiro **para** reducir la incertidumbre.

**Criterios de Aceptación:**
- ✅ Pantalla "Mis Solicitudes" lista todas las del usuario
- ✅ Estados visibles: Recibida → Validada → Programada → En Ruta → Retirada
- ✅ Badge de color por estado (amarillo=nuevo, azul=programado, verde=completado)
- ✅ Fecha estimada de retiro visible si ya programada
- ✅ Nombre + foto operador asignado visible si en ruta
- ✅ Botón de contacto con operador si en ruta (chat directo)
- ✅ Timeline visual de progreso
- ✅ Tests: estados correctos, cronología, datos operador

**Estados:**
```
🟡 Recibida: Usuario registró, municipio revisa
🔵 Validada: Municipio confirmó categoría
🟣 Programada: Operador asignado, fecha confirmada
🟠 En Ruta: Operador en camino
🟢 Retirada: Completado, residuo documentado
⚫ Cancelada: Usuario o municipio canceló
```

---

## HU-02: Clasificación automática (IA)

**Épica:** EP-02 · Interfaz Ciudadana  
**Prioridad:** P1  
**Estimación:** L (8 puntos)  
**Sprint:** 1 (pero puede ir a Sprint 2)  
**Tags:** `#7` `backend` `ia`  
**Dependencias:** `Requiere HU-01`

**Como** vecino, **quiero** que el sistema me sugiera qué tipo de residuo es **para** no clasificarlo mal manualmente.

**Criterios de Aceptación:**
- ✅ Integración Google Cloud Vision API
- ✅ Envío foto a Vision → recibe etiquetas (labels)
- ✅ Mapeo etiquetas Vision a nuestro catálogo (`residuos_catalogo`)
- ✅ Retorna top 3 sugerencias: {nombre, confianza %, costo}
- ✅ Usuario puede aceptar sugerencia → categoría confirmada + costo mostrado
- ✅ Usuario puede rechazar → buscar manualmente en dropdown
- ✅ Si rechazo: guardar feedback para re-entrenamiento
- ✅ Timeout 10s si Vision tarda (fallback manual)
- ✅ Tests: mapeos Vision→catálogo, fallback timeout

**Ejemplo:**
```
Foto de sofá gris → Vision retorna:
  [
    { label: "sofa", score: 0.87 },
    { label: "furniture", score: 0.82 },
    { label: "couch", score: 0.79 }
  ]
  
Mapeo:
  sofa → ["Sillón 3 cuerpos", "Sillón 2 cuerpos"]
  
Sugerencias mostradas:
  ✅ Sillón 3 cuerpos (87% confianza, $34,412)
  ✅ Sillón 2 cuerpos (72% confianza, $15,353)
  ❓ Mueble (detectado, confusión posible)
```

---

## Resumen Sprint 1

| HU | Título | Estimación | Status |
|----|--------|-----------|--------|
| HU-12 | ClaveÚnica OAuth2 ⭐ | L (8) | ⏳ |
| HU-13 | RBAC por roles | M (6) | ⏳ |
| HU-14 | Auditoría | M (5) | ⏳ |
| HU-01 | Registrar residuo foto | L (8) | ⏳ |
| HU-03 | Seguir estado solicitud | M (5) | ⏳ |
| HU-02 | Clasificación IA | L (8) | ⏳ |

**Total: 40 puntos** (puede quitarse HU-02 si es mucho)

---

# SPRINT 2: DASHBOARD ADMIN + NOTIFICACIONES (Semana 3-4)

**Objetivo:** Herramientas municipales + notificaciones en tiempo real.  
**Equipo:** 1 Frontend + 1 Backend  
**Capacidad:** 34 puntos  

---

## HU-07: Dashboard de solicitudes (Admin)

**Épica:** EP-04 · Dashboard Administrativo Municipal  
**Prioridad:** P0  
**Estimación:** L (10 puntos)  
**Sprint:** 2  
**Tags:** `#12` `frontend` `backend` `maps`  
**Dependencias:** `Requiere HU-13`

**Como** administrador, **quiero** ver un panel con solicitudes activas **para** organizar la logística del día.

**Criterios de Aceptación:**
- ✅ Mapa Mapbox con pines geolocalizados de solicitudes
- ✅ Clusteres por comuna/zona
- ✅ Filtros: Estado (Recibida/Validada/Programada), Urgencia (Alta/Media/Baja), Comuna
- ✅ Listado tabla: ID, Cliente, Dirección, Categoría, Costo, Estado, Fecha
- ✅ Click pin → panel lateral con detalles + foto
- ✅ Botón "Asignar" abre modal para HU-08
- ✅ Botón descargar solicitudes del día (CSV)
- ✅ Actualización en tiempo real vía Socket.io (nueva solicitud = nuevo pin)
- ✅ Tests: mapas, filtros, actualizaciones RT

**Stats del Dashboard:**
```
Tarjetas superiores:
  📍 Solicitudes activas: 45
  📋 Nuevas hoy: 8
  🚚 Programadas: 23
  🛣️ En ruta: 5
  ✅ Completadas este mes: 156
```

---

## HU-08: Programar y asignar retiros

**Épica:** EP-04 · Dashboard Administrativo Municipal  
**Prioridad:** P0  
**Estimación:** M (7 puntos)  
**Sprint:** 2  
**Tags:** `#13` `backend`  
**Dependencias:** `Requiere HU-07`

**Como** administrador, **quiero** asignar solicitudes a operadores **para** optimizar las rutas.

**Criterios de Aceptación:**
- ✅ Multiselect de solicitudes en tabla/mapa
- ✅ Dropdown con operadores disponibles
- ✅ Selector fecha + hora de retiro programado
- ✅ Botón "Asignar" → actualiza estado a "Programada"
- ✅ Asignación masiva (ej: 10 solicitudes a operador X en una acción)
- ✅ Push notification automática al operador: "5 retiros asignados para mañana 8am"
- ✅ Cambio estado visible en tiempo real en mapa
- ✅ Tests: asignación masiva, notificación operador, validación fechas

**Flujo:**
```
1. Admin selecciona 4 solicitudes
2. Clickea "Asignar"
3. Modal: operador (dropdown) + fecha + hora
4. Confirma
5. POST /api/dashboard/asignaciones { solicitud_ids: [42,45,48,51], operador_id: 5, fecha_programada }
6. Solicitudes cambian estado a "Programada"
7. Operador recibe push + SMS (si habilitado)
```

---

## HU-23: Recibir notificaciones push (Cambios de estado)

**Épica:** EP-07 · Notificaciones y Experiencia  
**Prioridad:** P0  
**Estimación:** L (9 puntos)  
**Sprint:** 2  
**Tags:** `#23` `backend` `push` `ios` `android`  
**Dependencias:** `Requiere HU-01 + HU-12`

**Como** ciudadano, **quiero** recibir push cuando mi solicitud cambia de estado **para** saber el progreso sin abrir la app.

**Criterios de Aceptación:**
- ✅ Suscripción a push (Firebase Cloud Messaging)
- ✅ Endpoint `POST /api/notificaciones/suscribir` almacena FCM token
- ✅ Triggers automáticos en cambios de estado:
  - "Tu solicitud fue registrada" (Recibida)
  - "Tu solicitud está programada para [fecha]" (Programada)
  - "El operador está en camino (2 min)" (En Ruta)
  - "Tu retiro fue completado" (Retirada)
- ✅ Push incluye: título, cuerpo, deep link a solicitud
- ✅ Tabla `notificaciones` registra envío (id, usuario_id, tipo, estado_enviado)
- ✅ Retry automático si falla (3 intentos)
- ✅ Tests: FCM flow, triggers, deep links, retry

**Backend Implementation:**
```javascript
// Cuando estado solicitud cambia:
async function notificarCambioEstado(solicitudId, nuevoEstado) {
  const solicitud = await SolicitudService.get(solicitudId);
  const usuario = await UsuarioService.get(solicitud.usuario_id);
  
  const pushToken = usuario.fcm_token;
  if (!pushToken) return; // usuario no subscrito
  
  const titulo = mapeoTitulos[nuevoEstado];
  const cuerpo = mapeoMensajes[nuevoEstado](solicitud);
  
  await fcm.send({
    token: pushToken,
    notification: { title: titulo, body: cuerpo },
    data: { solicitud_id: solicitudId.toString() },
    webpush: { fcmOptions: { link: `/solicitudes/${solicitudId}` } }
  });
  
  await NotificacionService.create({
    usuario_id: usuario.id,
    tipo: 'cambio_estado',
    titulo,
    cuerpo,
    referencia_id: solicitudId
  });
}
```

---

## HU-30/31/32/33: App Operador (Básica)

**Épica:** EP-09 · Operador/Logística  
**Prioridad:** P1  
**Estimación:** XL (12 puntos)  
**Sprint:** 2 (segunda mitad) o Sprint 3  
**Tags:** `#30-33` `frontend` `backend` `maps` `gps`  
**Dependencias:** `Requiere HU-08`

**Agrupamos 4 HUs en una porque usan mismos datos:**

### HU-30: Ver ruta asignada en mapa

**Como** operador, **quiero** ver todas mis retiros asignados en un mapa **para** optimizar mi ruta.

**Criterios de Aceptación:**
- ✅ Vista mapa Mapbox con pines numerados (1, 2, 3...)
- ✅ Orden sugerido por API (ruta optimizada)
- ✅ Click pin → panel con dirección, residuo, cliente, teléfono
- ✅ Botón "Iniciar ruta" activa tracking GPS
- ✅ ETA estimada a próximo punto
- ✅ Tests: mapa, orden rutas, GPS

---

### HU-31: Marcar como "En ruta"

**Como** operador, **quiero** confirmar que salí a retirar **para** que el ciudadano sepa que voy en camino.

**Criterios de Aceptación:**
- ✅ Botón "En ruta" en primera solicitud
- ✅ PATCH `/api/solicitudes/{id}/estado` → "En Ruta"
- ✅ Notificación push al ciudadano: "Operador en camino (ETA 5 min)"
- ✅ Ubicación GPS se registra cada 30s
- ✅ Tests: cambio estado, push, GPS tracking

---

### HU-32: Subir foto retiro + GPS

**Como** operador, **quiero** documentar el residuo retirado con foto **para** dejar constancia.

**Criterios de Aceptación:**
- ✅ Botón "Foto de retiro" abre cámara
- ✅ Captura foto + GPS automático
- ✅ Vista previa antes de enviar
- ✅ POST `/api/solicitudes/{id}/foto-retiro` → almacena en Cloudinary
- ✅ Tabla `foto_retiro` registra: foto, timestamp, lat, lng, observaciones (opcional)
- ✅ Tests: upload foto, GPS capturado, validación

---

### HU-33: Marcar como "Retirado"

**Como** operador, **quiero** confirmar que el residuo fue retirado **para** cerrar la solicitud.

**Criterios de Aceptación:**
- ✅ Botón "Confirmar retiro" en detalle solicitud
- ✅ Requiere foto (HU-32) previa
- ✅ PATCH `/api/solicitudes/{id}/estado` → "Retirada"
- ✅ Solicitud se marca como completada
- ✅ Notificación al ciudadano: "Tu retiro fue completado"
- ✅ Tests: validación foto previa, cambio estado

---

## Resumen Sprint 2

| HU | Título | Estimación | Status |
|----|--------|-----------|--------|
| HU-07 | Dashboard solicitudes (mapa) | L (10) | ⏳ |
| HU-08 | Asignar retiros | M (7) | ⏳ |
| HU-23 | Push notificaciones | L (9) | ⏳ |
| HU-30/31/32/33 | App operador | XL (12) | ⏳ |

**Total: 38 puntos** (apretado, puede dividirse entre 2-3 sprints)

---

# SPRINT 3: MARKETPLACE P2P (Semana 5-6)

**Objetivo:** Sistema de intercambio entre ciudadanos.  
**Equipo:** 1 Frontend + 1 Backend  
**Capacidad:** 34 puntos  

---

## HU-04: Publicar en Marketplace P2P

**Épica:** EP-03 · Marketplace e Incentivos  
**Prioridad:** P1  
**Estimación:** M (7 puntos)  
**Sprint:** 3  
**Tags:** `#9` `frontend` `backend`  
**Dependencias:** `Requiere HU-01 + HU-03`

**Como** vecino, **quiero** ofrecer artículos que ya no uso **para que** otros vecinos les den una segunda vida.

**Criterios de Aceptación:**
- ✅ Formulario: Título (max 100 chars), Descripción (max 500), Foto, Modalidad (Regalo/Intercambio)
- ✅ Selector de categoría: Muebles, Ropa, Electrodomésticos, Otros
- ✅ Location picker (autocompletado)
- ✅ Opción: vinculado a solicitud de retiro (HU-01)
- ✅ Artículo estado: "disponible", auto-expira en 15 días
- ✅ POST `/api/marketplace/articulos`
- ✅ Respuesta: { id, estado: "disponible", fecha_publicacion, mensaje: "¡Artículo publicado!" }
- ✅ Notificación push: "Nuevo artículo en marketplace"
- ✅ Tests: validación campos, expiración, vinculación solicitud

**Flujo:**
```
1. Usuario toca "Publicar artículo"
2. Form: título, descripción, foto, categoría, modalidad, ubicación
3. Opcional: "¿Vinculado a una solicitud de retiro?" → select
4. Submit → POST /api/marketplace/articulos
5. Articulo visible a otros usuarios
6. Auto-expira en 15 días si no hay interés
```

---

## HU-05: Buscar y filtrar artículos

**Épica:** EP-03 · Marketplace e Incentivos  
**Prioridad:** P1  
**Estimación:** M (8 puntos)  
**Sprint:** 3  
**Tags:** `#10` `frontend` `backend`  
**Dependencias:** `Requiere HU-04`

**Como** vecino, **quiero** filtrar artículos por cercanía **para** no tener que viajar lejos.

**Criterios de Aceptación:**
- ✅ Buscador por palabras clave (titulo + descripción)
- ✅ Filtro distancia: 1 km, 5 km, 10 km, 25 km, Sin límite
- ✅ Filtro categoría (multiselect)
- ✅ Filtro modalidad: Regalo, Intercambio, Ambos
- ✅ Orden por: Relevancia, Cercanía, Reciente
- ✅ GET `/api/marketplace/articulos?q=sofa&categoria=Muebles&distancia=5&lat=-33.4125&lng=-71.5590`
- ✅ Resultados: id, titulo, foto, distancia_km, usuario (nombre, rating), fecha_publicacion
- ✅ Paginación: 10 items/página
- ✅ Tests: filtros, orden, distancia calculada, paginación

**Query ejemplo:**
```
GET /api/marketplace/articulos?
  q=sofa
  &categoria=Muebles
  &distancia=5
  &lat=-33.4125
  &lng=-71.5590
  &modalidad=regalo
  &ordenar=cercania
  &pagina=1

Response:
{
  total: 24,
  pagina: 1,
  articulos: [
    {
      id: 128,
      titulo: "Sofá gris 3 cuerpos",
      foto_url: "https://cdn.arca.cl/...",
      distancia_km: 0.3,
      modalidad: "regalo",
      usuario: { id: 1, nombre: "Juan", rating: 4.8 },
      fecha_publicacion: "2026-05-20T14:00:00Z"
    }
  ]
}
```

---

## HU-06: Contacto para coordinación P2P (Chat)

**Épica:** EP-03 · Marketplace e Incentivos  
**Prioridad:** P1  
**Estimación:** L (10 puntos)  
**Sprint:** 3  
**Tags:** `#11` `backend` `socket.io` `ux-ui`  
**Dependencias:** `Requiere HU-05`

**Como** vecino, **quiero** contactar al dueño de un artículo **para** ponernos de acuerdo en el retiro.

**Criterios de Aceptación:**
- ✅ WebSocket `/ws/marketplace/articulos/{id}/chat` (tiempo real)
- ✅ Mensajes bidireccionales con tipado
- ✅ Foto en mensaje (opcional)
- ✅ Historial de mensajes (REST fallback)
- ✅ Marcado como "leído" con timestamp
- ✅ Números personales NO se muestran inicialmente
- ✅ Botón "Compartir contacto" (explicit)
- ✅ Botón "Marcar como entregado" (HU-confirmación)
- ✅ Notificación push: "Nuevo mensaje de [usuario]"
- ✅ Tests: WebSocket, mensajes, historia, lectura

**Architecture:**
```
Frontend → Socket.io
Backend (NestJS) → Redis Adapter (para escalar múltiples servidores)
  
Evento: "mensaje"
{
  tipo: "mensaje",
  contenido: "Hola, ¿aún disponible?",
  foto?: "base64...",
  timestamp: "2026-05-20T15:30:45Z"
}

Broadcast a ambos usuarios del artículo
Guardar en tabla `mensajes_marketplace`
Notificación push al receptor (si offline)
```

---

## HU-15: Calificar a otros usuarios (Ratings)

**Épica:** EP-05 · Calidad y Seguridad Comunitaria  
**Prioridad:** P1  
**Estimación:** M (6 puntos)  
**Sprint:** 3  
**Tags:** `#15` `frontend` `backend`  
**Dependencias:** `Requiere HU-06 (entrega confirmada)`

**Como** vecino, **quiero** calificar a otro usuario tras entrega **para** construir reputación.

**Criterios de Aceptación:**
- ✅ Puntuación 1-5 estrellas
- ✅ Campo comentario opcional (max 300 chars)
- ✅ Tipo: marketplace_vendedor, marketplace_comprador
- ✅ Unique constraint: (usuario_calificador, usuario_calificado, referencia_id)
- ✅ Solo pueda calificar tras entrega confirmada
- ✅ POST `/api/ratings`
- ✅ Respuesta: promedio_usuario, total_ratings
- ✅ Perfil usuario muestra: promedio rating, % positivos (4-5 estrellas)
- ✅ Tests: validación puntuación, comments, uniqueness

**Modal de Rating (post-entrega):**
```
¿Cómo fue la experiencia con Juan Pérez?
⭐⭐⭐⭐⭐ (click para cambiar)

Comentario (opcional):
"Excelente, llegó puntual y el sofá en perfecto estado"

[Cancelar] [Enviar]

Perfil de Juan:
  Rating promedio: 4.8/5 ⭐
  Total reviews: 12
  Positivos: 95%
  Últimos reviews: [...]
```

---

## Confirmación de Entrega (Flow)

**Esta no es una HU per se, pero es crítica para cerrar el P2P:**

Después de HU-06 (chat coordinado), ambos usuarios confirman:

**Frontend:**
- Botón "Confirmar entrega" en ambos lados
- Modal: "Tomar foto de entrega + GPS"
- Subir foto → Cloudinary
- POST `/api/marketplace/articulos/{id}/confirmar-entrega` { confirmacion_usuario_actual: true, foto_entrega_base64 }

**Backend:**
- Registra confirmación de ambos usuarios
- Cuando ambos confirmen → estado: "entregado"
- Tabla `articulos_marketplace`: estado = "entregado"
- Crear instancia en `foto_retiro` (similar a HU-32)
- Otorgar +10 Circular Credits a cada usuario (HU-10)
- Generar notificación: "Entrega completada, +10 Circular Credits"

---

## Resumen Sprint 3

| HU | Título | Estimación | Status |
|----|--------|-----------|--------|
| HU-04 | Publicar marketplace | M (7) | ⏳ |
| HU-05 | Buscar/filtrar artículos | M (8) | ⏳ |
| HU-06 | Chat P2P (Socket.io) | L (10) | ⏳ |
| HU-15 | Ratings usuarios | M (6) | ⏳ |

**Total: 31 puntos**

---

# SPRINT 4: INCENTIVOS Y GAMIFICACIÓN (Semana 7-8)

**Objetivo:** Sistema de Circular Credits + impacto ambiental.  
**Equipo:** 1 Frontend + 1 Backend  
**Capacidad:** 34 puntos  

---

## HU-10: Otorgar Circular Credits

**Épica:** EP-03 · Marketplace e Incentivos  
**Prioridad:** P1  
**Estimación:** M (6 puntos)  
**Sprint:** 4  
**Tags:** `#15` `backend`  
**Dependencias:** `Requiere HU-06 (entrega confirmada) + HU-14 (auditoría)`

**Como** sistema, **quiero** asignar puntos al usuario cuando recicla o dona **para** incentivar su participación.

**Criterios de Aceptación:**
- ✅ Tabla `transacciones_circular_credits`: usuario_id, monto, tipo_transaccion, referencia_id, descripcion, timestamp
- ✅ Tipos: publicar_articulo (+5), entregar_articulo (+10), reciclaje (+5), retiro_confirmado (+0, documentación)
- ✅ Usuario: circular_credits DECIMAL actualizado en tiempo real
- ✅ Credits son inalterables (insert-only, no update)
- ✅ POST `/api/usuario/circular-credits` (registrar transacción, solo backend)
- ✅ Triggers automáticos:
  - Al publicar artículo: +5
  - Al confirmar entrega: +10 (a ambos)
  - Al retirar residuo (confirmado): +0 (posible futura integración con canjes)
- ✅ Notificación push: "¡+10 Circular Credits por entregar artículo!"
- ✅ Tests: cálculo transacciones, triggers, immutabilidad

**Schema:**
```sql
CREATE TABLE transacciones_circular_credits (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  monto DECIMAL(10,2),
  tipo_transaccion VARCHAR(100), 
    -- 'publicar_articulo', 'entregar_articulo', 'reciclaje', 'retiro_confirmado'
  referencia_id INT,
  descripcion TEXT,
  fecha_transaccion TIMESTAMP DEFAULT NOW()
);

-- Trigger: actualizar usuarios.circular_credits cuando se inserta transaccion
CREATE OR REPLACE FUNCTION actualizar_circular_credits()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE usuarios SET circular_credits = circular_credits + NEW.monto
  WHERE id = NEW.usuario_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_circular_credits
AFTER INSERT ON transacciones_circular_credits
FOR EACH ROW EXECUTE FUNCTION actualizar_circular_credits();
```

---

## HU-11: Consultar saldo e historial

**Épica:** EP-03 · Marketplace e Incentivos  
**Prioridad:** P1  
**Estimación:** S (4 puntos)  
**Sprint:** 4  
**Tags:** `#16` `frontend` `ux-ui`  
**Dependencias:** `Requiere HU-10`

**Como** vecino, **quiero** ver mis créditos acumulados **para** saber qué beneficios puedo canjear.

**Criterios de Aceptación:**
- ✅ Pantalla "Billetera" accesible desde menú principal
- ✅ Saldo actual en grande (ej: "125.50 CC")
- ✅ Historial de transacciones últimos 30 días (paginate 10 items)
- ✅ Columnas: Tipo, Monto (+/-), Descripción, Fecha
- ✅ Badge de color: entrada (+) = verde, salida (-) = rojo
- ✅ Enlace a "Catálogo de Beneficios" (externo o futuro)
- ✅ GET `/api/usuario/circular-credits`
- ✅ Tests: saldo correcto, historial, paginación

**UI:**
```
┌─────────────────────────────────┐
│         💰 Mis Circular Credits │
├─────────────────────────────────┤
│                                 │
│    Saldo: 125.50 CC             │
│                                 │
│    🎁 Canjear beneficios →      │
│                                 │
├─────────────────────────────────┤
│ Historial (últimos 30 días):    │
│                                 │
│ 🟢 +10 CC  Entregar artículo    │
│            Sofá gris             │
│            20-05-2026            │
│                                 │
│ 🟢 +5 CC   Publicar artículo    │
│            Lámpara               │
│            19-05-2026            │
│                                 │
│ 🟢 +20 CC  Bonus bienvenida     │
│            Referido: ABC123     │
│            18-05-2026            │
└─────────────────────────────────┘
```

---

## HU-19: Estadísticas personales de CO2 ahorrado

**Épica:** EP-06 · Impacto Ambiental y Gamificación  
**Prioridad:** P2  
**Estimación:** M (7 puntos)  
**Sprint:** 4  
**Tags:** `#19` `frontend` `backend`  
**Dependencias:** `Requiere HU-06 (entrega) + HU-33 (retiro completado)`

**Como** vecino, **quiero** ver mis estadísticas ambientales **para** entender mi impacto positivo.

**Criterios de Aceptación:**
- ✅ Tabla `impacto_ambiental`: usuario_id, solicitud_id, articulo_id, tipo_accion, co2_ahorrado_kg, agua_ahorrada_litros, fecha
- ✅ Registros al confirmar entrega marketplace O retiro municipal completado
- ✅ Dashboard "Mi Impacto":
  - CO2 ahorrado total (kg)
  - Agua ahorrada total (litros)
  - Artículos reutilizados
  - Residuos retirados
  - Posición en ranking (Top X de Y usuarios)
  - Hito próximo (ej: "500kg CO2 - 50kg más")
- ✅ GET `/api/usuario/impacto-ambiental`
- ✅ Timeline mensual (gráfico)
- ✅ Tests: cálculo impacto, ranking, hitos

**Cálculo simplificado:**
```javascript
// Al confirmar entrega de artículo tipo "sofá"
const tipoArticulo = "Sillón 3 cuerpos";
const co2_ahorrado = 20; // kg (predefinido por tipo)
const agua_ahorrada = 150; // litros

await ImpactoAmbiental.create({
  usuario_id: usuarioConfirma.id,
  articulo_id: articulo.id,
  tipo_accion: "articulo_reutilizado",
  co2_ahorrado_kg: co2_ahorrado,
  agua_ahorrada_litros: agua_ahorrada,
  fecha: new Date()
});

// Calcular ranking
const ranking = await ImpactoAmbiental.queryRaw(`
  SELECT usuario_id, SUM(co2_ahorrado_kg) as total_co2
  FROM impacto_ambiental
  WHERE EXTRACT(YEAR FROM fecha) = 2026
  GROUP BY usuario_id
  ORDER BY total_co2 DESC
`);
```

---

## HU-20: Ranking de ciudadanos por impacto

**Épica:** EP-06 · Impacto Ambiental y Gamificación  
**Prioridad:** P2  
**Estimación:** M (5 puntos)  
**Sprint:** 4  
**Tags:** `#20` `frontend` `backend`  
**Dependencias:** `Requiere HU-19`

**Como** vecino, **quiero** ver cómo me comparo con otros **para** motivarme a reciclar más.

**Criterios de Aceptación:**
- ✅ Ranking global ordenado por CO2 ahorrado este mes
- ✅ TOP 10 visible, tu posición destacada
- ✅ Columnas: Posición, Nombre, CO2 (kg), Articulos, Badge
- ✅ GET `/api/ranking/impacto?periodo=mes&limite=100`
- ✅ Cache 1 hora (cálculo costoso)
- ✅ Badges: 🥇 Oro (1-3), 🥈 Plata (4-10), 🥉 Bronce (11-50)
- ✅ Tests: orden correcto, cache, badges

**UI:**
```
┌──────────────────────────────────┐
│   🌍 Ranking de Impacto (Mayo)   │
├──────────────────────────────────┤
│                                  │
│  🥇 1. María García    450 kg    │
│       8 artículos reutilizados   │
│                                  │
│  🥈 2. Carlos López    380 kg    │
│       6 artículos                │
│                                  │
│  🥉 3. Ana Martínez    320 kg    │
│       5 artículos                │
│                                  │
│  ... (más usuarios)              │
│                                  │
│  👤 23. Tú (Juan P.)   45 kg     │
│        2 artículos               │
│        "Sube 10 posiciones"      │
│                                  │
└──────────────────────────────────┘
```

---

## HU-27: Generar código único de referido

**Épica:** EP-08 · Crecimiento y Referidos  
**Prioridad:** P2  
**Estimación:** S (4 puntos)  
**Sprint:** 4  
**Tags:** `#27` `frontend` `backend`  
**Dependencias:** `Requiere HU-11`

**Como** vecino, **quiero** un código único para invitar amigos **para** que ambos ganemos bonos.

**Criterios de Aceptación:**
- ✅ Tabla `referidos`: usuario_referidor, usuario_referido, codigo_referido (unique), bonus_credits, fecha_activacion, activado
- ✅ Código generado al primer login: formato "NOMBRE+YEAR+RANDOM" (ej: "JUAN2025ABC")
- ✅ GET `/api/usuario/referidos/codigo`
- ✅ Respuesta: codigo_referido, bonus_credits (20), referidos_activos, link_compartir (con UTM params)
- ✅ Botón "Copiar código"
- ✅ Botón "Compartir en WhatsApp/Facebook" (con prefilled text)
- ✅ Tests: generación código, uniqueness, compartir links

**Response:**
```json
{
  "codigo_referido": "JUAN2025ABC",
  "bonus_credits": 20,
  "referidos_activos": 3,
  "referidos_totales_credits_ganados": 60,
  "enlace_compartir": "https://app.arca.cl/?ref=JUAN2025ABC",
  "mensaje_whatsapp": "Únete a ARCA y ayuda al ambiente. Tú y yo ganamos 20 Circular Credits cada uno 🌱. Tu código: JUAN2025ABC"
}
```

---

## Resumen Sprint 4

| HU | Título | Estimación | Status |
|----|--------|-----------|--------|
| HU-10 | Otorgar CC | M (6) | ⏳ |
| HU-11 | Ver saldo + historial | S (4) | ⏳ |
| HU-19 | Impacto CO2 personal | M (7) | ⏳ |
| HU-20 | Ranking de usuarios | M (5) | ⏳ |
| HU-27 | Código referido | S (4) | ⏳ |

**Total: 26 puntos** (capacidad=34, sobra buffer para bugs)

---

# SPRINT 5: POLISH + SOPORTE (Semana 9-10)

**Objetivo:** Reportes, preferencias, soporte y preparar para MVP.  
**Equipo:** 1 Frontend + 1 Backend  
**Capacidad:** 34 puntos  

---

## HU-09: Generar reportes municipales

**Épica:** EP-04 · Dashboard Administrativo Municipal  
**Prioridad:** P2  
**Estimación:** L (9 puntos)  
**Sprint:** 5  
**Tags:** `#14` `backend`  
**Dependencias:** `Requiere HU-07 + HU-08`

**Como** patrocinador municipal, **quiero** exportar datos operativos **para** rendición de cuentas.

**Criterios de Aceptación:**
- ✅ Selector rango de fechas (date picker)
- ✅ Exportar en CSV y PDF
- ✅ Datos incluidos:
  - Total solicitudes recibidas
  - Total solicitudes completadas
  - Toneladas estimadas (basado en categoria + cantidad)
  - Costo total municipal
  - Usuarios activos
  - Artículos reutilizados en P2P (evitar retiros)
  - Impacto CO2 total
  - Rating promedio servicio
- ✅ GET `/api/dashboard/reportes/generar?fecha_desde&fecha_hasta&formato=csv|pdf`
- ✅ PDF con logo municipio + firma
- ✅ CSV descargable
- ✅ Tests: cálculos, formatos, rango fechas

**Reporte PDF sample:**
```
═══════════════════════════════════════════
  MUNICIPALIDAD DE SANTO DOMINGO
  REPORTE DE GESTIÓN DE RESIDUOS VOLUMINOSOS
  Período: 01-Mayo-2026 a 31-Mayo-2026
═══════════════════════════════════════════

📊 ESTADÍSTICAS OPERATIVAS:
  • Solicitudes recibidas: 156
  • Solicitudes completadas: 145
  • Solicitudes canceladas: 5
  • Pendientes: 6

📦 VOLUMEN:
  • Toneladas estimadas: 12.5 T
  • Costo total: $425,670 CLP
  • Costo promedio/retiro: $2,935

♻️ IMPACTO:
  • CO2 ahorrado: 450 kg
  • Artículos reutilizados: 34
  • Usuarios activos: 1,250

⭐ SATISFACCIÓN:
  • Rating promedio: 4.73/5
  • Puntualidad: 4.7/5
  • Trato: 4.9/5

═══════════════════════════════════════════
Generado: 2026-05-31 14:30:00
Por: Admin User
```

---

## HU-26: Preferencias de notificaciones

**Épica:** EP-07 · Notificaciones y Experiencia  
**Prioridad:** P3  
**Estimación:** S (5 puntos)  
**Sprint:** 5  
**Tags:** `#26` `frontend` `backend`  
**Dependencias:** `Requiere HU-23`

**Como** usuario, **quiero** controlar qué notificaciones recibo **para** no estar abrumado.

**Criterios de Aceptación:**
- ✅ Pantalla "Preferencias de Notificaciones"
- ✅ Toggles por tipo:
  - Push: cambio_estado_solicitud, nuevo_mensaje, nuevo_articulo_cercano, entrega_confirmada
  - Email: resumen_semanal, feedback_recibido
  - SMS: retiro_confirmado (si habilitado)
- ✅ PATCH `/api/usuario/preferencias-notificaciones`
- ✅ Defaults: push ON, email ON, SMS OFF
- ✅ Tests: guardar preferencias, respetar en trigger

---

## HU-34: Tema oscuro (Dark Mode)

**Épica:** EP-10 · Configuración y Privacidad  
**Prioridad:** P3  
**Estimación:** M (6 puntos)  
**Sprint:** 5  
**Tags:** `#34` `frontend` `ux-ui`  
**Dependencias:** Ninguna (feature aislada)

**Como** usuario, **quiero** activar tema oscuro **para** reducir fatiga visual de noche.

**Criterios de Aceptación:**
- ✅ Toggle en Preferencias: "Tema Oscuro"
- ✅ Opción: Manual, Automático (según hora del día)
- ✅ Paleta colores dark: backgrounds, text, accents
- ✅ Persistencia en localStorage
- ✅ Todas las vistas respetan tema (incluye marketplace, mapa)
- ✅ Transición suave (no parpadeo)
- ✅ Tests: cambio tema, persistencia, contraste accesibilidad

**Paleta Dark:**
```css
:root.dark {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --accent: #4CAF50;
  --accent-hover: #45a049;
  --border: #333333;
}
```

---

## HU-39: Ver FAQ por categoría

**Épica:** EP-11 · Soporte y Educación  
**Prioridad:** P4  
**Estimación:** S (4 puntos)  
**Sprint:** 5  
**Tags:** `#39` `frontend` `backend` `content`  
**Dependencias:** Ninguna

**Como** usuario, **quiero** acceder a preguntas frecuentes **para** resolver dudas sin contactar soporte.

**Criterios de Aceptación:**
- ✅ Tabla `faq_articulos`: titulo, descripcion, categoria, orden, veces_consultado, activo
- ✅ Pantalla "Ayuda" con categorías:
  - Solicitud de retiro
  - Marketplace P2P
  - Circular Credits
  - General
- ✅ GET `/api/faq?categoria=solicitud_retiro`
- ✅ Expandible/colapsable por pregunta
- ✅ Buscar dentro de FAQs (Ctrl+F)
- ✅ Votación "¿Útil?" (like/dislike) → analytics
- ✅ Admin puede añadir/editar FAQs desde backend
- ✅ Tests: categorías, búsqueda, votación

**Sample FAQs:**
```
SOLICITUD DE RETIRO:
  Q: ¿Cuál es el costo del retiro?
  A: El costo varía según el tipo. Ej: Refrigerador $21,176, Lavadora $9,000...
  👍 245 | 👎 12

  Q: ¿Cuánto tiempo tarda en llegar?
  A: Típicamente 3-5 días hábiles. Depende de carga de la zona...
  👍 128 | 👎 5

MARKETPLACE P2P:
  Q: ¿Cómo reporto a un usuario incumplidor?
  A: Click en el perfil usuario → "Reportar" → selecciona motivo...
  
CIRCULAR CREDITS:
  Q: ¿Cómo canjeo mis Circular Credits?
  A: Aún en desarrollo. Próximamente podrás canjear...
```

---

## Testing & Deployment

**Por hacer antes de MVP launch:**

- ✅ Tests unitarios: 80%+ cobertura
- ✅ Tests E2E: flujos críticos (login → solicitud → retiro)
- ✅ Tests de seguridad: SQL injection, XSS, CSRF
- ✅ Optimización performance: Lighthouse 85+
- ✅ Accesibilidad: WCAG 2.1 AA
- ✅ Deploy a staging
- ✅ Load testing: 100+ usuarios concurrentes
- ✅ Backup & DR plan

---

## Resumen Sprint 5

| HU | Título | Estimación | Status |
|----|--------|-----------|--------|
| HU-09 | Reportes municipales | L (9) | ⏳ |
| HU-26 | Preferencias notificaciones | S (5) | ⏳ |
| HU-34 | Tema oscuro | M (6) | ⏳ |
| HU-39 | FAQ básico | S (4) | ⏳ |
| Testing & Deploy | (varias) | M (10) | ⏳ |

**Total: 34 puntos**

---

# 🗺️ TABLA DE COBERTURA FINAL

| Épica | HUs | Sprints | Prioridad | Estado |
|-------|-----|---------|-----------|--------|
| EP-01: Fundación | HU-12, HU-13, HU-14 | 1 | P0 | ⏳ |
| EP-02: Interfaz Ciudadana | HU-01, HU-02, HU-03 | 1-2 | P0 | ⏳ |
| EP-03: Marketplace | HU-04, HU-05, HU-06, HU-10, HU-11 | 3-4 | P1 | ⏳ |
| EP-04: Admin Dashboard | HU-07, HU-08, HU-09 | 2, 5 | P0-P1 | ⏳ |
| EP-05: Calidad & Seguridad | HU-15, HU-16, HU-17, HU-18 | 3, Fase2 | P1 | ⏳ |
| EP-06: Impacto Ambiental | HU-19, HU-20, HU-21, HU-22 | 4, Fase2 | P2 | ⏳ |
| EP-07: Notificaciones | HU-23, HU-24, HU-25, HU-26 | 2, 5 | P0-P3 | ⏳ |
| EP-08: Referidos | HU-27, HU-28, HU-29 | 4, Fase2 | P2 | ⏳ |
| EP-09: Operador/Logística | HU-30, HU-31, HU-32, HU-33 | 2 | P1 | ⏳ |
| EP-10: Configuración | HU-34, HU-35, HU-36, HU-37, HU-38 | 5, Fase2 | P3 | ⏳ |
| EP-11: Soporte | HU-39, HU-40, HU-41, HU-42 | 5, Fase2 | P4 | ⏳ |

---

# 📊 RESUMEN DE PUNTOS POR SPRINT

```
SPRINT 0 (Setup):        ±10 pts (no HUs, infraestructura)
SPRINT 1 (Fundación):    40 pts  (6 HUs)
SPRINT 2 (Admin+Push):   38 pts  (4 HUs + Operador)
SPRINT 3 (Marketplace):  31 pts  (4 HUs)
SPRINT 4 (Incentivos):   26 pts  (5 HUs)
SPRINT 5 (Polish):       34 pts  (4 HUs + Testing)

TOTAL MVP (5 sprints):   169 pts
Capacidad (34/sprint):   170 pts ✅ (perfecto ajuste)

FASE 2 (Sprints 6-7):    Denuncias, Chatbot con IA, Hitos,
                          Social Sharing avanzado
```

---

# 🎯 DEPENDENCIAS CRÍTICAS

```
HU-12 (ClaveÚnica) ⭐ BLOQUEANTE
  ↓
HU-13 (RBAC) → HU-14 (Auditoría)
  ↓
HU-01 (Registrar residuo) → HU-03 (Ver estado)
  ↓
HU-07 (Dashboard) → HU-08 (Asignar)
  ↓
HU-30/31/32/33 (App Operador)
  ↓
HU-04 (Publicar) → HU-05 (Buscar) → HU-06 (Chat) → HU-15 (Ratings)
  ↓
HU-10 (CC) → HU-11 (Ver saldo)
  ↓
HU-19 (Impacto) → HU-20 (Ranking)
  ↓
HU-23 (Push notificaciones) ← usada por HU-08, HU-01, etc
```

---

# 📝 TRABAJO FUTURO (POST-MVP)

### FASE 2 (Sprints 6-7):

**EP-05 Completa:**
- HU-16: Denunciar incumplimiento
- HU-17: Feedback post-retiro detallado
- HU-18: Admin revisa y bloquea usuarios

**EP-06 Completa:**
- HU-21: Badges/hitos desbloqueables
- HU-22: Share impacto en redes

**EP-08 Completa:**
- HU-28: Registro con código referido
- HU-29: Bonificación automática

**EP-11 Completa:**
- HU-40: Chatbot básico (búsqueda FAQ)
- HU-41: Escalado a admin
- HU-42: Analytics de FAQs

**EP-10 Completa:**
- HU-35: Cambiar idioma
- HU-36: Zona horaria
- HU-37: Editar perfil
- HU-38: Eliminar cuenta

**Optimizaciones:**
- Chatbot con IA (Claude API)
- Social sharing avanzado (Instagram, TikTok)
- Analytics avanzada (Plausible)
- Performance: caching Redis, CDN Cloudinary
- Mobile app nativa (React Native o Expo)

---

**Documentación:** Versión viva, se actualiza cada sprint  
**Última actualización:** 23-Mayo-2026  
**Versión:** 2.0  
**Próxima revisión:** Post-Sprint 2
