# Plan de implementación: Reunificación en un solo sitio

> **Fecha:** 2026-09-26 · **Autor:** Benjamín Paicil (con asistencia de IA)
> **Mapa:** [`docs/specs/MAPA_UNIFICACION.md`](../docs/specs/MAPA_UNIFICACION.md) · **Tareas:** [`todo.md`](todo.md)

## Resumen

Volver a un solo backend (`apps/backend`, `:3000`) y un solo front (`apps/frontend`, `:5173`), con
el panel municipal en `/admin/*` visible según el rol, y una sesión real (cookie de servidor) después
de ClaveÚnica. Se ejecuta con agentes de Claude Code, una tarea por sesión, en ramas y worktrees
separados, con revisión humana en cada checkpoint (regla A.14).

## Decisiones de arquitectura

- **Mover antes de cambiar.** `backend-unificado` y FU1 solo mueven código; los cambios de
  comportamiento van en tareas aparte, para que cada PR se pueda revisar.
- **Sesión en servidor con cookie, sin migraciones.** La cookie lleva `<session_id>.<secreto>` y la
  base guarda `sha256(secreto)` en `sesiones_ciudadano.jwt_token_hash` (SPEC-sesion-unica §2).
- **Transición sin romper a nadie.** El `Bearer <uuid>` sigue vivo solo con `ALLOW_DEV_LOGIN=true`
  hasta que el front usa la cookie (FU2); después se borra (SU4). Así el backend y el front avanzan
  en paralelo.
- **`@arca/core` se mantiene** durante la migración. Reabsorberlo se decide al final.
- **Seguridad adicional** (`control-acceso`) se especifica después de reunificar.

## Olas de ejecución

```
Fase 0 (personas)   integrar ramas de Miguel · congelar backend-admin/admin-web · aprobar specs
                        │
Ola 1  (paralelo)   [A] BU-1 → BU-2 → BU-3   ║   [B] SU-1
                        │  + BU-4 (2 PR de una línea)
        ── Checkpoint 1: backend único en verde; SesionService probado ──
                        │
Ola 2  (paralelo)   [A] SU-2 → SU-3          ║   [B] FU-1
        ── Checkpoint 2: login dev por cookie; panel en /admin con identidades dev ──
                        │
Ola 3  (secuencial) FU-2 → FU-3 → SU-4
        ── Checkpoint 3: un sitio, un login, sin Bearer ──
                        │
Ola 4  (paralelo)   SE-1 ║ SE-2 ║ SE-3
        ── Checkpoint final: clon limpio + recorrido completo ──
                        │
Después             SPEC-control-acceso (revisión de seguridad)
```

**Por qué este orden:**
- `backend-unificado` es mecánico y lo cubren los tests existentes. Va primero porque todo lo demás
  apunta a `:3000`.
- SU-1 solo toca `packages/arca-core/src/auth/` (archivos nuevos): no choca con el movimiento.
- FU-1 (mover el panel) no necesita la sesión nueva: sigue con las identidades de desarrollo.
- FU-2 necesita SU-2 (`/api/sesion` y dev login). SU-4 necesita FU-2 (nadie usa ya el Bearer).
- La documentación va al final, cuando la estructura ya no cambia.

**Paralelismo real:** 2 agentes en las olas 1 y 2, y 3 agentes en la ola 4. En la ola 3 las tareas
dependen una de otra: un solo agente.

## Protocolo para cada agente

Cada tarea de `todo.md` se lanza como un agente con `isolation: "worktree"`, con este brief:

```
Tarea <ID> de tasks/todo.md — <título>.
Rama: <rama indicada en la tarea>, creada desde origin/develop actualizado.
Lee primero: AGENTS.md (reglas A.1–A.14), tasks/todo.md#<ID>, <secciones de spec indicadas>.
Archivos a tocar: los listados en la tarea. Si necesitas tocar otro archivo o área, PARA y
reporta (regla A.7).
Criterios de aceptación y verificación: los de la tarea. Corre la verificación completa y
pega la salida en tu reporte.
Commits: convencionales en español, con trailers
  IA: agente
  HU: <HU de la tarea>
  Revisor: <revisor de la tarea>
NO hagas push, NO abras PR y NO integres: termina con el reporte (qué cambió, salida de la
verificación, dudas). La persona revisa y abre el PR con la skill abrir-pr.
```

**Modelo sugerido:**
- Movimientos (BU-1..3, FU-1, FU-3) y documentación (SE-*): Sonnet.
- Sesión y seguridad (SU-*, FU-2): Opus.

**Checkpoints:** son humanos. Se revisan y se integran los PR de la ola antes de lanzar la siguiente.
Un agente de la ola N+1 parte siempre de `origin/develop` con la ola N integrada.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Alguien abre PR contra `apps/backend-admin` o `apps/admin-web` durante el movimiento | Alto | Fase 0: aviso al equipo y congelamiento hasta el checkpoint 3 |
| Las ramas de Miguel (`seguridad-rate-limit`, `estados-mis-solicitudes`) se integran después del movimiento | Alto | Fase 0: se integran antes. Si no alcanzan, se rebasan sobre las rutas nuevas y no se mueven de nuevo |
| El movimiento cambia comportamiento sin que se note | Medio | Los tests se mueven sin editarse (SPEC-backend-unificado §4); los curl de verificación comparan los códigos |
| `forbidNonWhitelisted` rompe una llamada de la PWA | Bajo | Verificado: los payloads calzan con los DTO. El recorrido manual del checkpoint 1 lo confirma. El front del marketplace llama a `/api/marketplace/*`, que todavía no existe en el backend: sus DTO se diseñan ya con esta validación |
| Login de desarrollo alcanzable en producción | Alto | La app no arranca con `ALLOW_DEV_LOGIN=true` + producción (test en SU-1); DEPLOY_CPANEL lo advierte |
| El callback real de ClaveÚnica no se puede probar en local | Medio | Test con `ClaveUnicaService` simulado (SU-3). La prueba real, con credenciales de sandbox y dominio público |
| `DEPLOY_CPANEL.md` sale a la municipalidad con 4 piezas | Medio | Avisar a Miguel en la fase 0; SE-3 lo reescribe |
| Un agente toca otra área para "terminar" | Medio | El brief exige parar y reportar (A.7); cada tarea lista sus archivos |

## Preguntas abiertas

- Revisores por tarea: propuestos en `todo.md` según el área (Javier backend/núcleo, Maxi frontend,
  Miguel despliegue). Confirmar en la planificación.
- HU de las tareas de movimiento: se propone `ninguna`, porque no agregan funcionalidad. Las de
  sesión van a HU-12 y HU-13.
