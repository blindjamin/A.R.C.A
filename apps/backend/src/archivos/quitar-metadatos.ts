import type { TipoImagen } from './firma-imagen';

/**
 * Quita los metadatos de una imagen antes de guardarla.
 *
 * Las fotos de un celular traen EXIF con la ubicación GPS donde se tomaron,
 * el modelo del teléfono y la fecha. En el Marketplace otros vecinos ven la
 * foto: con el GPS se sabría dónde vive quien publica, y eso anula la
 * distancia por bandas (decisión 005). Se recorre la estructura del archivo
 * y se descartan los bloques de metadatos, sin volver a codificar la imagen
 * ni agregar dependencias.
 *
 * Si la estructura no se puede recorrer, lanza: es preferible rechazar la
 * foto a guardarla con la ubicación adentro.
 */
export function quitarMetadatos(buffer: Buffer, tipo: TipoImagen): Buffer {
  switch (tipo.extension) {
    case 'jpg':
      return limpiarJpeg(buffer);
    case 'png':
      return limpiarPng(buffer);
    case 'webp':
      return limpiarWebp(buffer);
  }
}

export class ImagenIlegibleError extends Error {
  constructor() {
    super('La estructura de la imagen no se pudo recorrer');
  }
}

// --- JPEG -------------------------------------------------------------------

const SOS = 0xda;
const EOI = 0xd9;
const APP1 = 0xe1;
const APP2 = 0xe2;
const COM = 0xfe;

/** Marcadores sin largo (RSTn, TEM): no traen bytes de datos. */
const sinLargo = (marcador: number): boolean =>
  (marcador >= 0xd0 && marcador <= 0xd7) || marcador === 0x01;

/**
 * Se descartan APP1 (EXIF y XMP), APP3 a APP13 (IPTC, datos de fabricantes),
 * APP15 y los comentarios. Se conservan APP0 (JFIF), APP14 (Adobe, necesario
 * para decodificar algunos colores) y APP2 solo si es el perfil de color ICC.
 */
function descartarSegmentoJpeg(marcador: number, datos: Buffer): boolean {
  if (marcador === COM) return true;
  if (marcador === APP2) {
    return !datos.subarray(0, 12).equals(Buffer.from('ICC_PROFILE\0'));
  }
  return marcador >= APP1 && marcador <= 0xef && marcador !== 0xee;
}

function limpiarJpeg(buffer: Buffer): Buffer {
  const partes: Buffer[] = [buffer.subarray(0, 2)]; // SOI
  let orientacion: number | null = null;
  let i = 2;

  while (i < buffer.length) {
    if (buffer[i] !== 0xff) throw new ImagenIlegibleError();
    // Bytes de relleno 0xFF entre segmentos.
    while (buffer[i + 1] === 0xff) i++;
    const marcador = buffer[i + 1];
    if (marcador === undefined) throw new ImagenIlegibleError();

    if (marcador === EOI) {
      partes.push(buffer.subarray(i, i + 2));
      break;
    }
    if (sinLargo(marcador)) {
      partes.push(buffer.subarray(i, i + 2));
      i += 2;
      continue;
    }

    if (i + 4 > buffer.length) throw new ImagenIlegibleError();
    const largo = buffer.readUInt16BE(i + 2);
    const fin = i + 2 + largo;
    if (largo < 2 || fin > buffer.length) throw new ImagenIlegibleError();

    if (marcador === SOS) {
      // Desde acá vienen los datos de la imagen: se copian tal cual.
      partes.push(buffer.subarray(i));
      break;
    }

    const datos = buffer.subarray(i + 4, fin);
    if (marcador === APP1 && orientacion === null) {
      orientacion = leerOrientacionExif(datos);
    }
    if (!descartarSegmentoJpeg(marcador, datos)) {
      partes.push(buffer.subarray(i, fin));
    }
    i = fin;
  }

  // La orientación es lo único del EXIF que se conserva: sin ella, las
  // fotos de celular se ven de lado.
  if (orientacion !== null && orientacion !== 1) {
    partes.splice(1, 0, exifSoloOrientacion(orientacion));
  }
  return Buffer.concat(partes);
}

/** Lee la etiqueta Orientation (0x0112) del IFD0 de un bloque EXIF. */
function leerOrientacionExif(datos: Buffer): number | null {
  if (!datos.subarray(0, 6).equals(Buffer.from('Exif\0\0'))) return null;
  const tiff = datos.subarray(6);
  if (tiff.length < 8) return null;

  const little = tiff.toString('latin1', 0, 2) === 'II';
  const u16 = (o: number) =>
    little ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o);
  const u32 = (o: number) =>
    little ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o);

  const ifd0 = u32(4);
  if (ifd0 + 2 > tiff.length) return null;
  const entradas = u16(ifd0);
  for (let n = 0; n < entradas; n++) {
    const e = ifd0 + 2 + n * 12;
    if (e + 12 > tiff.length) return null;
    if (u16(e) === 0x0112) {
      const valor = u16(e + 8);
      return valor >= 1 && valor <= 8 ? valor : null;
    }
  }
  return null;
}

/** Segmento APP1 con un EXIF que solo tiene la orientación. */
function exifSoloOrientacion(orientacion: number): Buffer {
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0, 'latin1'); // big endian
  tiff.writeUInt16BE(42, 2);
  tiff.writeUInt32BE(8, 4); // el IFD0 empieza en el byte 8
  tiff.writeUInt16BE(1, 8); // una sola entrada
  tiff.writeUInt16BE(0x0112, 10); // Orientation
  tiff.writeUInt16BE(3, 12); // tipo SHORT
  tiff.writeUInt32BE(1, 14); // un valor
  tiff.writeUInt16BE(orientacion, 18);
  tiff.writeUInt32BE(0, 22); // no hay IFD siguiente

  const datos = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const cabecera = Buffer.alloc(4);
  cabecera.writeUInt16BE(0xffe1, 0);
  cabecera.writeUInt16BE(datos.length + 2, 2);
  return Buffer.concat([cabecera, datos]);
}

// --- PNG --------------------------------------------------------------------

/** Bloques de metadatos: EXIF, texto libre (autor, comentarios) y fecha. */
const BLOQUES_PNG_DESCARTADOS = new Set([
  'eXIf',
  'tEXt',
  'zTXt',
  'iTXt',
  'tIME',
]);

function limpiarPng(buffer: Buffer): Buffer {
  const partes: Buffer[] = [buffer.subarray(0, 8)];
  let i = 8;

  while (i < buffer.length) {
    if (i + 12 > buffer.length) throw new ImagenIlegibleError();
    const largo = buffer.readUInt32BE(i);
    const tipo = buffer.toString('latin1', i + 4, i + 8);
    const fin = i + 12 + largo; // largo + tipo + datos + CRC
    if (fin > buffer.length) throw new ImagenIlegibleError();

    if (!BLOQUES_PNG_DESCARTADOS.has(tipo)) {
      partes.push(buffer.subarray(i, fin));
    }
    i = fin;
    if (tipo === 'IEND') break;
  }
  return Buffer.concat(partes);
}

// --- WebP -------------------------------------------------------------------

const BLOQUES_WEBP_DESCARTADOS = new Set(['EXIF', 'XMP ']);
const BANDERA_VP8X_EXIF = 0x08;
const BANDERA_VP8X_XMP = 0x04;

function limpiarWebp(buffer: Buffer): Buffer {
  const partes: Buffer[] = [];
  let i = 12; // "RIFF" + tamaño + "WEBP"

  while (i < buffer.length) {
    if (i + 8 > buffer.length) throw new ImagenIlegibleError();
    const tipo = buffer.toString('latin1', i, i + 4);
    const largo = buffer.readUInt32LE(i + 4);
    // Los bloques se rellenan hasta un largo par.
    const fin = i + 8 + largo + (largo % 2);
    if (i + 8 + largo > buffer.length) throw new ImagenIlegibleError();

    if (!BLOQUES_WEBP_DESCARTADOS.has(tipo)) {
      const bloque = Buffer.from(
        buffer.subarray(i, Math.min(fin, buffer.length)),
      );
      if (tipo === 'VP8X' && largo >= 1) {
        // La cabecera avisa qué bloques trae: ya no hay EXIF ni XMP.
        bloque[8] &= ~(BANDERA_VP8X_EXIF | BANDERA_VP8X_XMP);
      }
      partes.push(bloque);
    }
    i = fin;
  }

  const cuerpo = Buffer.concat(partes);
  const cabecera = Buffer.alloc(12);
  cabecera.write('RIFF', 0, 'latin1');
  cabecera.writeUInt32LE(cuerpo.length + 4, 4);
  cabecera.write('WEBP', 8, 'latin1');
  return Buffer.concat([cabecera, cuerpo]);
}
