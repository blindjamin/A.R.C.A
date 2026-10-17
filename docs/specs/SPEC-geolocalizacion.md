# Spec: Geolocalización en solicitudes de retiro

> **Estado:** BORRADOR (2026-10-16) · pendiente de revisión
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **HU:** por asignar

## 1. Objetivo

Hoy el vecino escribe la dirección de retiro a mano y el front no manda coordenadas, aunque el
backend las acepta (`latitudCapturada` / `longitudCapturada`) y el panel ya las usa en el mapa de
calor, la derivación con Excel y las pagadas. Esas columnas solo se llenan con el seed.

Se construye en tres partes, en este orden:

| Parte | Qué hace |
|---|---|
| **A. Captura** | Botón "Usar mi ubicación" en `NuevaSolicitud`. Envía lat/lng al crear la solicitud |
| **B. Geocodificación** | El backend convierte coordenadas en dirección (Nominatim) y sugiere direcciones mientras se escribe (Photon) |
| **C. Mapa** | Mapa Leaflet para ajustar el punto cuando el GPS se equivoca |

Historias:
- *Como vecino, quiero usar mi ubicación al pedir un retiro, para no escribir la dirección desde
  cero y que el camión llegue al lugar exacto.*
- *Como vecino, quiero ver en un mapa dónde quedará el retiro y moverlo hasta mi casa, si el GPS se
  equivoca.*

Solo se usan servicios gratuitos basados en OpenStreetMap. ARCA no hace entregas ni tiene puntos
de entrega: el retiro siempre es en la dirección que da el vecino.

## 2. Decisiones

1. **Coordenadas exactas en la solicitud.** El camión tiene que llegar al punto. A diferencia del
   marketplace, no se aproximan al guardar; la aproximación a 20 m queda en la exportación
   (`admin/derivaciones/coordenadas-aproximadas.ts`).
2. **Ubicación opcional.** Sin permiso, sin GPS o con el servicio caído, el vecino escribe la
   dirección como hoy. Nada de esto bloquea el envío.
3. **El permiso se pide solo al tocar el botón**, nunca al entrar a la app.
4. **El navegador nunca llama a Nominatim ni a Photon**; todo pasa por el backend.
5. **La dirección siempre queda editable** y nunca se pisa lo que escribió el vecino sin
   preguntar. OSM no siempre tiene la numeración de cada casa en una comuna chica.
6. **Una sola rama** para las tres partes. Los commits van separados por parte y por área
   (backend / frontend) para que la revisión sea más fácil.

## 3. Lo que se reutiliza

- `features/marketplace/distancia.ts` (`useOrigenAproximado`): patrón de `getCurrentPosition` y
  manejo del permiso denegado.
- `admin/pages/MapaCalor.tsx`: `react-leaflet` con tiles de OSM y su atribución.
- `core/auth/clave-unica.service.ts` (`llamar`): `fetch` con `AbortSignal.timeout` y errores
  uniformes.
- `core/seguridad/limites.ts`: decoradores de límite por IP (`@nestjs/throttler`).
- `leaflet` 1.9 y `react-leaflet` 5 ya están instalados. **No se agregan dependencias.**

---

## 4. Parte A — Captura de la ubicación

### Comportamiento

1. Junto al campo "Dirección de retiro" aparece **"Usar mi ubicación"**.
2. Al tocarlo se llama a `navigator.geolocation.getCurrentPosition` con
   `enableHighAccuracy: true`, `timeout: 10_000` y `maximumAge: 60_000`. Precisión alta, porque el
   punto es para el camión.
3. Estados del botón: `inactivo` → `pidiendo` ("Obteniendo ubicación…") → `ok` ("Ubicación
   agregada · ±N m", con opción "Quitar") o `error`.
4. Errores, sin bloquear el formulario:
   - Permiso denegado: "No diste permiso de ubicación. Puedes escribir la dirección igual."
   - Sin señal o timeout: "No pudimos obtener tu ubicación. Intenta de nuevo o escribe la
     dirección."
   - Sin `geolocation` o sin HTTPS (`!window.isSecureContext`): el botón no se muestra.
5. Al crear la solicitud, si hay ubicación, se agregan al FormData `latitudCapturada` y
   `longitudCapturada` con 8 decimales (como `DECIMAL(10,8)`). Sin ubicación, no se envían.
6. Las coordenadas solo viven en el estado del componente. No se guardan en `localStorage` ni en el
   perfil.

### Backend

`create-solicitud-retiro.dto.ts`: `@IsLatitude()` / `@IsLongitude()` en vez de solo `@IsString()`,
para rechazar valores fuera de rango con 400. No hay migración: las columnas existen desde
`1782163400000`.

**Reenviar** (`reenviar-solicitud-retiro.dto.ts`): también acepta `latitudCapturada` y
`longitudCapturada`, opcionales y con rango. Si cambia `direccionRetiro` y no llegan coordenadas
nuevas, se ponen en `NULL`: mejor sin punto que con uno que apunta a otra casa.

**Retención:** las coordenadas se borran junto con la dirección: al cancelar y a los 30 días del
cierre (`ConservacionDireccionesService`, PR #105 de Miguel). Se coordina con él.

### Base

El campo de dirección, la foto y el envío por FormData llegan con el **PR #104** (Miguel). Esta
parte se monta encima: `aFormData()` ya omite los campos `undefined`, y la dirección viene
precargada del perfil. Por eso lo normal será *ofrecer* la dirección del GPS, no rellenarla.

---

## 5. Parte B — Geocodificación

| Uso | Servicio | Por qué |
|---|---|---|
| Coordenadas → dirección | Nominatim `/reverse` | Mejor detalle de calle y número |
| Texto → sugerencias | Photon `/api` | Pensado para autocompletar; Nominatim prohíbe usarlo para eso |

### Endpoints

Los dos exigen sesión (guard global de `arca_sesion`) y llevan un límite propio de 20 consultas por
minuto por IP (`LIMITE_GEO` y `LimiteGeo()` en `core/seguridad/limites.ts`).

**`GET /api/geo/reverse?lat=&lon=`**
- `lat` y `lon` pasan por `@Type(() => Number)` + `@IsLatitude()` / `@IsLongitude()`, igual que `OrigenDto` del marketplace (mismo nombre `lon`).
- Si el punto cae fuera del bbox de la comuna → **422** "La ubicación está fuera de Santo Domingo.
  Escribe la dirección del retiro." En ese caso no se consulta a Nominatim.
- Llama a `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=&lon=&zoom=18&addressdetails=1&accept-language=es`.
- **200:** `{ "direccion": "Av. del Mar 123, Santo Domingo", "tieneNumero": true }`. La dirección se
  arma con `road` + `house_number` (si viene) + `town`/`village`/`city`. Sin resultado →
  `{ "direccion": null, "tieneNumero": false }`.

**`GET /api/geo/buscar?q=`**
- `q` entre 3 y 100 caracteres, con `trim`.
- Llama a `https://photon.komoot.io/api?q=&limit=5&bbox=<minLng>,<minLat>,<maxLng>,<maxLat>`.
- **200:** hasta 5 resultados, descartando los que caen fuera del bbox:
  `[{ "direccion": "Av. del Mar 123, Santo Domingo", "lat": -33.6366, "lon": -71.6264 }]`.

**Errores:** si el proveedor da timeout (5 s), un error de red o una respuesta que no es 2xx →
**503** "El buscador de direcciones no está disponible. Escribe la dirección." El front lo trata
como "sin sugerencias".

### Reglas de uso de los servicios

| Regla | Cómo se cumple |
|---|---|
| Identificar la app | `User-Agent: ARCA-SantoDomingo/1.0 (soporte.arcaa@gmail.com)` en cada llamada |
| Nominatim: máximo 1 consulta por segundo | Cola en memoria por proveedor: al menos 1.100 ms entre llamadas. Con más de 5 en espera → 503 inmediato. A Photon se le aplica la misma cola por cortesía |
| No repetir consultas iguales | Caché en memoria de 24 h y máximo 1.000 entradas (se descarta la más antigua). Clave de `reverse`: lat/lng a 4 decimales (~11 m). Clave de `buscar`: `q` en minúsculas y sin espacios repetidos |
| Atribución ODbL | El front muestra "Direcciones © OpenStreetMap" junto a las sugerencias |
| Autocompletar no va a Nominatim | Solo Photon recibe texto parcial |

### Privacidad

- A Nominatim y Photon solo se envían coordenadas o texto. Nunca el id del vecino, la cookie ni el
  correo.
- Los logs registran proveedor, estado HTTP y duración. **Nunca** las coordenadas ni el texto
  buscado.
- La caché vive solo en la memoria del proceso y se pierde al reiniciar.

### Frontend

1. **Después de la captura:** al quedar la ubicación en `ok`, se llama a
   `direccionDesdeCoordenadas`. Si el campo está vacío, se rellena. Si tiene texto, aparece
   "¿Usar *Av. del Mar 123*?" con un botón para reemplazarlo. Si `tieneNumero` es `false`, se
   agrega la pista "Agrega el número de tu casa".
2. **Autocompletar:** desde 3 caracteres, con 400 ms sin escribir, se llama a
   `buscarDirecciones`. Las sugerencias aparecen bajo el campo (`role="listbox"`, navegables con
   flechas y Enter). Elegir una pone su texto en el campo y fija sus coordenadas, en lugar de las
   del GPS.
3. Si el vecino edita el texto después, las coordenadas se mantienen: el texto es lo que lee el
   camión y las coordenadas son el punto.

---

## 6. Parte C — Mapa para ajustar el punto

### Comportamiento

1. Bajo el campo de dirección aparece **"Ver o ajustar en el mapa"**. Con coordenadas, abre el
   mapa en ese punto. Sin ellas, lo abre en el centro de la comuna.
2. Hoja a pantalla completa en móvil y modal en escritorio, con `zoom` 17.
3. **El pin queda fijo en el centro y lo que se mueve es el mapa**, como en las apps de transporte.
   Es más fácil con el dedo que arrastrar un marcador chico, y evita el problema del ícono por
   defecto de Leaflet con Vite: el pin es un `div` encima del mapa con `pointer-events-none`, no un
   `L.Marker`.
4. En `moveend`, con 600 ms sin movimiento, se llama a `direccionDesdeCoordenadas` con el centro y
   se muestra la dirección arriba ("Buscando dirección…" mientras tanto). Con 422 se muestra "Este
   punto está fuera de Santo Domingo" y se deshabilita **Confirmar**. Con 503 se puede confirmar
   igual.
5. **Confirmar** guarda el centro como coordenadas de la solicitud. La dirección sigue la regla de
   la parte B (rellenar si está vacía, ofrecer si tiene texto). **Cancelar** no cambia nada.
6. El mapa no sale del bbox (`maxBounds` + `maxBoundsViscosity: 1`) y el zoom va de 13 a 19.
7. Botón **"Mi ubicación"** dentro del mapa: reutiliza el hook de la parte A y centra ahí.
8. Atribución visible "© OpenStreetMap contributors", como en `MapaCalor`.
9. Teclado: el modal atrapa el foco, Esc cancela y todo se puede usar sin mouse.

### Peso de la PWA

Leaflet hoy está solo en el chunk del panel (`App.tsx`: "no debe pesar en la PWA del vecino",
SPEC-frontend-unificado §2.2, criterio 3). Para mantenerlo:

- `MapaPin.tsx` se carga con `React.lazy`, recién al tocar el botón.
- `leaflet/dist/leaflet.css` se importa dentro de `MapaPin.tsx`, no en el CSS global.
- El chunk inicial de la PWA no crece más de 1 KB y leaflet sale en un chunk aparte (se ve en
  `vite build`).

### Tiles

Se usan los tiles públicos de OSM, igual que `MapaCalor`. Su política pide tráfico bajo,
atribución y no descargar tiles en bloque. Con pocas solicitudes al día y un mapa que se abre a
pedido, se cumple. Si crece, basta con cambiar la `url` del `TileLayer`.

---

## 7. Archivos

| Archivo | Parte | Cambio |
|---|---|---|
| `apps/backend/src/solicitudes-retiro/dto/create-solicitud-retiro.dto.ts` | A | `@IsLatitude()` / `@IsLongitude()` |
| `apps/backend/src/solicitudes-retiro/dto/create-solicitud-retiro.dto.spec.ts` (nuevo) | A | Pruebas del DTO |
| `apps/backend/src/geo/geo.constants.ts` (nuevo) | B | `BBOX_SANTO_DOMINGO`, URLs, `USER_AGENT`, tiempos y tamaños |
| `apps/backend/src/geo/geo.service.ts` (nuevo) | B | Cola, caché, `fetch` y mapeo de respuestas |
| `apps/backend/src/geo/geo.controller.ts` (nuevo) | B | Los dos endpoints, con DTOs de query |
| `apps/backend/src/geo/geo.module.ts` (nuevo) + `app.module.ts` | B | Registro del módulo |
| `apps/backend/src/geo/geo.service.spec.ts` (nuevo) | B | Pruebas |
| `apps/backend/src/core/seguridad/limites.ts` | B | `LIMITE_GEO = 20` y `LimiteGeo()` |
| `apps/frontend/src/api/arca.ts` | A, B | Lat/lng en `CrearSolicitudInput`; `direccionDesdeCoordenadas()` y `buscarDirecciones()` |
| `apps/frontend/src/features/solicitud-retiro/useUbicacionRetiro.ts` (nuevo) | A | Hook del botón: `pedir()`, `quitar()`, `{ estado, coordenadas, precisionM, error }` |
| `apps/frontend/src/features/solicitud-retiro/CampoDireccion.tsx` (nuevo) | A, B, C | Input, botón de ubicación, sugerencias, atribución y botón del mapa. Saca esa lógica de `NuevaSolicitud` |
| `apps/frontend/src/features/solicitud-retiro/MapaPin.tsx` (nuevo) | C | Mapa con pin central, dirección, Confirmar y Cancelar. `export default` para `lazy` |
| `apps/frontend/src/features/solicitud-retiro/geo.constants.ts` (nuevo) | C | `BBOX_SANTO_DOMINGO` y `CENTRO_COMUNA` (los mismos valores del backend) |
| `apps/frontend/src/features/solicitud-retiro/NuevaSolicitud.tsx` | A | Usa `CampoDireccion` y manda las coordenadas |

## 8. Comandos

```bash
cd apps/backend && npm run lint && npm run test && npm run build
cd apps/frontend && npm run lint && npm run build
```

## 9. Estilo de código

Nombres y textos en español neutro, sin voseo. Comentarios solo para lo que no es obvio.

```ts
// Hook de la parte A, siguiendo useOrigenAproximado
export type EstadoUbicacion = 'inactivo' | 'pidiendo' | 'ok' | 'error';

export function useUbicacionRetiro() {
  const [estado, setEstado] = useState<EstadoUbicacion>('inactivo');
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const disponible = 'geolocation' in navigator && window.isSecureContext;
  // pedir() llama a getCurrentPosition; quitar() vuelve a 'inactivo'.
}
```

```ts
// GeoService, como ClaveUnicaService.llamar
private async consultar(url: URL): Promise<unknown> {
  await this.cola.turno(); // ponytail: cola en memoria; una instancia por backend
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(GEO_TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } catch (e) {
    this.logger.warn(`${url.host} falló: ${(e as Error).message}`);
    throw new ServiceUnavailableException(MENSAJE_GEO_NO_DISPONIBLE);
  }
}
```

```tsx
// MapaPin: el centro del mapa es el punto
function SeguirCentro({ onCentro }: { onCentro: (c: Coordenadas) => void }) {
  useMapEvents({
    moveend: (e) => {
      const { lat, lng } = e.target.getCenter();
      onCentro({ latitud: lat, longitud: lng });
    },
  });
  return null;
}
```

## 10. Pruebas

**Backend (Jest):**
- DTO de solicitud: acepta lat/lng válidos y ausentes, y rechaza `"abc"`, `"-91"` y `"181"`.
- `geo.service.spec.ts`, con `fetch` simulado y timers falsos:
  - `reverse` arma la dirección con y sin `house_number`, y devuelve `null` sin resultado.
  - Punto fuera del bbox → 422, sin llamar a `fetch`.
  - La segunda consulta igual sale de la caché (un solo `fetch`).
  - Dos consultas seguidas quedan separadas por al menos 1.100 ms.
  - Con 6 en cola → 503 inmediato.
  - Timeout o respuesta 500 → 503.
  - `buscar` descarta resultados fuera del bbox y corta en 5.
  - Se envía el `User-Agent` y nunca el id del vecino.

**Frontend (manual; no hay framework de pruebas), en celular o vista móvil:**
1. Permitir la ubicación → aparece la precisión → con el campo vacío se rellena la dirección → la
   solicitud queda con lat/lng en la base y aparece en el mapa de calor.
2. Denegar el permiso → mensaje claro → la solicitud se crea sin lat/lng.
3. "Quitar" la ubicación → la solicitud se crea sin lat/lng.
4. Con texto ya escrito → se ofrece la dirección sin pisarla.
5. Escribir "av del mar" → sugerencias solo de Santo Domingo, elegibles con el teclado.
6. Mapa: moverlo una cuadra → cambia la dirección → Confirmar → coordenadas nuevas en la base.
7. Mapa sin GPS: abre en el centro de la comuna. Llevarlo al borde: no sale.
8. Cancelar el mapa → nada cambia.
9. Backend de geocodificación caído → sin sugerencias, el mapa funciona y la solicitud se crea.
10. `vite build` → leaflet en un chunk aparte y la PWA sin crecer.

## 11. Límites

- **Siempre:** ubicación opcional y pedida con un gesto del vecino; pasar por el backend; respetar
  la cola y la caché; mostrar la atribución; dirección editable; mapa cargado a pedido.
- **Preguntar antes:** cambios de esquema, retención o aproximación de coordenadas (lo ve Miguel);
  cambiar de proveedor de geocodificación o de tiles; levantar Nominatim o Photon propios; agregar
  dependencias o plugins de Leaflet; guardar la caché en la base.
- **Nunca:** pedir ubicación al entrar a la app; guardar coordenadas en el navegador; llamar a
  Nominatim desde el navegador o usarlo para autocompletar; loguear coordenadas o texto buscado;
  mandar datos del vecino al proveedor; importar leaflet en el bundle inicial de la PWA; consultar
  la dirección en cada cuadro del arrastre.

## 12. Criterios de éxito

- [ ] Con permiso, la solicitud queda con `latitud_capturada` y `longitud_capturada` no nulos y con
      la posición real (±precisión del GPS).
- [ ] Sin permiso, con "Quitar" o con el servicio caído, la solicitud se crea igual.
- [ ] El backend responde 400 si llega una latitud o longitud fuera de rango.
- [ ] Ninguna pantalla pide permiso de ubicación sin que el vecino toque el botón.
- [ ] Con GPS dentro de la comuna, el campo vacío se rellena con una dirección real en menos de 3 s.
- [ ] Las sugerencias son solo de Santo Domingo.
- [ ] Nunca sale más de 1 consulta por segundo hacia cada proveedor (lo prueba el spec).
- [ ] Los logs del backend no contienen coordenadas ni texto buscado.
- [ ] El vecino puede mover el punto en el mapa, y Cancelar no cambia nada.
- [ ] El mapa no sale de Santo Domingo y avisa si el punto queda fuera.
- [ ] Leaflet no entra en el chunk inicial de la PWA.
- [ ] `lint`, `test` y `build` pasan en backend y frontend.

## 13. Riesgos y preguntas abiertas

- **Formulario base:** depende del PR #104 (Miguel; revisor: blindjamin). Hay que integrarlo antes
  de la parte A en el front.
- **Retención de coordenadas:** #105 borra la dirección, pero no lat/lng. ¿Lo agrega Miguel en
  #105 o va en esta rama con su visto bueno?
- **Bbox de la comuna:** falta fijar los límites reales. Se sacan una vez del `boundingbox` de
  Nominatim para "Santo Domingo, Provincia de San Antonio, Valparaíso" y se dejan como constante.
  Los centroides de `admin/mapa-calor/sectores.constants.ts` sirven para comprobarlos.
- **Salida a internet:** confirmar en el servidor arrendado que llega por HTTPS a
  `nominatim.openstreetmap.org` y `photon.komoot.io` (el SMTP ya sale).
- **Privacidad y retención:** Miguel valida el envío de coordenadas a OSMF y Komoot, y la
  retención de 90 días que indica el schema.
- **Significado de `latitudCapturada`:** si el vecino elige una sugerencia o mueve el mapa, se
  guarda ese punto y no el del GPS. ¿Está bien que signifique "el punto del retiro" y no "dónde
  estaba el vecino"?
- **Ubicación lejos del residuo:** si el vecino pide el retiro desde otro lugar, el GPS no sirve.
  ¿Basta con el texto "Úsalo solo si estás donde está el residuo" y el mapa?
- **¿Mapa opcional o sugerido?** La propuesta es opcional. ¿Debería ofrecerse solo cuando la
  precisión del GPS es mala (por ejemplo, más de 50 m)?
- **Fuera de alcance:** mostrar el pin en el detalle de la solicitud del panel (sería una HU del
  panel).
- **HU:** número por asignar.
