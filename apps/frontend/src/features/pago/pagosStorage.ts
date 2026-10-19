export interface DatosComprobante {
  solicitudId: number;
  ordenCompra: string;
  codigoAutorizacion: string;
  monto: number;
  fecha: string;
  metodoPago: string;
}

const CLAVE_PAGOS = 'arca_solicitudes_pagadas';
const CLAVE_COMPROBANTES = 'arca_comprobantes_pago';

function leerIds(): number[] {
  try {
    const raw = localStorage.getItem(CLAVE_PAGOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function leerComprobantes(): Record<number, DatosComprobante> {
  try {
    const raw = localStorage.getItem(CLAVE_COMPROBANTES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function marcarSolicitudPagada(
  solicitudId: number,
  comprobante?: DatosComprobante,
): void {
  try {
    const ids = new Set(leerIds());
    ids.add(solicitudId);
    localStorage.setItem(CLAVE_PAGOS, JSON.stringify([...ids]));

    if (comprobante) {
      const comprobantes = leerComprobantes();
      comprobantes[solicitudId] = comprobante;
      localStorage.setItem(CLAVE_COMPROBANTES, JSON.stringify(comprobantes));
    }
  } catch {
    // Si falla localStorage en modo incógnito estricto, no bloquea la navegación.
  }
}

export function estaSolicitudPagada(solicitudId: number): boolean {
  return leerIds().includes(solicitudId);
}

export function obtenerComprobantePago(
  solicitudId: number,
): DatosComprobante | null {
  const comprobantes = leerComprobantes();
  return comprobantes[solicitudId] ?? null;
}
