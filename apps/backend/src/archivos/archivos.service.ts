import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { detectarTipoImagen, mimeDeExtension } from './firma-imagen';

/** Tamaño máximo de una imagen subida (spec `marketplace` §6). */
export const TAMANO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024;

/**
 * Lo que este servicio necesita del archivo que entrega multer. Se declara acá
 * para no depender de los tipos de multer, que el backend no instala.
 */
export interface ArchivoSubido {
  buffer: Buffer;
  size: number;
}

export interface ArchivoParaEnviar {
  stream: ReadStream;
  mime: string;
}

/**
 * Guarda y entrega imágenes subidas por los vecinos.
 *
 * Los archivos van a `UPLOADS_DIR` (por defecto `./uploads`), que tiene que
 * quedar fuera de lo que publica el servidor web: solo se entregan por la API,
 * después de comprobar la sesión y los permisos. En la base se guarda la ruta
 * relativa a esa carpeta, nunca una URL.
 *
 * Es el mismo servicio que usarán las fotos de las solicitudes de retiro: cada
 * uso guarda en su propia subcarpeta.
 */
@Injectable()
export class ArchivosService {
  private readonly raiz = resolve(process.env.UPLOADS_DIR || 'uploads');

  /**
   * Valida la imagen por su contenido y la guarda con un nombre aleatorio en
   * `subcarpeta`. Devuelve la ruta relativa que se guarda en la base.
   */
  async guardarImagen(
    archivo: ArchivoSubido,
    subcarpeta: string,
  ): Promise<string> {
    if (archivo.size > TAMANO_MAXIMO_IMAGEN_BYTES) {
      throw new BadRequestException('La foto no puede pesar más de 5 MB');
    }

    const tipo = detectarTipoImagen(archivo.buffer);
    if (!tipo) {
      throw new BadRequestException('La foto debe ser JPG, PNG o WebP');
    }

    const carpeta = this.rutaSegura(subcarpeta);
    await mkdir(carpeta, { recursive: true });

    const nombre = `${randomUUID()}.${tipo.extension}`;
    await writeFile(join(carpeta, nombre), archivo.buffer, { flag: 'wx' });

    return relative(this.raiz, join(carpeta, nombre)).split(sep).join('/');
  }

  /** Abre una imagen guardada para enviarla. 404 si ya no está en disco. */
  async abrir(rutaRelativa: string): Promise<ArchivoParaEnviar> {
    const ruta = this.rutaSegura(rutaRelativa);
    const mime = mimeDeExtension(extname(ruta).slice(1));

    const existe = await stat(ruta)
      .then((s) => s.isFile())
      .catch(() => false);
    if (!mime || !existe) {
      throw new NotFoundException('Foto no encontrada');
    }

    return { stream: createReadStream(ruta), mime };
  }

  /** Borra una imagen; si ya no existe, no hace nada. */
  async borrar(rutaRelativa: string): Promise<void> {
    await unlink(this.rutaSegura(rutaRelativa)).catch(() => undefined);
  }

  /**
   * Ruta absoluta dentro de la carpeta de subidas. Rechaza cualquier ruta que
   * se salga de ella (`..`, rutas absolutas), aunque venga de la base.
   */
  private rutaSegura(rutaRelativa: string): string {
    const ruta = resolve(this.raiz, rutaRelativa);
    if (ruta !== this.raiz && !ruta.startsWith(this.raiz + sep)) {
      throw new NotFoundException('Foto no encontrada');
    }
    return ruta;
  }
}
