# Plan de implementación: Geolocalización en solicitudes de retiro

> **Fecha:** 2026-10-16 · **Autor:** Benjamín Paicil (con asistencia de IA)
> **Spec:** [`docs/specs/SPEC-geolocalizacion.md`](../docs/specs/SPEC-geolocalizacion.md) · **Tareas:** [`todo-geolocalizacion.md`](todo-geolocalizacion.md)
> **Rama:** `2026-10-16-benjamin-geolocalizacion-spec` (una sola rama; commits por parte y por área)

## Resumen

Tres partes en orden: **A** captura la ubicación y la manda con la solicitud, **B** convierte
coordenadas en dirección y autocompleta con un proxy en el backend, y **C** suma un mapa para
ajustar el punto. Cada parte es una porción vertical que se puede probar sola: al terminar A, el
mapa de calor ya recibe datos reales aunque B y C no existan.

## Estado del código hoy (revisado el 2026-10-16)

| Pieza | Dónde | Qué significa para el plan |
|---|---|---|
| Formulario con dirección y foto | **PR #104** (Miguel, revisor: blindjamin), no está en `develop` | Es la base de la parte A. `develop` todavía manda JSON y falla; hay que integrar #104 antes de empezar |
| `aFormData()` en `api/arca.ts` (#104) | Omite los campos `undefined` | Para agregar `latitudCapturada` / `longitudCapturada` basta con sumarlas a `CrearSolicitudInput` |
| Dirección precargada desde el perfil (#104) | `NuevaSolicitud` | El campo casi nunca está vacío: lo normal será **ofrecer** la dirección del GPS, no rellenarla |
| `ReenviarSolicitudRetiroDto` | Permite cambiar `direccionRetiro`, no lat/lng | Si cambia la dirección, las coordenadas viejas quedan apuntando a otro lugar → tarea 2 |
| `ConservacionDireccionesService` | **PR #105** (Miguel, revisor: Starossta) | Borra `direccion_retiro` y `direccion_anonimizada` al cancelar y a los 30 días, **pero no lat/lng** → tarea 5 |
| PR #107 (Miguel) | Quita el GPS de las fotos | Mismo criterio: la ubicación solo se guarda cuando el vecino la da a propósito |
| `OrigenDto` (marketplace) | `@Type(() => Number)` + `@IsLatitude()`, parámetros `lat` / **`lon`** | Se reutiliza el patrón y el nombre `lon` en `/api/geo/reverse` (la spec decía `lng`) |
| `ClaveUnicaService.llamar` | `fetch` + `AbortSignal.timeout` + error uniforme | Patrón de `GeoService.consultar` |
| `limites.ts` + `SeguridadModule` | Throttler global por IP | `LIMITE_GEO` y `LimiteGeo()` como `LimiteUbicacion()` |
| Guard global de sesión + `@Public()` | `core/auth` | `/api/geo/*` queda protegido sin hacer nada; no usar `@Public()` |
| `ValidationPipe` con `forbidNonWhitelisted` | `main.ts` | Todo campo nuevo del FormData tiene que estar en el DTO, o responde 400 |
| `seguridad-rate-limit.spec.ts` | Supertest con módulo armado a mano | Patrón para probar el límite de `/api/geo` |
| Leaflet | Solo en el chunk del panel (`App.tsx`, `admin/admin.css`) | `MapaPin` con `React.lazy` y su propio `import 'leaflet/dist/leaflet.css'` |
| Frontend sin framework de pruebas | `package.json` | El front se verifica con `lint`, `build` y pruebas manuales |

## Decisiones de arquitectura

- **Primero integrar #104.** Sin él no hay campo de dirección ni FormData. No se duplica su trabajo.
- **Reenviar:** acepta `latitudCapturada` / `longitudCapturada`. Si cambia la dirección y no llegan
  coordenadas nuevas, se ponen en `NULL`. Mejor sin punto que con un punto equivocado.
- **Retención:** las coordenadas se borran junto con la dirección (al cancelar y a los 30 días).
  Es área de Miguel: se le propone el cambio sobre #105 y no se mete sin su visto bueno.
- **`CampoDireccion` concentra la lógica:** el input de #104, el botón de ubicación, las
  sugerencias y el botón del mapa. `NuevaSolicitud` y el reenvío en `MisSolicitudes` lo reutilizan.
- **El backend de geocodificación se prueba solo con `fetch` simulado.** Ningún test sale a
  internet.
- **Sin dependencias nuevas** en ninguna parte.

## Orden y dependencias

```
#104 integrado ─┬─ T1 DTO crear ─┬─ T3 CampoDireccion + botón ─┬─ T4 reenvío en MisSolicitudes
                └─ T2 reenviar ──┘                              │
#105 integrado ─── T5 retención (Miguel)                        │
                                                                │
T6 bbox ─┬─ T7 GeoService reverse ─┬─ T9 controller ─┬─ T10 front reverse ─┬─ T12 MapaPin ─ T13 pulido mapa
         │                         │                 └─ T11 autocompletar ─┘
         └─ T8 GeoService buscar ──┘
```

T6 a T9 (backend de la parte B) no dependen de la parte A y se pueden hacer en paralelo con T3 y T4.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| #104 cambia en revisión o tarda | Alto | Revisarlo primero (eres el revisor). T1, T2 y T6 a T9 no dependen de él |
| El servidor no llega a Nominatim o Photon | Medio | El front ya funciona sin B (503 = sin sugerencias). Probar con `curl` desde el servidor antes de anunciarlo |
| Bloqueo por uso indebido en Nominatim | Medio | Cola de 1,1 s, caché, User-Agent, límite por IP y nada de autocompletar en Nominatim |
| OSM sin numeración en Santo Domingo | Bajo | Pista "Agrega el número de tu casa" y campo siempre editable |
| Las coordenadas sobreviven al plazo de la dirección | Alto (privacidad) | T5 con Miguel, antes del PR |
| Leaflet entra en el bundle de la PWA | Medio | `React.lazy` y comparar la salida de `vite build` antes y después (T12) |
| El permiso de ubicación se rechaza de entrada | Bajo | Se pide solo al tocar el botón; sin permiso todo sigue funcionando |

## Preguntas abiertas

- ¿Miguel acepta que T5 (borrar lat/lng con la dirección) vaya sobre #105, o lo hace él?
- ¿`latitudCapturada` significa "el punto del retiro" y no "dónde estaba el vecino"? El plan asume
  que sí (sugerencias y mapa la reemplazan).
- ¿El mapa se ofrece siempre o solo cuando la precisión del GPS supera 50 m? El plan lo deja
  siempre disponible y opcional.
- Número de HU (el plan usa `HU-01`, la de solicitar retiro, mientras no haya otra).
