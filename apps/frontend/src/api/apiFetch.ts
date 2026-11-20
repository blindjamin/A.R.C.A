// apiFetch compartido entre `api/arca.ts` (PWA) y `admin/api/admin.ts` (panel).
// Sin header Authorization: la identidad viaja en la cookie `arca_sesion`
// (HttpOnly, Path=/api), que el navegador manda sola porque el proxy de Vite
// pone todo bajo el mismo origen (SPEC-frontend-unificado §2.3).
//
// Ante un 401 (sesión vencida o cerrada por inactividad) avisa a quien esté
// escuchando — normalmente SessionContext — para que pase a `sesion = null` y
// los guards manden a /login.
type Handler401 = () => void;

let handler401: Handler401 | null = null;

export function onUnauthorized(handler: Handler401 | null): void {
  handler401 = handler;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      ...init?.headers,
      // Header requerido cuando se accede vía tunel ngrok (free tier): sin el,
      // ngrok intercepta el request y devuelve una pagina HTML de advertencia
      // en vez de dejarlo pasar al backend. Inofensivo cuando no se usa ngrok.
      'ngrok-skip-browser-warning': 'true',
    },
  }).then((res) => {
    if (res.status === 401) handler401?.();
    return res;
  });
}
