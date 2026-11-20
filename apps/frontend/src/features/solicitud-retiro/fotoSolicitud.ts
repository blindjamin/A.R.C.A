// Límites de la foto de una solicitud. Deben coincidir con los del backend
// (`archivos.service.ts`: JPG, PNG o WebP, hasta 5 MB), que es quien decide:
// validar acá solo evita subir 5 MB para recibir un 400.
export const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
export const TAMANO_MAXIMO_FOTO_BYTES = 5 * 1024 * 1024;

/** Devuelve el mensaje de error para el vecino, o null si la foto sirve. */
export function validarFoto(archivo: File): string | null {
  if (!TIPOS_FOTO_PERMITIDOS.includes(archivo.type)) {
    return 'La foto debe ser JPG, PNG o WebP.';
  }
  if (archivo.size > TAMANO_MAXIMO_FOTO_BYTES) {
    return 'La foto no puede pesar más de 5 MB.';
  }
  return null;
}
