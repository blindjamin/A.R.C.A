# Spec: `setup-unificado` — Setup, despliegue y documentación para un solo sitio

> **Estado:** BORRADOR · **Fecha:** 2026-09-26
> **Autor:** Benjamín Paicil (con asistencia de IA)
> **Módulo del mapa:** [`setup-unificado`](MAPA_UNIFICACION.md#3-módulos) · **Depende de:** `backend-unificado`, `sesion-unica`, `frontend-unificado`

## 1. Objetivo

Que toda la documentación y las herramientas describan **2 proyectos** (`apps/backend` y
`apps/frontend`) y **un solo dominio**, y que ninguna guía lleve a levantar o desplegar piezas que ya
no existen.

### Criterios de aceptación

1. `setup.ps1` en un clon limpio levanta MySQL, instala, crea los `.env.local`, corre migraciones y
   abre **2** ventanas (backend `:3000` y frontend `:5173`). El health check pasa.
2. `docs/DEPLOY_CPANEL.md` describe **2 piezas** en `arca.santodomingo.cl`: la API Node en `~/api` y
   los estáticos en la raíz del dominio. No hay subdominio `admin.` ni `api_arca_admin`, y la sesión
   se describe como cookie de servidor, no como JWT.
3. `DEPLOY_CPANEL.md` advierte que `ALLOW_DEV_LOGIN` **no** se define en el servidor (la app no
   arranca si está en `true` con producción).
4. CeroFilas: un solo Redirect URI (`https://arca.santodomingo.cl/api/auth/clave-unica/callback`) y un
   solo Logout URI (`https://arca.santodomingo.cl/login`).
5. `grep -rn "backend-admin\|admin-web\|5174\|3001" --include=*.md --include=*.ps1 --include=*.json . | grep -v node_modules`
   solo devuelve menciones históricas marcadas como tales (p. ej., "Nació de…" o las specs del
   panel con fecha).

## 2. Qué se toca

| Archivo | Cambio |
|---|---|
| `setup.ps1` | Quitar lo que quedaba de `admin-web`; un `.env.local` de front sin `VITE_ADMIN_URL`; `ALLOW_DEV_LOGIN=true` en el `.env.local` del backend (solo local) |
| `package.json` (raíz) | Revisar que no queden scripts del panel |
| `CLAUDE.md`, `README.md` | Setup, verificación antes de integrar, tabla de roles (Benjamín ya no tiene `apps/backend-admin` ni `apps/admin-web`), stack: "ClaveÚnica + sesión con cookie" |
| `AGENTS.md` | Tabla de áreas de A.7: sin `backend-admin` ni `admin-web`; el panel es `apps/backend/src/admin` + `apps/frontend/src/admin` |
| `docs/SETUP_LOCAL.md` | Igual que `CLAUDE.md`, con más detalle |
| `docs/DEPLOY_CPANEL.md` | Criterios 2, 3 y 4 |
| `docs/PENDIENTES_EQUIPO.md` | Rutas nuevas y estado de la migración |
| `packages/arca-core/README.md` | "Paquete compartido entre…" → lo usa `apps/backend`; decisión abierta sobre reabsorberlo |
| `entrega-municipalidad/Requerimientos_Servidor_ARCA.md` | **No se toca:** ya pide un proceso y un puerto. Fuera del repo |

## 3. Comandos

```bash
powershell -ExecutionPolicy Bypass -File .\setup.ps1     # en un clon limpio
grep -rn "backend-admin\|admin-web\|5174\|3001" --include=*.md --include=*.ps1 --include=*.json . | grep -v node_modules
```

## 4. Límites

- **Preguntar antes:** enviar a la municipalidad o a Gobierno Digital cualquier cambio (DEPLOY_CPANEL,
  CeroFilas). Lo registra una persona, no un agente.
- **Nunca:** poner credenciales reales ni el pepper en la documentación.

## 5. Tareas

- [ ] **SE1 — `setup.ps1` y `package.json` raíz.** Verify: criterio 1 en un clon limpio.
- [ ] **SE2 — Documentación del repo** (`CLAUDE.md`, `README.md`, `AGENTS.md`, `SETUP_LOCAL.md`, `PENDIENTES_EQUIPO.md`, README del core). Verify: grep del criterio 5.
- [ ] **SE3 — `DEPLOY_CPANEL.md`.** Verify: criterios 2 a 4; lo revisa Miguel (autor de la guía).
