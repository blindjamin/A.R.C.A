import {
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ROLES_KEY } from '../core/auth/decorators/roles.decorator';
import {
  type AuditoriaService,
  type AuthUser,
  BloqueoCiudadano,
  Denuncia,
  RolAdministrador,
  SesionCiudadano,
  UsuarioAdministrador,
} from '../core';
import type { NotificacionesService } from '../notificaciones/notificaciones.service';
import { BloqueosAdminController } from './bloqueos.controller';
import { BloqueosService } from './bloqueos.service';
import { NoBloqueadoGuard } from './no-bloqueado.guard';
import { ROLES_BLOQUEO } from './permisos-bloqueo';

const DENUNCIANTE = '00000000-0000-4000-8000-000000000001';
const DENUNCIADO = '00000000-0000-4000-8000-000000000002';
const ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';

const admin = {
  ciudadanoId: '00000000-0000-4000-8000-000000000009',
  esAdministrador: true,
  administradorId: ADMIN_ID,
  rol: RolAdministrador.ADMIN,
} as AuthUser;

const denuncia = (extra: Partial<Denuncia> = {}) =>
  ({
    id: 5,
    usuarioDenuncianteId: DENUNCIANTE,
    usuarioDenunciadoId: DENUNCIADO,
    ...extra,
  }) as Denuncia;

interface Opciones {
  denuncia?: Denuncia | null;
  ultima?: Partial<BloqueoCiudadano> | null;
  funcionario?: boolean;
}

function montar({
  denuncia: d = denuncia(),
  ultima = null,
  funcionario = false,
}: Opciones = {}) {
  const em = {
    findOne: jest.fn((entidad: unknown) => {
      if (entidad === Denuncia) return Promise.resolve(d);
      if (entidad === BloqueoCiudadano) return Promise.resolve(ultima);
      if (entidad === UsuarioAdministrador)
        return Promise.resolve(funcionario ? { id: 'x' } : null);
      return Promise.resolve({ id: DENUNCIADO });
    }),
    create: jest.fn((_e: unknown, datos: object) => datos),
    save: jest.fn((fila: object) => Promise.resolve({ id: 77, ...fila })),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    manager: em,
    transaction: jest.fn((fn: (m: typeof em) => unknown) => fn(em)),
  };
  const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
  const notificaciones = { notificar: jest.fn().mockResolvedValue(undefined) };
  const service = new BloqueosService(
    dataSource as never,
    auditoria as unknown as AuditoriaService,
    notificaciones as unknown as NotificacionesService,
  );
  return { service, em, auditoria, notificaciones };
}

describe('permiso de bloqueo', () => {
  it('solo el admin escribe; el funcionario solo consulta', () => {
    expect(ROLES_BLOQUEO).toEqual([RolAdministrador.ADMIN]);
    const metodo = (n: 'bloquear' | 'desbloquear' | 'estado') => {
      const proto = BloqueosAdminController.prototype as unknown as Record<
        string,
        object
      >;
      return Reflect.getMetadata(ROLES_KEY, proto[n]) as
        RolAdministrador[] | undefined;
    };
    expect(metodo('bloquear')).toEqual(ROLES_BLOQUEO);
    expect(metodo('desbloquear')).toEqual(ROLES_BLOQUEO);
    expect(metodo('estado')).toBeUndefined();
  });

  it('puedeBloquear es falso para el funcionario', async () => {
    const { service } = montar();
    const estado = await service.estadoPorDenuncia(5, {
      ...admin,
      rol: RolAdministrador.FUNCIONARIO,
    });
    expect(estado.puedeBloquear).toBe(false);
  });
});

describe('BloqueosService.bloquear', () => {
  it('guarda el bloqueo, cierra las sesiones, audita sin motivo y avisa', async () => {
    const { service, em, auditoria, notificaciones } = montar();

    await service.bloquear(5, 'Acoso en el chat', admin);

    expect(em.save).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioCiudadanoId: DENUNCIADO,
        accion: 'bloqueo',
        motivo: 'Acoso en el chat',
        administradorId: ADMIN_ID,
        denunciaId: 5,
      }),
    );
    expect(em.update).toHaveBeenCalledWith(
      SesionCiudadano,
      { usuarioCiudadanoId: DENUNCIADO, activa: true },
      { activa: false },
    );
    const registro = (auditoria.registrar.mock.calls as unknown[][])[0][0] as {
      entidad: string;
      entidadId: number;
      datosNuevos: object;
    };
    expect(registro.entidad).toBe('bloqueos_ciudadano');
    expect(registro.entidadId).toBe(77);
    expect(registro.datosNuevos).toEqual({ accion: 'bloqueo', denunciaId: 5 });
    expect(JSON.stringify(registro)).not.toContain('Acoso');
    expect(JSON.stringify(registro)).not.toContain(DENUNCIADO);
    expect(notificaciones.notificar).toHaveBeenCalledWith(
      DENUNCIADO,
      expect.objectContaining({
        tipo: 'bloqueo',
        cuerpo: 'Tu cuenta fue bloqueada en el Marketplace',
      }),
    );
  });

  it('rechaza a quien no es admin', async () => {
    const { service } = montar();
    await expect(
      service.bloquear(5, 'x', { ...admin, rol: RolAdministrador.FUNCIONARIO }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404 si la denuncia no existe o el denunciado es quien bloquea', async () => {
    await expect(
      montar({ denuncia: null }).service.bloquear(5, 'x', admin),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      montar({
        denuncia: denuncia({ usuarioDenunciadoId: admin.ciudadanoId }),
      }).service.bloquear(5, 'x', admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('403 si quien bloquea es el denunciante', async () => {
    const { service } = montar({
      denuncia: denuncia({ usuarioDenuncianteId: admin.ciudadanoId }),
    });
    await expect(service.bloquear(5, 'x', admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('409 a un funcionario', async () => {
    const { service, em } = montar({ funcionario: true });
    await expect(service.bloquear(5, 'x', admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(em.save).not.toHaveBeenCalled();
  });

  it('409 si ya está bloqueado', async () => {
    const { service, em } = montar({ ultima: { accion: 'bloqueo' } });
    await expect(service.bloquear(5, 'x', admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(em.save).not.toHaveBeenCalled();
  });
});

describe('BloqueosService.desbloquear', () => {
  it('409 si no está bloqueado, también tras un desbloqueo', async () => {
    await expect(
      montar().service.desbloquear(5, 'x', admin),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      montar({ ultima: { accion: 'desbloqueo' } }).service.desbloquear(
        5,
        'x',
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('guarda el desbloqueo sin tocar las sesiones y avisa', async () => {
    const { service, em, auditoria, notificaciones } = montar({
      ultima: { accion: 'bloqueo' },
    });

    await service.desbloquear(5, 'Revisado', admin);

    expect(em.save).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'desbloqueo', motivo: 'Revisado' }),
    );
    expect(em.update).not.toHaveBeenCalled();
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        datosNuevos: { accion: 'desbloqueo', denunciaId: 5 },
      }),
    );
    expect(notificaciones.notificar).toHaveBeenCalledWith(
      DENUNCIADO,
      expect.objectContaining({
        cuerpo: 'Tu cuenta ya puede volver a usar el Marketplace',
      }),
    );
  });
});

describe('NoBloqueadoGuard', () => {
  const contexto = (user: object) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('403 si el vecino está bloqueado', async () => {
    const { service } = montar({ ultima: { accion: 'bloqueo' } });
    const guard = new NoBloqueadoGuard(service);
    await expect(
      guard.canActivate(contexto({ ciudadanoId: DENUNCIADO })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('pasa si no tiene bloqueo o ya lo levantaron', async () => {
    for (const ultima of [null, { accion: 'desbloqueo' as const }]) {
      const guard = new NoBloqueadoGuard(montar({ ultima }).service);
      await expect(
        guard.canActivate(contexto({ ciudadanoId: DENUNCIADO })),
      ).resolves.toBe(true);
    }
  });
});
