import { obtenerClavePublica, quitarSuscripcion, registrarSuscripcion } from '../api/push';

// Una consulta de clave y suscripción por carga de página.
let activado = false;

export const soportaPush = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/**
 * Pide el permiso de notificaciones. Debe llamarse de forma sincrónica al
 * inicio del handler de un gesto: tras un `await` Safari pierde la activación.
 */
export function pedirPermisoEnGesto(): Promise<NotificationPermission> | null {
  return soportaPush() && Notification.permission === 'default'
    ? Notification.requestPermission()
    : null;
}

function base64UrlAUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Suscribe este navegador si el vecino dio permiso. Nunca lanza. */
export async function activarPush(
  permiso: Promise<NotificationPermission> | null,
): Promise<void> {
  try {
    if (permiso) await permiso;
    if (!soportaPush() || Notification.permission !== 'granted' || activado) return;
    activado = true;
    const clave = await obtenerClavePublica();
    if (!clave) return;
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlAUint8Array(clave),
      }));
    const { endpoint, keys } = sub.toJSON();
    if (!endpoint || !keys?.p256dh || !keys.auth) return;
    await registrarSuscripcion({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
  } catch {
    // Push es un extra: si falla, el chat sigue funcionando.
    activado = false;
  }
}

/**
 * Borra la suscripción del servidor al cerrar sesión. No se hace
 * `unsubscribe()` del navegador: el siguiente vecino reasigna la fila al escribir.
 */
export async function desactivarPush(): Promise<void> {
  activado = false;
  try {
    if (!soportaPush()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) await quitarSuscripcion(sub.endpoint);
  } catch {
    // Sin red o sin servicio: no debe impedir cerrar sesión.
  }
}
