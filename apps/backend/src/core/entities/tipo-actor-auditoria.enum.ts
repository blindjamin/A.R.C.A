/**
 * Quién ejecutó la acción registrada en auditoría.
 *
 * La misma persona puede tener doble perfil (ciudadano y funcionario), así que
 * lo que se registra no es "quién es" sino **con qué sombrero actuó**: el mismo
 * RUN cancelando su propia solicitud es `CIUDADANO`, y asignando un retiro
 * desde el panel es `ADMINISTRADOR`.
 *
 * `SISTEMA` queda para acciones automáticas sin persona detrás (purgas por
 * plazo de conservación, procesos programados).
 */
export enum TipoActorAuditoria {
  CIUDADANO = 'ciudadano',
  ADMINISTRADOR = 'administrador',
  SISTEMA = 'sistema',
}
