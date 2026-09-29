import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ArchivosService,
  TAMANO_MAXIMO_IMAGEN_BYTES,
} from './archivos.service';

const JPEG_MINIMO = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_MINIMO = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const leer = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const partes: Buffer[] = [];
  for await (const parte of stream) partes.push(parte as Buffer);
  return Buffer.concat(partes);
};

describe('ArchivosService', () => {
  let raiz: string;
  let service: ArchivosService;
  const uploadsDirOriginal = process.env.UPLOADS_DIR;

  beforeEach(async () => {
    raiz = await mkdtemp(join(tmpdir(), 'arca-uploads-'));
    process.env.UPLOADS_DIR = raiz;
    service = new ArchivosService();
  });

  afterEach(async () => {
    process.env.UPLOADS_DIR = uploadsDirOriginal;
    await rm(raiz, { recursive: true, force: true });
  });

  it('guarda la imagen con nombre aleatorio y la extensión de su contenido', async () => {
    const ruta = await service.guardarImagen(
      { buffer: PNG_MINIMO, size: PNG_MINIMO.length },
      'marketplace',
    );

    expect(ruta).toMatch(/^marketplace\/[0-9a-f-]{36}\.png$/);
    expect(await readFile(join(raiz, ruta))).toEqual(PNG_MINIMO);
  });

  it('dos subidas iguales no se pisan', async () => {
    const archivo = { buffer: JPEG_MINIMO, size: JPEG_MINIMO.length };
    const a = await service.guardarImagen(archivo, 'marketplace');
    const b = await service.guardarImagen(archivo, 'marketplace');
    expect(a).not.toBe(b);
  });

  it('rechaza lo que no es JPG, PNG ni WebP, sin escribir nada', async () => {
    const svg = Buffer.from('<svg></svg>');
    await expect(
      service.guardarImagen({ buffer: svg, size: svg.length }, 'marketplace'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una imagen de más de 5 MB', async () => {
    await expect(
      service.guardarImagen(
        { buffer: JPEG_MINIMO, size: TAMANO_MAXIMO_IMAGEN_BYTES + 1 },
        'marketplace',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('abre una imagen guardada con su tipo MIME', async () => {
    const ruta = await service.guardarImagen(
      { buffer: JPEG_MINIMO, size: JPEG_MINIMO.length },
      'marketplace',
    );

    const { stream, mime } = await service.abrir(ruta);

    expect(mime).toBe('image/jpeg');
    expect(await leer(stream)).toEqual(JPEG_MINIMO);
  });

  it('da 404 si la imagen ya no está en disco', async () => {
    await expect(
      service.abrir('marketplace/no-existe.jpg'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('no entrega archivos fuera de la carpeta de subidas', async () => {
    await expect(service.abrir('../secreto.jpg')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.abrir('/etc/passwd')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('no entrega archivos con una extensión que no es de imagen', async () => {
    await writeFile(join(raiz, 'nota.txt'), 'hola');
    await expect(service.abrir('nota.txt')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('borrar elimina la imagen y no falla si ya no existe', async () => {
    const ruta = await service.guardarImagen(
      { buffer: PNG_MINIMO, size: PNG_MINIMO.length },
      'marketplace',
    );

    await service.borrar(ruta);
    await expect(service.abrir(ruta)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.borrar(ruta)).resolves.toBeUndefined();
  });
});
