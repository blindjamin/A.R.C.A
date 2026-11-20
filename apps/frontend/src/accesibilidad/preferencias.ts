import { useSyncExternalStore } from 'react';

/**
 * Preferencias de accesibilidad: tamaño de letra y alto contraste.
 *
 * Sigue la convención del Kit Digital de Gobierno (framework.digital.gob.cl):
 * las preferencias se expresan como clases en `<html>` — `a11y-font-0|1|2`
 * (letra base de 16, 20 y 24 px) y `a11y-contrast`. No se usa el CSS del kit
 * porque está hecho sobre Bootstrap 4 y chocaría con Tailwind; los estilos
 * equivalentes están en `index.css`.
 *
 * Se guardan en localStorage para que se mantengan entre visitas. Si el
 * navegador no lo permite (modo privado), funcionan igual durante la visita.
 */

export type NivelLetra = 0 | 1 | 2;

export interface PreferenciasAccesibilidad {
  letra: NivelLetra;
  contraste: boolean;
}

export const NIVEL_LETRA_MAXIMO: NivelLetra = 2;

const CLAVE_ALMACENAMIENTO = 'arca.accesibilidad';
const CLASES_LETRA = ['a11y-font-0', 'a11y-font-1', 'a11y-font-2'] as const;
const CLASE_CONTRASTE = 'a11y-contrast';
const POR_DEFECTO: PreferenciasAccesibilidad = { letra: 0, contraste: false };

function leerGuardadas(): PreferenciasAccesibilidad {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!crudo) return POR_DEFECTO;
    const datos = JSON.parse(crudo) as Partial<PreferenciasAccesibilidad>;
    const letra = [0, 1, 2].includes(datos.letra as number)
      ? (datos.letra as NivelLetra)
      : 0;
    return { letra, contraste: datos.contraste === true };
  } catch {
    return POR_DEFECTO;
  }
}

let actuales = leerGuardadas();
const suscriptores = new Set<() => void>();

function aplicarEnDocumento(p: PreferenciasAccesibilidad): void {
  const html = document.documentElement;
  html.classList.remove(...CLASES_LETRA);
  html.classList.add(CLASES_LETRA[p.letra]);
  html.classList.toggle(CLASE_CONTRASTE, p.contraste);
}

/** Aplica lo guardado antes del primer render, para que no parpadee. */
export function iniciarAccesibilidad(): void {
  aplicarEnDocumento(actuales);
}

export function cambiarPreferencias(
  cambios: Partial<PreferenciasAccesibilidad>,
): void {
  actuales = { ...actuales, ...cambios };
  aplicarEnDocumento(actuales);
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(actuales));
  } catch {
    // Sin almacenamiento la preferencia dura solo esta visita.
  }
  suscriptores.forEach((avisar) => avisar());
}

/** Sube o baja un nivel la letra, sin salirse de 0..NIVEL_LETRA_MAXIMO. */
export function cambiarLetra(paso: -1 | 1): void {
  const letra = Math.min(
    NIVEL_LETRA_MAXIMO,
    Math.max(0, actuales.letra + paso),
  ) as NivelLetra;
  cambiarPreferencias({ letra });
}

function suscribir(avisar: () => void): () => void {
  suscriptores.add(avisar);
  return () => suscriptores.delete(avisar);
}

export function usePreferenciasAccesibilidad(): PreferenciasAccesibilidad {
  return useSyncExternalStore(suscribir, () => actuales);
}
