export {
  aplicarTransicion,
  ESTADOS_CANCELABLES_POR_VECINO,
  ESTADOS_FINALES,
  TransicionInvalidaError,
  transicionesDisponibles,
  validarTransicion,
} from './ciclo-solicitud';
export type {
  ActorCiclo,
  ContextoTransicion,
  DatosTransicion,
  MotivoTransicionInvalida,
  SolicitudEnCiclo,
} from './ciclo-solicitud';
