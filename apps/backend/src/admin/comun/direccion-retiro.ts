import type { SolicitudRetiro } from '../../core';

/**
 * Dirección que ve el panel. `direccionAnonimizada` queda solo como respaldo
 * para filas anteriores a `datos-retiro` (seed, datos viejos).
 */
export const direccionDe = (
  s: Pick<SolicitudRetiro, 'direccionRetiro' | 'direccionAnonimizada'>,
): string => s.direccionRetiro || s.direccionAnonimizada || '';
