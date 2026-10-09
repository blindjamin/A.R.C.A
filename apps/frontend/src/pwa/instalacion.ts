import { useSyncExternalStore } from 'react';

/**
 * Instalación de A.R.C.A. como PWA (ícono en el inicio del celular).
 *
 * Chrome/Edge en Android avisan que la app es instalable con el evento
 * `beforeinstallprompt`, que puede llegar antes de que React monte la oferta:
 * por eso se escucha desde `iniciarPwa()`, en main.tsx, y se guarda aquí.
 * iOS no tiene ese evento ni diálogo propio: solo se instala a mano desde
 * Compartir → «Agregar a inicio», así que ahí se muestran instrucciones.
 */

// No está en los tipos de TypeScript: es una API solo de Chromium.
interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type EstadoInstalacion = 'instalada' | 'disponible' | 'ios' | 'no-disponible';

let evento: EventoInstalacion | null = null;
let estado: EstadoInstalacion = calcularInicial();
const suscriptores = new Set<() => void>();

function calcularInicial(): EstadoInstalacion {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return 'instalada';
  // iPadOS se presenta como Mac; se distingue por la pantalla táctil.
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios ? 'ios' : 'no-disponible';
}

function cambiar(nuevo: EstadoInstalacion): void {
  estado = nuevo;
  suscriptores.forEach((avisar) => avisar());
}

/** Registra el service worker y empieza a escuchar la oferta de instalación. */
export function iniciarPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Sin esto Chrome muestra su propia mini-barra; la oferta la mostramos nosotros.
    e.preventDefault();
    evento = e as EventoInstalacion;
    cambiar('disponible');
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    cambiar('instalada');
  });
  // El service worker solo existe en contexto seguro (https o localhost).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin service worker la app funciona igual; solo no se puede instalar.
    });
  }
}

/** Abre el diálogo nativo de instalación. Solo sirve con estado 'disponible'. */
export async function instalar(): Promise<void> {
  if (!evento) return;
  const e = evento;
  // El evento se puede usar una sola vez.
  evento = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'dismissed') cambiar('no-disponible');
}

function suscribir(avisar: () => void): () => void {
  suscriptores.add(avisar);
  return () => suscriptores.delete(avisar);
}

export function useEstadoInstalacion(): EstadoInstalacion {
  return useSyncExternalStore(suscribir, () => estado);
}
