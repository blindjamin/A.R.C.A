# Tareas: Geolocalización en solicitudes de retiro

> Plan: [`plan-geolocalizacion.md`](plan-geolocalizacion.md) · Spec: [`docs/specs/SPEC-geolocalizacion.md`](../docs/specs/SPEC-geolocalizacion.md)
> Una rama para todo. Un commit por tarea, con `IA:`, `HU:` y `Revisor:`.

Comandos de verificación:

```bash
cd apps/backend && npm run lint && npm run test && npm run build
cd apps/frontend && npm run lint && npm run build
```

---

## Fase 0: Base

### Tarea 0: Integrar el formulario de #104 en la rama

**Descripción:** Revisar y aprobar #104 (el revisor eres tú). Cuando esté en `develop`, traer
`develop` a la rama. Sin esto no existe el campo de dirección ni el envío por FormData.

**Aceptación:**
- [ ] #104 integrado en `develop`.
- [ ] La rama tiene `develop` al día y crea solicitudes con foto y dirección.

**Verificación:**
- [ ] Crear una solicitud en local con foto y dirección → 201.

**Depende de:** nada · **Archivos:** ninguno · **Tamaño:** XS

---

## Fase 1: Parte A — Captura

### Tarea 1: Validar el rango de lat/lng al crear

**Descripción:** En `CreateSolicitudRetiroDto`, cambiar `@IsString()` por `@IsLatitude()` y
`@IsLongitude()` en `latitudCapturada` y `longitudCapturada` (siguen opcionales y llegan como
texto del FormData).

**Aceptación:**
- [ ] `"-33.63660000"` y `"-71.62640000"` pasan; si no vienen, también.
- [ ] `"abc"`, `"-91"` y `"181"` responden 400.

**Verificación:**
- [ ] `npm run test -- create-solicitud-retiro.dto` en verde.

**Depende de:** nada · **Tamaño:** XS
**Archivos:**
- `apps/backend/src/solicitudes-retiro/dto/create-solicitud-retiro.dto.ts`
- `apps/backend/src/solicitudes-retiro/dto/create-solicitud-retiro.dto.spec.ts` (nuevo)

### Tarea 2: Coordenadas al reenviar

**Descripción:** `ReenviarSolicitudRetiroDto` acepta `latitudCapturada` y `longitudCapturada`
(opcionales, con rango). En el servicio: si llegan, se guardan; si cambia `direccionRetiro` y no
llegan, se ponen en `NULL` para no dejar un punto equivocado.

**Aceptación:**
- [ ] Reenviar con dirección y coordenadas nuevas → quedan las nuevas.
- [ ] Reenviar con dirección nueva y sin coordenadas → lat/lng en `NULL`.
- [ ] Reenviar sin cambiar la dirección → las coordenadas no cambian.

**Verificación:**
- [ ] `npm run test -- solicitudes-retiro.service` en verde, con los 3 casos.

**Depende de:** nada · **Tamaño:** S
**Archivos:**
- `apps/backend/src/solicitudes-retiro/dto/reenviar-solicitud-retiro.dto.ts`
- `apps/backend/src/solicitudes-retiro/solicitudes-retiro.service.ts`
- `apps/backend/src/solicitudes-retiro/solicitudes-retiro.service.spec.ts`

### Tarea 3: Botón "Usar mi ubicación" en la nueva solicitud

**Descripción:** Hook `useUbicacionRetiro` (estados `inactivo` / `pidiendo` / `ok` / `error`,
`pedir()`, `quitar()`, precisión en metros), siguiendo `useOrigenAproximado`. Componente
`CampoDireccion` que toma el input de dirección de #104 y le suma el botón. `NuevaSolicitud` lo usa
y manda lat/lng con 8 decimales. `CrearSolicitudInput` suma los dos campos opcionales.

**Aceptación:**
- [ ] El permiso se pide solo al tocar el botón; sin `geolocation` o sin HTTPS, el botón no se muestra.
- [ ] Con permiso, la solicitud queda con lat/lng en la base. Al denegarlo o al usar "Quitar", queda sin ellos.
- [ ] Mensajes de error de la spec §4, sin bloquear el envío.

**Verificación:**
- [ ] `lint` y `build` del front.
- [ ] Manual en vista móvil: permitir, denegar y quitar → revisar `latitud_capturada` en MySQL.

**Depende de:** T0, T1 · **Tamaño:** M
**Archivos:**
- `apps/frontend/src/features/solicitud-retiro/useUbicacionRetiro.ts` (nuevo)
- `apps/frontend/src/features/solicitud-retiro/CampoDireccion.tsx` (nuevo)
- `apps/frontend/src/features/solicitud-retiro/NuevaSolicitud.tsx`
- `apps/frontend/src/api/arca.ts`

### Tarea 4: Ubicación al corregir y reenviar

**Descripción:** El formulario de reenvío de `MisSolicitudes` (que agrega #104) usa
`CampoDireccion`. `ReenviarSolicitudInput` suma lat/lng.

**Aceptación:**
- [ ] Al corregir, el vecino puede usar su ubicación y se guarda.
- [ ] Si cambia la dirección sin ubicación, la solicitud queda sin coordenadas (lo hace T2).

**Verificación:**
- [ ] `lint` y `build`.
- [ ] Manual: una solicitud en "Requiere cambios" → corregir con y sin ubicación → revisar la base.

**Depende de:** T2, T3 · **Tamaño:** S
**Archivos:**
- `apps/frontend/src/pages/MisSolicitudes.tsx`
- `apps/frontend/src/api/arca.ts`

### Tarea 5: Borrar las coordenadas junto con la dirección (con Miguel)

**Descripción:** Proponer a Miguel que `ConservacionDireccionesService` (#105) y la cancelación
pongan también `latitud_capturada` y `longitud_capturada` en `NULL`. Si él lo hace en #105, esta
tarea solo verifica. **No se mete sin su visto bueno.**

**Aceptación:**
- [ ] Cancelar una solicitud con coordenadas → lat/lng en `NULL`.
- [ ] Una `rechazada` con `fecha_cierre` de hace 40 días → lat/lng en `NULL` al reiniciar.

**Verificación:**
- [ ] `npm run test -- conservacion-direcciones` en verde.

**Depende de:** #105 integrado · **Tamaño:** S
**Archivos:**
- `apps/backend/src/solicitudes-retiro/conservacion-direcciones.service.ts` (+ `.spec.ts`)
- `apps/backend/src/solicitudes-retiro/solicitudes-retiro.service.ts` (cancelar)

### Checkpoint 1: Parte A
- [ ] `lint`, `test` y `build` en verde en backend y frontend.
- [ ] Una solicitud creada con ubicación aparece en su sector del mapa de calor del panel.
- [ ] Revisión contigo antes de seguir.

---

## Fase 2: Parte B — Geocodificación

### Tarea 6: Fijar el bbox de la comuna

**Descripción:** Consultar una sola vez el `boundingbox` de Nominatim para "Santo Domingo,
Provincia de San Antonio, Valparaíso" y dejarlo como constante en el backend y el front, con
`CENTRO_COMUNA`.

**Aceptación:**
- [ ] Los 5 centroides de `admin/mapa-calor/sectores.constants.ts` caen dentro del bbox.
- [ ] Llolleo y Cartagena (comunas vecinas) quedan fuera.

**Verificación:**
- [ ] Test chico en `geo.constants.spec.ts` que compruebe los dos puntos de arriba.

**Depende de:** nada · **Tamaño:** S
**Archivos:**
- `apps/backend/src/geo/geo.constants.ts` (nuevo) + `.spec.ts`
- `apps/frontend/src/features/solicitud-retiro/geo.constants.ts` (nuevo)

### Tarea 7: `GeoService.reverse` con cola y caché

**Descripción:** `consultar()` (fetch + timeout de 5 s + `User-Agent` + 503 uniforme), cola por
proveedor (1,1 s entre llamadas, 503 con más de 5 en espera), caché `Map` (24 h, 1.000 entradas)
y `reverse(lat, lon)`, que valida el bbox (422) y arma `{ direccion, tieneNumero }`.

**Aceptación:**
- [ ] Todos los casos de `reverse`, cola y caché de la spec §10.
- [ ] Ningún log incluye coordenadas.

**Verificación:**
- [ ] `npm run test -- geo.service` en verde, con `fetch` simulado y timers falsos.

**Depende de:** T6 · **Tamaño:** M
**Archivos:**
- `apps/backend/src/geo/geo.service.ts` (nuevo)
- `apps/backend/src/geo/geo.service.spec.ts` (nuevo)
- `apps/backend/src/geo/geo.constants.ts`

### Tarea 8: `GeoService.buscar` con Photon

**Descripción:** `buscar(q)` con la misma cola y caché: Photon con `bbox` y `limit=5`, descarta
lo que cae fuera y arma `[{ direccion, lat, lon }]`.

**Aceptación:**
- [ ] Descarta los resultados fuera del bbox y corta en 5.
- [ ] La clave de caché normaliza mayúsculas y espacios.

**Verificación:**
- [ ] `npm run test -- geo.service` en verde.

**Depende de:** T7 · **Tamaño:** S
**Archivos:**
- `apps/backend/src/geo/geo.service.ts`
- `apps/backend/src/geo/geo.service.spec.ts`

### Tarea 9: Endpoints `/api/geo/reverse` y `/api/geo/buscar`

**Descripción:** Controller con DTOs de query (`lat`/`lon` como `OrigenDto` pero obligatorios;
`q` de 3 a 100 caracteres), `GeoModule`, registro en `AppModule` y `LIMITE_GEO = 20` con
`LimiteGeo()`.

**Aceptación:**
- [ ] Sin sesión → 401. Con datos inválidos → 400. Con más de 20 por minuto → 429.
- [ ] Con sesión y la red real, `curl` devuelve una dirección de Santo Domingo.

**Verificación:**
- [ ] `npm run test` en verde (sumar el caso 429 al estilo de `seguridad-rate-limit.spec.ts`).
- [ ] Manual: `dev/login` + `curl` a los dos endpoints. Revisar que el log no tenga coordenadas.

**Depende de:** T7, T8 · **Tamaño:** M
**Archivos:**
- `apps/backend/src/geo/geo.controller.ts` (nuevo)
- `apps/backend/src/geo/dto/consulta-geo.dto.ts` (nuevo)
- `apps/backend/src/geo/geo.module.ts` (nuevo)
- `apps/backend/src/app.module.ts`
- `apps/backend/src/core/seguridad/limites.ts`

### Checkpoint 2: Backend de la parte B
- [ ] `lint`, `test` y `build` del backend en verde.
- [ ] Los dos endpoints responden en local con la red real.

### Tarea 10: Dirección desde el GPS en el formulario

**Descripción:** `direccionDesdeCoordenadas()` en `arca.ts`. Cuando `useUbicacionRetiro` queda en
`ok`, `CampoDireccion` la consulta: si el campo está vacío lo rellena; si tiene texto (lo normal,
porque #104 lo precarga del perfil) ofrece "¿Usar *X*?". Si no hay número, da la pista. Con 422 o
503 no muestra nada extra.

**Aceptación:**
- [ ] Nunca pisa el texto del vecino sin que acepte.
- [ ] Con el backend devolviendo 503, el formulario funciona igual.

**Verificación:**
- [ ] `lint` y `build`. Manual con el campo vacío, con texto y con el backend detenido.

**Depende de:** T3, T9 · **Tamaño:** S
**Archivos:**
- `apps/frontend/src/api/arca.ts`
- `apps/frontend/src/features/solicitud-retiro/CampoDireccion.tsx`

### Tarea 11: Autocompletar la dirección

**Descripción:** `buscarDirecciones()` en `arca.ts`. En `CampoDireccion`, desde 3 caracteres y con
400 ms sin escribir: lista `role="listbox"` navegable con flechas, Enter y Esc, y la atribución
"Direcciones © OpenStreetMap". Elegir una sugerencia fija el texto y sus coordenadas.

**Aceptación:**
- [ ] Una consulta por pausa al escribir, no una por tecla.
- [ ] Usable solo con el teclado, y el lector de pantalla anuncia las opciones.
- [ ] Elegir una sugerencia reemplaza las coordenadas del GPS.

**Verificación:**
- [ ] `lint` y `build`. Manual: escribir "av del mar" y revisar en la pestaña de red que salga una sola consulta.

**Depende de:** T10 · **Tamaño:** M
**Archivos:**
- `apps/frontend/src/api/arca.ts`
- `apps/frontend/src/features/solicitud-retiro/CampoDireccion.tsx`

### Checkpoint 3: Parte B
- [ ] Pruebas manuales 4, 5 y 9 de la spec §10.
- [ ] Revisión contigo antes de seguir.

---

## Fase 3: Parte C — Mapa

### Tarea 12: `MapaPin` con pin central

**Descripción:** Componente cargado con `React.lazy` desde `CampoDireccion`, con su propio CSS de
leaflet. Pin fijo en el centro, `maxBounds` del bbox, zoom de 13 a 19, consulta de dirección en
`moveend` con 600 ms de espera, 422 deshabilita Confirmar, Confirmar y Cancelar según la spec §6.

**Aceptación:**
- [ ] Confirmar guarda el centro como coordenadas; Cancelar no cambia nada.
- [ ] El mapa no sale de la comuna.
- [ ] Leaflet sale en un chunk aparte y el chunk inicial de la PWA no crece más de 1 KB.

**Verificación:**
- [ ] `build` antes y después: comparar el tamaño del chunk de entrada.
- [ ] Manual: pruebas 6, 7 y 8 de la spec §10.

**Depende de:** T6, T10 · **Tamaño:** M
**Archivos:**
- `apps/frontend/src/features/solicitud-retiro/MapaPin.tsx` (nuevo)
- `apps/frontend/src/features/solicitud-retiro/CampoDireccion.tsx`

### Tarea 13: "Mi ubicación" en el mapa y accesibilidad

**Descripción:** Botón dentro del mapa que reutiliza `useUbicacionRetiro`. Foco atrapado en el
modal, Esc cancela, foco de vuelta al botón al cerrar y atribución visible.

**Aceptación:**
- [ ] "Mi ubicación" centra el mapa en el GPS.
- [ ] Todo el flujo del mapa se puede usar sin mouse.

**Verificación:**
- [ ] `lint` y `build`. Manual con teclado y en vista móvil.

**Depende de:** T12 · **Tamaño:** S
**Archivos:**
- `apps/frontend/src/features/solicitud-retiro/MapaPin.tsx`

### Checkpoint final
- [ ] `lint`, `test` y `build` en verde en backend y frontend.
- [ ] Las 10 pruebas manuales de la spec §10 hechas.
- [ ] Todos los criterios de éxito de la spec §12 cumplidos.
- [ ] T5 resuelta con Miguel.
- [ ] `curl` desde el servidor arrendado hacia Nominatim y Photon (antes de anunciarlo).
- [ ] PR a `develop` con la skill `abrir-pr`.
