/**
 * Tipo de foto asociada a una solicitud de retiro.
 *
 * El vecino sube `antes` al crear o corregir. `durante` / `despues` quedan
 * reservados por si el operador o el panel los usan más adelante.
 */
export enum TipoFotoRetiro {
  ANTES = 'antes',
  DURANTE = 'durante',
  DESPUES = 'despues',
}
