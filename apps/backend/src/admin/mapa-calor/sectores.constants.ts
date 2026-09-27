/**
 * IMPORTANTE: CATÁLOGO PROVISIONAL
 *
 * La lista de sectores y sus coordenadas (centroides) son datos de maqueta
 * y están pendientes de validación oficial por parte de la municipalidad.
 *
 * Cuando llegue la lista oficial, este es el único archivo que debe cambiar.
 */
export const SECTORES_PROVISIONALES = [
  { nombre: 'Santo Domingo Centro', lat: -33.6366, lng: -71.6264 },
  { nombre: 'Rocas de Santo Domingo', lat: -33.6402, lng: -71.636 },
  { nombre: 'San Enrique', lat: -33.6534, lng: -71.5905 },
  { nombre: 'Bahía', lat: -33.6275, lng: -71.63 },
  { nombre: 'Las Brisas', lat: -33.67, lng: -71.645 },
  { nombre: 'El Convento', lat: -33.7225, lng: -71.62 },
  { nombre: 'Litoral Norte', lat: -33.61, lng: -71.64 },
];

/**
 * Umbral mínimo de solicitudes (k-anonimato) requerido para que un sector
 * se reporte en el mapa. Previene la identificación de hogares individuales.
 */
export const MINIMO_SOLICITUDES_POR_SECTOR = 3;
