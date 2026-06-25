# Backend Fase 1 — Resumen de implementación

> **Autor:** Javier Figueroa (Back-End)  
> **Integrado en:** `develop` / `master` (el trabajo se hizo en la antigua `feature/backend`, ya eliminada)  
> **Fecha:** Junio 2026  
> **Equipo:** COM Tech — Feria de Software 2026

Documento de hito que resume la primera implementación del backend y la infraestructura local compartida.

---

## Objetivo de esta fase

Dejar operativa la **base del MVP backend (Fase 1)**:

- Entorno local reproducible (Docker + MySQL)
- API NestJS conectada a base de datos
- Tablas de **identidad** (auth futuro)
- Tablas y endpoints de **EP-01** (catálogo + solicitudes de retiro)
- CORS habilitado para integración con frontend en desarrollo

---

## Estructura del repositorio (nuevo)

```
A.R.C.A/
├── docker-compose.yml          # MySQL 8 local
├── .gitignore                  # node_modules, dist, .env.local
├── ARCA_database_schema.dbml   # Schema completo (19 tablas — referencia)
├── docs/
│   ├── BACKEND_FASE1.md        # Este archivo
│   └── SETUP_LOCAL.md          # Guía setup para el equipo
└── apps/
    └── backend/                # NestJS 11 + TypeORM
        ├── .env.example
        ├── src/
        │   ├── database/       # data-source + migraciones
        │   ├── health/
        │   ├── users/          # Entidades identidad
        │   ├── residuos/       # Catálogo EP-01
        │   └── solicitudes-retiro/
        └── package.json
```

> **Nota:** `apps/frontend/` aún no existe. Maximiliano lo creará en `feature/frontend`.

---

## Infraestructura

| Componente | Detalle |
|---|---|
| Docker Compose | MySQL 8, contenedor `arca-mysql`, puerto `3306` |
| Base de datos | `arca_dev` |
| Usuario BD | `arca_user` / `arca_pass` (solo desarrollo local) |
| Volumen | `arca_mysql_data` (persiste datos entre reinicios) |

---

## Migraciones ejecutadas

| Migración | Tablas / datos |
|---|---|
| `1782163200000-create-identity-tables` | `usuarios_ciudadanos`, `sesiones_ciudadano`, `usuarios_administradores`, `sesiones_administrador` |
| `1782163300000-create-residuos-catalogo` | `residuos_catalogo` + seed (Sofá, Refrigerador, Colchón, Escombros) |
| `1782163400000-create-solicitudes-retiro` | `solicitudes_retiro` + usuario dev de prueba |
| `1782163500000-seed-operador-demo` | Usuario demo **doble rol** (ciudadano `…0002` + operador `…00A2`) |

**Comando:** `npm run migration:run` (desde `apps/backend/`)

---

## Entidades TypeORM

| Módulo | Entidades |
|---|---|
| `users/` | `UsuarioCiudadano`, `SesionCiudadano`, `UsuarioAdministrador`, `SesionAdministrador`, `RolAdministrador` |
| `residuos/` | `ResiduoCatalogo` |
| `solicitudes-retiro/` | `SolicitudRetiro`, `EstadoSolicitudRetiro` |

---

## Endpoints disponibles

Base URL local: `http://localhost:3000`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado API + conexión MySQL |
| `GET` | `/` | Hello World (scaffold) |
| `GET` | `/residuos/catalogo` | Lista tipos de residuo |
| `POST` | `/solicitudes-retiro` | Crear solicitud de retiro |
| `GET` | `/solicitudes-retiro` | Listar solicitudes |
| `GET` | `/solicitudes-retiro?usuarioCiudadanoId={uuid}` | Solicitudes de un ciudadano |
| `GET` | `/solicitudes-retiro?estado={estado}` | Filtrar por estado (vista admin) |
| `GET` | `/solicitudes-retiro/{id}` | Detalle (ciudadano + residuo + operador) |
| `PATCH` | `/solicitudes-retiro/{id}` | **Admin:** modificar estado/operador/fecha/razón |
| `PATCH` | `/solicitudes-retiro/{id}/cancelar` | **Ciudadano:** cancelar su propia solicitud |
| `GET` | `/usuarios/{ciudadanoId}/perfil-acceso` | Login diferido: `{ esAdministrador, administrador }` |

### Cambio de estado (PATCH admin)

El panel municipal puede fijar **cualquier** estado, incluido **revertir** (ej.
`completada → pendiente`), para operar y probar el flujo. El backend solo conserva
invariantes de datos:

- `asignada` exige `operadorAsignadoId` de un administrador **activo**.
- `completada` setea `fechaCompletada`; al **salir** de completada se limpia.
- La cancelación del ciudadano solo procede sobre **sus** solicitudes en estado
  `pendiente` o `asignada` (valida propiedad → `403` si es ajena).

> Nota: la máquina de estados estricta (`pendiente→asignada→en_proceso→completada`)
> se relajó a propósito para esta fase. Endurecerla queda como pendiente (flag/permiso).

### Login diferido

`GET /usuarios/{ciudadanoId}/perfil-acceso` resuelve si una identidad base además
tiene extensión de administrador activa. El frontend lo usa tras autenticar para
decidir el destino: funcionario → selección de contexto; solo ciudadano → PWA directa.

### Ejemplo POST solicitud

```json
{
  "usuarioCiudadanoId": "00000000-0000-4000-8000-000000000001",
  "residuoCatalogoId": 1,
  "descripcion": "Sofá usado en buen estado"
}
```

Campos opcionales: `direccionAnonimizada`, `latitudCapturada`, `longitudCapturada`.

---

## Usuario de desarrollo (temporal)

Hasta que Benjamín integre auth (JWT / ClaveÚnica), existe un ciudadano de prueba insertado por migración:

| Campo | Valor |
|---|---|
| `id` | `00000000-0000-4000-8000-000000000001` |
| `clave_unica_id` | `dev-claveunica-test` |

Además, la migración `seed-operador-demo` agrega un **usuario demo con doble rol** (misma
persona como ciudadano y como operador municipal), para poder ejercitar el ciclo admin
completo `asignar → en_proceso → completada`:

| Campo | Valor |
|---|---|
| Ciudadano (identidad base) | `00000000-0000-4000-8000-000000000002` |
| Operador (`operadorAsignadoId`) | `00000000-0000-4000-8000-0000000000A2` · rol `operador` |

**No usar en producción.** Cuando auth esté listo, el `usuarioCiudadanoId` saldrá del token JWT, no del body.

---

## CORS

Configurado en `apps/backend/src/main.ts`:

- Origen permitido: `FRONTEND_URL` (default `http://localhost:5173`)
- Variable en `.env.example`: `FRONTEND_URL=http://localhost:5173`

---

## Commits principales (`feature/backend`)

```
c3024c7 fix(backend): habilitar CORS para frontend local
264086b feat(backend): catálogo de residuos y solicitudes de retiro (EP-01)
da6066f feat(backend): migración residuos_catalogo con seed inicial
d44f15f feat(backend): entidades TypeORM de identidad y UsersModule
42aa7da feat(backend): migración inicial tablas de identidad
3c37c97 feat(backend): conectar TypeORM con MySQL y endpoint /health
24f98eb feat(backend): scaffold inicial NestJS en apps/backend
4893f44 chore(devops): agregar docker-compose para MySQL local
```

---

## Pendiente (no incluido en Fase 1)

| Área | Responsable | Notas |
|---|---|---|
| Auth ClaveÚnica + JWT | Benjamín (`feature/auth`) | Requiere aprobación organismo gubernamental |
| Auth mock / guards | Benjamín | Pendiente: proteger `/admin` y PATCH por rol |
| Frontend React PWA | Maximiliano (`feature/frontend`) | Ver `docs/SETUP_LOCAL.md` |
| Migraciones restantes del DBML | Javier | horarios, fotos, marketplace, credits, etc. |
| Subida de fotos | Javier | Fase posterior |
| ~~PATCH estado solicitud (operador)~~ | ✅ Hecho | Rama `admin-municipal` (máquina de estados) |
| ~~Cancelación por ciudadano~~ | ✅ Hecho | Rama `admin-municipal` (`PATCH /:id/cancelar`) |
| ~~Login diferido (perfil-acceso)~~ | ✅ Hecho | `GET /usuarios/:id/perfil-acceso` |
| Endurecer máquina de estados | Pendiente | Hoy reversible para pruebas; reponer con flag/permiso |
| PR merge a `develop` | Javier | Integración con el equipo |

---

## Schema DBML vs implementado

El archivo `ARCA_database_schema.dbml` define **19 tablas**. En Fase 1 backend están creadas **6**:

- ✅ 4 identidad
- ✅ `residuos_catalogo`
- ✅ `solicitudes_retiro`

Las **13 restantes** se migrarán en fases siguientes según el roadmap del README.
