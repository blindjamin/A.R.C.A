import { EstadoDenuncia } from '../core';

/** Largo máximo de la descripción: alcanza para contar qué pasó, no para pegar datos. */
export const LARGO_DESCRIPCION = 500;

/** Mensajes del chat que se pueden adjuntar a una denuncia. */
export const MAX_MENSAJES_ADJUNTOS = 5;

/** Largo con que se copia cada mensaje adjunto. */
export const LARGO_MENSAJE_ADJUNTO = 500;

/** Denuncias nuevas por vecino en 24 horas: frena el uso de la denuncia como acoso. */
export const TOPE_DENUNCIAS_POR_DIA = 5;

/** Estados en que una denuncia sigue abierta: no se repite otra igual. */
export const ESTADOS_ABIERTOS = [
  EstadoDenuncia.ABIERTA,
  EstadoDenuncia.INVESTIGACION,
];

/** Lo que el denunciante ve de su denuncia: el estado, no la resolución ni al denunciado. */
export interface DenunciaPropia {
  id: number;
  articuloId: number | null;
  articuloTitulo: string | null;
  motivo: string;
  origen: string;
  estado: EstadoDenuncia;
  fechaDenuncia: Date;
  fechaResolucion: Date | null;
}
