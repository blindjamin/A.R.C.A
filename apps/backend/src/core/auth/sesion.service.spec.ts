import { createHash } from 'node:crypto';
import type { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { SesionService } from './sesion.service';
import type { PerfilAccesoResolver } from './interfaces/perfil-acceso-resolver.interface';
import { RolAdministrador } from '../entities/rol-administrador.enum';
import type { SesionCiudadano } from '../entities/sesion-ciudadano.entity';
import type { UsuarioCiudadano } from '../entities/usuario-ciudadano.entity';

const CIUDADANO_ID = '00000000-0000-4000-8000-000000000002';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const SECRETO = 'ab'.repeat(32);
const COOKIE = `${SESSION_ID}.${SECRETO}`;
const AHORA = new Date('2026-09-26T12:00:00Z');

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

const sha256 = (valor: string) =>
  createHash('sha256').update(valor).digest('hex');
const antes = (ms: number) => new Date(AHORA.getTime() - ms);

describe('SesionService', () => {
  // Una sola fila en memoria: findOne respeta el `where`, así una sesión
  // revocada deja de encontrarse igual que en la base.
  let fila: SesionCiudadano | null;
  let repoSesiones: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let repoUsuarios: { findOne: jest.Mock };
  let resolver: { getPerfilAcceso: jest.Mock };
  let servicio: SesionService;

  const comoVecino = () =>
    resolver.getPerfilAcceso.mockResolvedValue({
      usuarioCiudadanoId: CIUDADANO_ID,
      esAdministrador: false,
      administrador: null,
    });

  const comoFuncionario = () =>
    resolver.getPerfilAcceso.mockResolvedValue({
      usuarioCiudadanoId: CIUDADANO_ID,
      esAdministrador: true,
      administrador: {
        id: '00000000-0000-4000-8000-0000000000a2',
        nombre: 'Camila',
        apellido: 'Operadora',
        rol: RolAdministrador.FUNCIONARIO,
      },
    });

  const conFila = (cambios: Partial<SesionCiudadano> = {}) => {
    fila = {
      sessionId: SESSION_ID,
      usuarioCiudadanoId: CIUDADANO_ID,
      jwtTokenHash: sha256(SECRETO),
      fechaInicio: antes(HORA),
      fechaExpiracion: antes(-DIA),
      updatedAt: antes(5 * SEGUNDO),
      activa: true,
      ...cambios,
    } as SesionCiudadano;
  };

  beforeEach(() => {
    fila = null;
    repoSesiones = {
      findOne: jest.fn(({ where }: { where: Partial<SesionCiudadano> }) =>
        Promise.resolve(
          fila &&
            fila.sessionId === where.sessionId &&
            (where.activa === undefined || fila.activa === where.activa)
            ? fila
            : null,
        ),
      ),
      create: jest.fn((datos: Partial<SesionCiudadano>) => ({ ...datos })),
      save: jest.fn((entidad: SesionCiudadano) => Promise.resolve(entidad)),
      update: jest.fn(
        (_criterio: unknown, cambios: Partial<SesionCiudadano>) => {
          if (fila) Object.assign(fila, cambios);
          return Promise.resolve({ affected: 1 });
        },
      ),
    };
    repoUsuarios = {
      findOne: jest.fn().mockResolvedValue({ id: CIUDADANO_ID, activo: true }),
    };
    resolver = { getPerfilAcceso: jest.fn() };
    comoVecino();

    servicio = new SesionService(
      repoSesiones as unknown as Repository<SesionCiudadano>,
      repoUsuarios as unknown as Repository<UsuarioCiudadano>,
      new AuthService(resolver as PerfilAccesoResolver),
    );
    servicio.ahora = () => AHORA;
  });

  describe('crear', () => {
    it('devuelve uuid.hex64 y guarda el hash, nunca el secreto', async () => {
      const cookie = await servicio.crear({
        usuarioCiudadanoId: CIUDADANO_ID,
        nombre: 'Ana',
        ip: '10.0.0.1',
        userAgent: 'jest',
      });

      expect(cookie).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[0-9a-f]{64}$/,
      );
      const [sessionId, secreto] = cookie.split('.');

      const guardada = repoSesiones.save.mock.calls[0][0] as SesionCiudadano;
      expect(guardada).toMatchObject({
        sessionId,
        usuarioCiudadanoId: CIUDADANO_ID,
        jwtTokenHash: sha256(secreto),
        nombreSesion: 'Ana',
        apellidoSesion: null,
        ipSesion: '10.0.0.1',
        userAgent: 'jest',
        fechaInicio: AHORA,
        activa: true,
      });
      expect(JSON.stringify(guardada)).not.toContain(secreto);
    });

    it('dura 7 días para un vecino', async () => {
      await servicio.crear({ usuarioCiudadanoId: CIUDADANO_ID });

      const guardada = repoSesiones.save.mock.calls[0][0] as SesionCiudadano;
      expect(guardada.fechaExpiracion).toEqual(antes(-7 * DIA));
    });

    it('dura 8 horas para un funcionario', async () => {
      comoFuncionario();
      await servicio.crear({ usuarioCiudadanoId: CIUDADANO_ID });

      const guardada = repoSesiones.save.mock.calls[0][0] as SesionCiudadano;
      expect(guardada.fechaExpiracion).toEqual(antes(-8 * HORA));
    });

    it('no crea sesión para un ciudadano inexistente o desactivado', async () => {
      repoUsuarios.findOne.mockResolvedValue(null);

      await expect(
        servicio.crear({ usuarioCiudadanoId: CIUDADANO_ID }),
      ).rejects.toThrow();
      expect(repoSesiones.save).not.toHaveBeenCalled();
    });

    it('la cookie que devuelve se valida', async () => {
      const cookie = await servicio.crear({ usuarioCiudadanoId: CIUDADANO_ID });
      fila = repoSesiones.save.mock.calls[0][0] as SesionCiudadano;

      await expect(servicio.validar(cookie)).resolves.toMatchObject({
        ciudadanoId: CIUDADANO_ID,
      });
    });
  });

  describe('validar', () => {
    it('devuelve el AuthUser con una cookie válida', async () => {
      comoFuncionario();
      conFila();

      await expect(servicio.validar(COOKIE)).resolves.toEqual({
        ciudadanoId: CIUDADANO_ID,
        esAdministrador: true,
        administradorId: '00000000-0000-4000-8000-0000000000a2',
        rol: RolAdministrador.FUNCIONARIO,
      });
    });

    it('devuelve null con el secreto incorrecto', async () => {
      conFila();

      await expect(
        servicio.validar(`${SESSION_ID}.${'cd'.repeat(32)}`),
      ).resolves.toBeNull();
    });

    it.each([
      ['sin cookie', undefined],
      ['vacía', ''],
      ['sin punto', `${SESSION_ID}${SECRETO}`],
      ['uuid malo', `no-es-uuid.${SECRETO}`],
      ['secreto no hex', `${SESSION_ID}.${'zz'.repeat(32)}`],
      ['secreto corto', `${SESSION_ID}.abcd`],
      ['partes de más', `${COOKIE}.${SECRETO}`],
    ])('devuelve null con formato inválido (%s)', async (_caso, cookie) => {
      conFila();

      await expect(servicio.validar(cookie)).resolves.toBeNull();
      expect(repoSesiones.findOne).not.toHaveBeenCalled();
    });

    it('devuelve null si la sesión no existe', async () => {
      await expect(servicio.validar(COOKIE)).resolves.toBeNull();
    });

    it('devuelve null si la sesión está revocada', async () => {
      conFila({ activa: false });

      await expect(servicio.validar(COOKIE)).resolves.toBeNull();
    });

    it('vecino: vale a los 7 días justos y no a los 7 días + 1 s', async () => {
      conFila({ fechaInicio: antes(7 * DIA) });
      await expect(servicio.validar(COOKIE)).resolves.not.toBeNull();

      conFila({ fechaInicio: antes(7 * DIA + SEGUNDO) });
      await expect(servicio.validar(COOKIE)).resolves.toBeNull();
    });

    it('funcionario: no vale a las 8 horas + 1 s', async () => {
      comoFuncionario();
      conFila({ fechaInicio: antes(8 * HORA + SEGUNDO) });

      await expect(servicio.validar(COOKIE)).resolves.toBeNull();
    });

    it('el límite usa el rol actual: un vecino ascendido pasa a 8 horas', async () => {
      conFila({ fechaInicio: antes(9 * HORA) });
      await expect(servicio.validar(COOKIE)).resolves.not.toBeNull();

      comoFuncionario();
      await expect(servicio.validar(COOKIE)).resolves.toBeNull();
    });

    it('funcionario con 31 min sin actividad: null y marca activa = false', async () => {
      comoFuncionario();
      conFila({ updatedAt: antes(31 * MINUTO) });

      await expect(servicio.validar(COOKIE)).resolves.toBeNull();
      expect(repoSesiones.update).toHaveBeenCalledWith(
        { sessionId: SESSION_ID },
        { activa: false },
      );
      expect(fila?.activa).toBe(false);
    });

    it('funcionario con 29 min sin actividad sigue válido', async () => {
      comoFuncionario();
      conFila({ updatedAt: antes(29 * MINUTO) });

      await expect(servicio.validar(COOKIE)).resolves.not.toBeNull();
    });

    it('vecino con 31 min sin actividad sigue válido', async () => {
      conFila({ updatedAt: antes(31 * MINUTO) });

      await expect(servicio.validar(COOKIE)).resolves.not.toBeNull();
    });

    it('toca updated_at si pasaron más de 60 s', async () => {
      conFila({ updatedAt: antes(61 * SEGUNDO) });

      await servicio.validar(COOKIE);

      expect(repoSesiones.update).toHaveBeenCalledWith(
        { sessionId: SESSION_ID },
        { updatedAt: AHORA },
      );
    });

    it('no toca updated_at si pasaron 60 s o menos', async () => {
      conFila({ updatedAt: antes(60 * SEGUNDO) });

      await servicio.validar(COOKIE);

      expect(repoSesiones.update).not.toHaveBeenCalled();
    });
  });

  describe('revocar', () => {
    it('marca activa = false y la cookie deja de valer', async () => {
      conFila();

      await servicio.revocar(COOKIE);

      expect(repoSesiones.update).toHaveBeenCalledWith(
        { sessionId: SESSION_ID },
        { activa: false },
      );
      await expect(servicio.validar(COOKIE)).resolves.toBeNull();
    });

    it('no revoca con el secreto incorrecto', async () => {
      conFila();

      await servicio.revocar(`${SESSION_ID}.${'cd'.repeat(32)}`);

      expect(repoSesiones.update).not.toHaveBeenCalled();
    });

    it('no lanza si no hay sesión o la cookie es inválida', async () => {
      await expect(servicio.revocar(COOKIE)).resolves.toBeUndefined();
      await expect(servicio.revocar('basura')).resolves.toBeUndefined();
      await expect(servicio.revocar(undefined)).resolves.toBeUndefined();
    });
  });
});
