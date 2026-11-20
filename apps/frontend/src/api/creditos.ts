import { apiFetch } from './apiFetch';
import { handle } from './arca';

const API_URL = import.meta.env.VITE_API_URL as string;

export interface MovimientoCreditos {
  id: number;
  monto: number;
  origen: string;
  motivo: string | null;
  saldoAnterior: number;
  saldoNuevo: number;
  fecha: string;
}

export interface ResumenCreditos {
  saldo: number;
  movimientos: MovimientoCreditos[];
}

export const ETIQUETAS_ORIGEN: Record<string, string> = {
  entrega: 'Entrega en Marketplace',
  estrellas: 'Calificación con estrellas',
  retirada: 'Retiro municipal',
  bonificacion: 'Bonificación comunitaria',
  ajuste: 'Ajuste municipal',
};

/** Obtiene el saldo real y el historial de transacciones de Circular Credits (HU-11). */
export function fetchResumenCreditos(): Promise<ResumenCreditos> {
  return apiFetch(`${API_URL}/creditos`).then((r) =>
    handle<ResumenCreditos>(r),
  );
}
