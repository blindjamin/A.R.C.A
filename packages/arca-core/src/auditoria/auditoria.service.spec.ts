import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Auditoria } from '../entities/auditoria.entity';
import { AccionAuditoria } from '../entities/accion-auditoria.enum';
import { TipoActorAuditoria } from '../entities/tipo-actor-auditoria.enum';
import { RolAdministrador } from '../entities/rol-administrador.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { AuditoriaService } from './auditoria.service';

const CIUDADANO_ID = '00000000-0000-4000-8000-000000000001';
const DOBLE_ROL_CIUDADANO_ID = '00000000-0000-4000-8000-000000000002';
const ADMINISTRADOR_ID = '00000000-0000-4000-8000-0000000000A2';

/** Vecino sin perfil municipal. */
const vecino: AuthUser = {
  ciudadanoId: CIUDADANO_ID,
  esAdministrador: false,
  administradorId: null,
  rol: null,
};

/**
 * La misma persona con los dos perfiles: es el caso real del municipio, donde
 * a un funcionario se le asigna el rol de administrador sobre su identidad
 * ciudadana y puede entrar de una forma o de la otra.
 */
const dobleRol: AuthUser = {
  ciudadanoId: DOBLE_ROL_CIUDADANO_ID,
  esAdministrador: true,
  administradorId: ADMINISTRADOR_ID,
  rol: RolAdministrador.OPERADOR,
};

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let repo: jest.Mocked<Pick<Repository<Auditoria>, 'create' | 'save'>>;
  let guardado: Partial<Auditoria>;

  beforeEach(() => {
    guardado = {};
    repo = {
      create: jest.fn((datos) => {
        guardado = datos as Partial<Auditoria>;
        return guardado as Auditoria;
      }),
      save: jest.fn().mockResolvedValue({ id: 1 }),
    };

    service = new AuditoriaService(repo as unknown as Repository<Auditoria>);
  });

  describe('identidad del actor (perfil con el que actuó)', () => {
    it('registra como ciudadano y deja vacío el actor administrador', async () => {
      await service.registrar({
        tipoActor: TipoActorAuditoria.CIUDADANO,
        actor: vecino,
        entidad: 'solicitudes_retiro',
        entidadId: 7,
        accion: AccionAuditoria.CREATE,
      });

      expect(guardado.tipoActor).toBe(TipoActorAuditoria.CIUDADANO);
      expect(guardado.actorCiudadanoId).toBe(CIUDADANO_ID);
      expect(guardado.actorAdministradorId).toBeNull();
    });

    it('registra como administrador y deja vacío el actor ciudadano', async () => {
      await service.registrar({
        tipoActor: TipoActorAuditoria.ADMINISTRADOR,
        actor: dobleRol,
        entidad: 'solicitudes_retiro',
        entidadId: 7,
        accion: AccionAuditoria.UPDATE,
      });

      expect(guardado.tipoActor).toBe(TipoActorAuditoria.ADMINISTRADOR);
      expect(guardado.actorAdministradorId).toBe(ADMINISTRADOR_ID);
      expect(guardado.actorCiudadanoId).toBeNull();
    });

    it('la persona de doble rol se registra según el perfil con el que actuó, no según los roles que tenga', async () => {
      // Misma identidad, dos acciones en backends distintos: la ciudadana no
      // debe quedar atribuida a su perfil municipal.
      await service.registrar({
        tipoActor: TipoActorAuditoria.CIUDADANO,
        actor: dobleRol,
        entidad: 'solicitudes_retiro',
        entidadId: 9,
        accion: AccionAuditoria.UPDATE,
      });

      expect(guardado.tipoActor).toBe(TipoActorAuditoria.CIUDADANO);
      expect(guardado.actorCiudadanoId).toBe(DOBLE_ROL_CIUDADANO_ID);
      expect(guardado.actorAdministradorId).toBeNull();
    });

    it('nunca llena las dos columnas de actor a la vez', async () => {
      for (const tipo of [
        TipoActorAuditoria.CIUDADANO,
        TipoActorAuditoria.ADMINISTRADOR,
        TipoActorAuditoria.SISTEMA,
      ]) {
        await service.registrar({
          tipoActor: tipo,
          actor: dobleRol,
          entidad: 'solicitudes_retiro',
          accion: AccionAuditoria.UPDATE,
        });

        const llenas = [
          guardado.actorCiudadanoId,
          guardado.actorAdministradorId,
        ].filter(Boolean);

        expect(llenas.length).toBeLessThanOrEqual(1);
      }
    });

    it('degrada a sistema si se pide administrador sin administradorId, en vez de atribuirlo al ciudadano', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await service.registrar({
        tipoActor: TipoActorAuditoria.ADMINISTRADOR,
        actor: vecino,
        entidad: 'solicitudes_retiro',
        accion: AccionAuditoria.UPDATE,
      });

      expect(guardado.tipoActor).toBe(TipoActorAuditoria.SISTEMA);
      expect(guardado.actorCiudadanoId).toBeNull();
      expect(guardado.actorAdministradorId).toBeNull();
    });

    it('registra como sistema cuando no hay actor', async () => {
      await service.registrar({
        tipoActor: TipoActorAuditoria.SISTEMA,
        entidad: 'solicitudes_retiro',
        accion: AccionAuditoria.DELETE,
      });

      expect(guardado.tipoActor).toBe(TipoActorAuditoria.SISTEMA);
      expect(guardado.actorCiudadanoId).toBeNull();
      expect(guardado.actorAdministradorId).toBeNull();
    });
  });

  describe('minimización de datos (Ley 21.719)', () => {
    it('guarda tal cual el campo modificado que se le entrega', async () => {
      await service.registrar({
        tipoActor: TipoActorAuditoria.ADMINISTRADOR,
        actor: dobleRol,
        entidad: 'solicitudes_retiro',
        entidadId: 42,
        accion: AccionAuditoria.UPDATE,
        datosAnteriores: { estado: 'pendiente' },
        datosNuevos: { estado: 'asignada' },
      });

      expect(guardado.datosAnteriores).toEqual({ estado: 'pendiente' });
      expect(guardado.datosNuevos).toEqual({ estado: 'asignada' });
    });

    it('deja los campos en null cuando la acción no tiene antes y después', async () => {
      await service.registrar({
        tipoActor: TipoActorAuditoria.CIUDADANO,
        actor: vecino,
        entidad: 'solicitudes_retiro',
        entidadId: 42,
        accion: AccionAuditoria.CREATE,
      });

      expect(guardado.datosAnteriores).toBeNull();
      expect(guardado.datosNuevos).toBeNull();
    });
  });

  describe('origen de la petición', () => {
    it('guarda ip y user agent cuando vienen', async () => {
      await service.registrar({
        tipoActor: TipoActorAuditoria.CIUDADANO,
        actor: vecino,
        entidad: 'solicitudes_retiro',
        accion: AccionAuditoria.CREATE,
        origen: { ip: '190.162.45.12', userAgent: 'Mozilla/5.0' },
      });

      expect(guardado.ipOrigen).toBe('190.162.45.12');
      expect(guardado.userAgent).toBe('Mozilla/5.0');
    });

    it('acepta acciones sin origen, como las de procesos automáticos', async () => {
      await service.registrar({
        tipoActor: TipoActorAuditoria.SISTEMA,
        entidad: 'solicitudes_retiro',
        accion: AccionAuditoria.DELETE,
      });

      expect(guardado.ipOrigen).toBeNull();
      expect(guardado.userAgent).toBeNull();
    });
  });

  describe('no interrumpe la operación de negocio', () => {
    it('no propaga el error si falla la escritura', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      repo.save.mockRejectedValueOnce(new Error('conexión perdida'));

      await expect(
        service.registrar({
          tipoActor: TipoActorAuditoria.CIUDADANO,
          actor: vecino,
          entidad: 'solicitudes_retiro',
          entidadId: 42,
          accion: AccionAuditoria.CREATE,
        }),
      ).resolves.toBeUndefined();
    });

    it('al fallar no vuelca los datos del campo al log de la aplicación', async () => {
      const error = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      repo.save.mockRejectedValueOnce(new Error('conexión perdida'));

      await service.registrar({
        tipoActor: TipoActorAuditoria.ADMINISTRADOR,
        actor: dobleRol,
        entidad: 'solicitudes_retiro',
        entidadId: 42,
        accion: AccionAuditoria.UPDATE,
        datosAnteriores: { descripcion: 'Los Aromos 452' },
        datosNuevos: { descripcion: 'Los Aromos 455' },
      });

      const mensaje = error.mock.calls.flat().join(' ');

      expect(mensaje).not.toContain('Los Aromos');
      expect(mensaje).toContain('solicitudes_retiro');
    });
  });

  it('fecha_accion se fija en el servidor, no la envía quien llama', async () => {
    const antes = Date.now();

    await service.registrar({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: vecino,
      entidad: 'solicitudes_retiro',
      accion: AccionAuditoria.CREATE,
    });

    const fecha = guardado.fechaAccion as Date;

    expect(fecha).toBeInstanceOf(Date);
    expect(fecha.getTime()).toBeGreaterThanOrEqual(antes);
  });
});
