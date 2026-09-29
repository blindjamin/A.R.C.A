/**
 * Tipos de imagen aceptados en las subidas, reconocidos por los primeros bytes
 * del archivo (su firma). La extensión y el `Content-Type` los elige el
 * cliente, así que no sirven para decidir qué se guarda en el servidor.
 */
export interface TipoImagen {
  extension: 'jpg' | 'png' | 'webp';
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
}

const JPEG: TipoImagen = { extension: 'jpg', mime: 'image/jpeg' };
const PNG: TipoImagen = { extension: 'png', mime: 'image/png' };
const WEBP: TipoImagen = { extension: 'webp', mime: 'image/webp' };

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const empiezaCon = (buffer: Buffer, bytes: number[], desde = 0): boolean =>
  buffer.length >= desde + bytes.length &&
  bytes.every((byte, i) => buffer[desde + i] === byte);

const ascii = (texto: string): number[] =>
  [...texto].map((c) => c.charCodeAt(0));

/** Tipo de la imagen según su contenido, o null si no es JPG, PNG ni WebP. */
export function detectarTipoImagen(buffer: Buffer): TipoImagen | null {
  if (empiezaCon(buffer, [0xff, 0xd8, 0xff])) return JPEG;
  if (empiezaCon(buffer, FIRMA_PNG)) return PNG;
  // WebP: contenedor RIFF (4 bytes de tamaño en medio) con la marca "WEBP".
  if (
    empiezaCon(buffer, ascii('RIFF')) &&
    empiezaCon(buffer, ascii('WEBP'), 8)
  ) {
    return WEBP;
  }
  return null;
}

/** Tipo MIME a partir de la extensión con que se guardó el archivo. */
export function mimeDeExtension(extension: string): string | null {
  const tipo = [JPEG, PNG, WEBP].find((t) => t.extension === extension);
  return tipo?.mime ?? null;
}
