import { detectarTipoImagen, type TipoImagen } from './firma-imagen';
import { ImagenIlegibleError, quitarMetadatos } from './quitar-metadatos';

// Texto que simula la ubicación dentro de los metadatos: no debe sobrevivir.
const GPS = 'LATITUD-33.6421-SECRETA';

const tipo = (buffer: Buffer): TipoImagen => {
  const t = detectarTipoImagen(buffer);
  if (!t) throw new Error('fixture inválido');
  return t;
};

// --- JPEG -------------------------------------------------------------------

const segmento = (marcador: number, datos: Buffer): Buffer => {
  const cabecera = Buffer.alloc(4);
  cabecera.writeUInt16BE(0xff00 | marcador, 0);
  cabecera.writeUInt16BE(datos.length + 2, 2);
  return Buffer.concat([cabecera, datos]);
};

/** EXIF little endian con orientación y un bloque GPS que trae el texto. */
function exifConGps(orientacion: number): Buffer {
  const gps = Buffer.from(GPS, 'latin1');
  const tiff = Buffer.alloc(8 + 2 + 2 * 12 + 4);
  tiff.write('II', 0, 'latin1');
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);
  // Orientation (SHORT)
  tiff.writeUInt16LE(0x0112, 10);
  tiff.writeUInt16LE(3, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt16LE(orientacion, 18);
  // GPSInfo (LONG, puntero al final)
  tiff.writeUInt16LE(0x8825, 22);
  tiff.writeUInt16LE(4, 24);
  tiff.writeUInt32LE(1, 26);
  tiff.writeUInt32LE(tiff.length, 30);
  return Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, gps]);
}

const JFIF = Buffer.from([
  0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00,
]);
const ICC = Buffer.concat([
  Buffer.from('ICC_PROFILE\0', 'latin1'),
  Buffer.from([1, 1, 9, 9]),
]);
const DQT = Buffer.from([0x00, ...new Array<number>(64).fill(1)]);
const SOS_Y_DATOS = Buffer.from([
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x12, 0x34, 0x56,
  0xff, 0xd9,
]);

function jpeg(...segmentos: Buffer[]): Buffer {
  return Buffer.concat([Buffer.from([0xff, 0xd8]), ...segmentos, SOS_Y_DATOS]);
}

describe('quitarMetadatos — JPG', () => {
  const original = jpeg(
    segmento(0xe0, JFIF),
    segmento(0xe1, exifConGps(6)),
    segmento(
      0xe1,
      Buffer.from(`http://ns.adobe.com/xap/1.0/\0${GPS}`, 'latin1'),
    ),
    segmento(0xe2, ICC),
    segmento(0xed, Buffer.from(`Photoshop 3.0\0${GPS}`, 'latin1')),
    segmento(0xfe, Buffer.from(GPS, 'latin1')),
    segmento(0xdb, DQT),
  );

  const limpio = quitarMetadatos(original, tipo(original));

  it('quita EXIF con GPS, XMP, IPTC y comentarios', () => {
    expect(limpio.includes(Buffer.from(GPS, 'latin1'))).toBe(false);
  });

  it('conserva solo la orientación del EXIF, para que la foto no se vea de lado', () => {
    const exif = limpio.indexOf(Buffer.from('Exif\0\0', 'latin1'));
    expect(exif).toBeGreaterThan(0);
    const tiff = exif + 6;
    expect(limpio.toString('latin1', tiff, tiff + 2)).toBe('MM');
    expect(limpio.readUInt16BE(tiff + 10)).toBe(0x0112);
    expect(limpio.readUInt16BE(tiff + 18)).toBe(6);
  });

  it('conserva JFIF, el perfil de color, las tablas y los datos de la imagen', () => {
    expect(limpio.includes(JFIF)).toBe(true);
    expect(limpio.includes(ICC)).toBe(true);
    expect(limpio.includes(DQT)).toBe(true);
    expect(limpio.subarray(-SOS_Y_DATOS.length).equals(SOS_Y_DATOS)).toBe(true);
    expect(detectarTipoImagen(limpio)?.extension).toBe('jpg');
  });

  it('si la orientación es la normal, no agrega EXIF', () => {
    const sinGiro = jpeg(segmento(0xe1, exifConGps(1)), segmento(0xdb, DQT));
    const resultado = quitarMetadatos(sinGiro, tipo(sinGiro));
    expect(resultado.includes(Buffer.from('Exif', 'latin1'))).toBe(false);
  });

  it('una imagen sin metadatos queda igual', () => {
    const simple = jpeg(segmento(0xe0, JFIF), segmento(0xdb, DQT));
    expect(quitarMetadatos(simple, tipo(simple)).equals(simple)).toBe(true);
  });

  it('una imagen cortada lanza en vez de guardarse con los metadatos', () => {
    const cortada = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      segmento(0xe1, exifConGps(6)).subarray(0, 20),
    ]);
    expect(() => quitarMetadatos(cortada, tipo(cortada))).toThrow(
      ImagenIlegibleError,
    );
  });
});

// --- PNG --------------------------------------------------------------------

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function bloquePng(tipoBloque: string, datos: Buffer): Buffer {
  const cabecera = Buffer.alloc(8);
  cabecera.writeUInt32BE(datos.length, 0);
  cabecera.write(tipoBloque, 4, 'latin1');
  return Buffer.concat([cabecera, datos, Buffer.alloc(4)]); // CRC sin validar
}

describe('quitarMetadatos — PNG', () => {
  const IHDR = bloquePng('IHDR', Buffer.alloc(13, 1));
  const IDAT = bloquePng('IDAT', Buffer.from([7, 7, 7]));
  const IEND = bloquePng('IEND', Buffer.alloc(0));
  const original = Buffer.concat([
    FIRMA_PNG,
    IHDR,
    bloquePng('eXIf', Buffer.from(GPS, 'latin1')),
    bloquePng('tEXt', Buffer.from(`Comment\0${GPS}`, 'latin1')),
    bloquePng('iTXt', Buffer.from(`XML:com.adobe.xmp\0${GPS}`, 'latin1')),
    bloquePng('tIME', Buffer.alloc(7, 2)),
    IDAT,
    IEND,
  ]);

  it('quita eXIf, los bloques de texto y la fecha; conserva la imagen', () => {
    const limpio = quitarMetadatos(original, tipo(original));
    expect(limpio.equals(Buffer.concat([FIRMA_PNG, IHDR, IDAT, IEND]))).toBe(
      true,
    );
  });
});

// --- WebP -------------------------------------------------------------------

function bloqueWebp(tipoBloque: string, datos: Buffer): Buffer {
  const cabecera = Buffer.alloc(8);
  cabecera.write(tipoBloque, 0, 'latin1');
  cabecera.writeUInt32LE(datos.length, 4);
  const relleno = datos.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0);
  return Buffer.concat([cabecera, datos, relleno]);
}

function webp(...bloques: Buffer[]): Buffer {
  const cuerpo = Buffer.concat(bloques);
  const cabecera = Buffer.alloc(12);
  cabecera.write('RIFF', 0, 'latin1');
  cabecera.writeUInt32LE(cuerpo.length + 4, 4);
  cabecera.write('WEBP', 8, 'latin1');
  return Buffer.concat([cabecera, cuerpo]);
}

describe('quitarMetadatos — WebP', () => {
  const VP8X_DATOS = Buffer.alloc(10);
  VP8X_DATOS[0] = 0x08 | 0x04 | 0x10; // EXIF + XMP + alfa
  const IMAGEN = bloqueWebp('VP8L', Buffer.from([1, 2, 3]));
  const original = webp(
    bloqueWebp('VP8X', VP8X_DATOS),
    IMAGEN,
    bloqueWebp('EXIF', Buffer.from(GPS, 'latin1')),
    bloqueWebp('XMP ', Buffer.from(GPS, 'latin1')),
  );

  const limpio = quitarMetadatos(original, tipo(original));

  it('quita EXIF y XMP y conserva la imagen', () => {
    expect(limpio.includes(Buffer.from(GPS, 'latin1'))).toBe(false);
    expect(limpio.includes(IMAGEN)).toBe(true);
  });

  it('corrige la cabecera: sin banderas de EXIF ni XMP y tamaño RIFF al día', () => {
    expect(limpio[20]).toBe(0x10); // solo queda la bandera de alfa
    expect(limpio.readUInt32LE(4)).toBe(limpio.length - 8);
    expect(detectarTipoImagen(limpio)?.extension).toBe('webp');
  });
});
