import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { AuthUser } from './interfaces/auth-user.interface';
import { SesionCiudadano } from '../entities/sesion-ciudadano.entity';
import { UsuarioCiudadano } from '../entities/usuario-ciudadano.entity';

// Tiempos de la decisión 2 del mapa de unificación. El municipal dura menos y
// además caduca por inactividad porque su sesión abre el panel con datos de
// todos los vecinos; la del vecino solo ve lo suyo y vive en su teléfono.
export const DURACION_SESION_VECINO_MS = 7 * 24 * 60 * 60 * 1000;
export const DURACION_SESION_MUNICIPAL_MS = 8 * 60 * 60 * 1000;
export const INACTIVIDAD_MAXIMA_MUNICIPAL_MS = 30 * 60 * 1000;

// `updated_at` se usa como "última actividad". Escribirlo en cada petición sería
// una escritura por request; una vez por minuto basta para medir 30 minutos.
export const INTERVALO_ACTIVIDAD_MS = 60 * 1000;

// `<session_id>.<secreto>`: UUID v4 (lo que genera randomUUID) y 32 bytes en hex.
// Se exige minúscula porque es lo único que emitimos: cualquier otra cosa no
// salió de acá y no vale la pena ni consultar la base.
const FORMATO_COOKIE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9a-f]{64})$/;

export interface DatosNuevaSesion {
  usuarioCiudadanoId: string;
  nombre?: string | null;
  apellido?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

/**
 * Sesión de ARCA en servidor (SPEC-sesion-unica §2).
 *
 * La cookie lleva el id de la sesión y un secreto; la base guarda solo el hash
 * del secreto. Así, quien obtenga un volcado de `sesiones_ciudadano` no puede
 * armar una cookie válida, y revocar es cambiar `activa` en una fila.
 *
 * El secreto no se guarda ni se registra en ningún log: solo existe en la
 * respuesta de `crear` y en el navegador.
 */
@Injectable()
export class SesionService {
  constructor(
    @InjectRepository(SesionCiudadano)
    private readonly sesiones: Repository<SesionCiudadano>,
    @InjectRepository(UsuarioCiudadano)
    private readonly usuarios: Repository<UsuarioCiudadano>,
    private readonly authService: AuthService,
  ) {}

  /**
   * Reloj del servicio. Es un campo reemplazable para que las pruebas fijen la
   * hora sin timers falsos: toda comparación de tiempos pasa por acá.
   */
  ahora = (): Date => new Date();

  /** Crea la sesión y devuelve el valor de la cookie `arca_sesion`. */
  async crear(datos: DatosNuevaSesion): Promise<string> {
    const ciudadano = await this.usuarios.findOne({
      where: { id: datos.usuarioCiudadanoId, activo: true },
    });
    if (!ciudadano) {
      throw new UnauthorizedException('No se pudo iniciar sesión.');
    }

    const usuario = await this.authService.resolveCiudadanoId(ciudadano.id);
    const ahora = this.ahora();
    const sessionId = randomUUID();
    const secreto = randomBytes(32).toString('hex');

    await this.sesiones.save(
      this.sesiones.create({
        sessionId,
        usuarioCiudadanoId: ciudadano.id,
        jwtTokenHash: sha256(secreto),
        nombreSesion: datos.nombre ?? null,
        apellidoSesion: datos.apellido ?? null,
        ipSesion: datos.ip ?? null,
        userAgent: datos.userAgent ?? null,
        fechaInicio: ahora,
        fechaExpiracion: new Date(
          ahora.getTime() + this.duracionMaxima(usuario),
        ),
        // Se fija con el mismo reloj que después lo compara, en vez de dejar
        // que la base ponga el suyo.
        updatedAt: ahora,
        activa: true,
      }),
    );

    return `${sessionId}.${secreto}`;
  }

  /**
   * Resuelve la identidad a partir de la cookie, o `null` si no vale.
   *
   * Nunca dice por qué falló: quien llama responde un 401 genérico, para no
   * darle a un atacante pistas sobre qué parte de la cookie acertó.
   */
  async validar(valorCookie?: string): Promise<AuthUser | null> {
    // Pasos 1 a 3: formato, fila activa y secreto.
    const sesion = await this.buscarSesion(valorCookie);
    if (!sesion) return null;

    // Paso 4: el límite sale del rol actual, no del que tenía al entrar. Si a
    // un vecino lo hacen funcionario, su sesión pasa a durar 8 horas.
    const usuario = await this.authService.resolveCiudadanoId(
      sesion.usuarioCiudadanoId,
    );
    const ahora = this.ahora().getTime();
    if (ahora - sesion.fechaInicio.getTime() > this.duracionMaxima(usuario)) {
      return null;
    }

    // Paso 5: inactividad, solo para el municipal. Se revoca en vez de solo
    // rechazar para que la sesión no reviva aunque cambie el rol.
    const inactividad = ahora - sesion.updatedAt.getTime();
    if (
      usuario.esAdministrador &&
      inactividad > INACTIVIDAD_MAXIMA_MUNICIPAL_MS
    ) {
      await this.sesiones.update(
        { sessionId: sesion.sessionId },
        { activa: false },
      );
      return null;
    }

    // Paso 6: registrar actividad, como mucho una vez por minuto.
    if (inactividad > INTERVALO_ACTIVIDAD_MS) {
      await this.sesiones.update(
        { sessionId: sesion.sessionId },
        { updatedAt: new Date(ahora) },
      );
    }

    // Paso 7.
    return usuario;
  }

  /**
   * Revoca la sesión de la cookie. Exige el secreto: conocer solo el id (que
   * podría aparecer en un log o en la base) no alcanza para cerrarle la sesión
   * a otro. Si la cookie no corresponde a nada, no hace nada.
   */
  async revocar(valorCookie?: string): Promise<void> {
    const sesion = await this.buscarSesion(valorCookie);
    if (!sesion) return;

    await this.sesiones.update(
      { sessionId: sesion.sessionId },
      { activa: false },
    );
  }

  private async buscarSesion(
    valorCookie?: string,
  ): Promise<SesionCiudadano | null> {
    const partes = FORMATO_COOKIE.exec(valorCookie ?? '');
    if (!partes) return null;
    const [, sessionId, secreto] = partes;

    // Se busca por PK: no hace falta un índice sobre el hash.
    const sesion = await this.sesiones.findOne({
      where: { sessionId, activa: true },
    });
    if (!sesion?.jwtTokenHash) return null;

    // Comparación en tiempo constante: con `===`, el tiempo de respuesta
    // revelaría cuántos caracteres del hash coinciden. Los dos lados son hex
    // de 64 caracteres; el chequeo de largo solo protege de filas antiguas con
    // otro contenido en la columna, porque timingSafeEqual lanza si difieren.
    const esperado = Buffer.from(sesion.jwtTokenHash);
    const recibido = Buffer.from(sha256(secreto));
    if (
      esperado.length !== recibido.length ||
      !timingSafeEqual(esperado, recibido)
    ) {
      return null;
    }

    return sesion;
  }

  /**
   * Duración de la cookie según el rol actual (SPEC-sesion-unica §2.3): la
   * usan tanto `crear`/`validar` como el controlador, para que el `maxAge` de
   * la cookie sea siempre el mismo número que decide cuándo expira la fila.
   */
  duracionMaxima(usuario: AuthUser): number {
    return usuario.esAdministrador
      ? DURACION_SESION_MUNICIPAL_MS
      : DURACION_SESION_VECINO_MS;
  }

  /**
   * `nombre_sesion` de la sesión activa más reciente del ciudadano, o `null`
   * si no tiene ninguna (o quedó vacío, como en el login de desarrollo). Lo
   * usa `GET /sesion` para vecinos y funcionarios sin ficha en
   * `usuarios_administradores` (SPEC-sesion-unica §2.4).
   */
  async nombreSesionActiva(usuarioCiudadanoId: string): Promise<string | null> {
    const sesion = await this.sesiones.findOne({
      where: { usuarioCiudadanoId, activa: true },
      order: { fechaInicio: 'DESC' },
    });
    return sesion?.nombreSesion ?? null;
  }
}
