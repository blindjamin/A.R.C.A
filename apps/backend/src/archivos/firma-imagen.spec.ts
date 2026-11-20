import { detectarTipoImagen, mimeDeExtension } from './firma-imagen';

const bytes = (...valores: number[]) => Buffer.from(valores);

const JPEG_MINIMO = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG_MINIMO = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP_MINIMO = Buffer.concat([
  Buffer.from('RIFF'),
  bytes(0x24, 0x00, 0x00, 0x00),
  Buffer.from('WEBPVP8 '),
]);

describe('detectarTipoImagen', () => {
  it.each([
    ['JPG', JPEG_MINIMO, 'jpg', 'image/jpeg'],
    ['PNG', PNG_MINIMO, 'png', 'image/png'],
    ['WebP', WEBP_MINIMO, 'webp', 'image/webp'],
  ])('reconoce %s por su firma', (_nombre, buffer, extension, mime) => {
    expect(detectarTipoImagen(buffer)).toEqual({ extension, mime });
  });

  it('rechaza lo que no es imagen aunque diga llamarse .jpg', () => {
    expect(
      detectarTipoImagen(Buffer.from('<svg onload="alert(1)">')),
    ).toBeNull();
    expect(detectarTipoImagen(Buffer.from('%PDF-1.7'))).toBeNull();
  });

  it('rechaza un RIFF que no es WebP (por ejemplo, un WAV)', () => {
    const wav = Buffer.concat([
      Buffer.from('RIFF'),
      bytes(0x24, 0x00, 0x00, 0x00),
      Buffer.from('WAVE'),
    ]);
    expect(detectarTipoImagen(wav)).toBeNull();
  });

  it('rechaza un archivo vacío o más corto que la firma', () => {
    expect(detectarTipoImagen(Buffer.alloc(0))).toBeNull();
    expect(detectarTipoImagen(bytes(0xff, 0xd8))).toBeNull();
  });
});

describe('mimeDeExtension', () => {
  it('traduce las extensiones con que se guardan las imágenes', () => {
    expect(mimeDeExtension('jpg')).toBe('image/jpeg');
    expect(mimeDeExtension('png')).toBe('image/png');
    expect(mimeDeExtension('webp')).toBe('image/webp');
  });

  it('no reconoce otras extensiones', () => {
    expect(mimeDeExtension('svg')).toBeNull();
    expect(mimeDeExtension('')).toBeNull();
  });
});
