import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AccionAuditoria,
  type AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  type FotoRetiro,
  RolAdministrador,
  type SolicitudRetiro,
  TipoFotoRetiro,
  type UsuarioAdministrador,
  type UsuarioCiudadano,
} from '../../core';
import type { Repository } from 'typeorm';
import { SolicitudesAdminService } from './solicitudes-admin.service';

const FUNCIONARIO: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000002',
  esAdministrador: true,
  administradorId: '00000000-0000-4000-8000-0000000000A2',
  rol: RolAdministrador.FUNCIONARIO,
};

const ADMIN: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000003',
  esAdministrador: true,
  administradorId: '00000000-0000-4000-8000-0000000000A3',
  rol: RolAdministrador.ADMIN,
};

const filaBase = (cambios: Partial<SolicitudRetiro> = {}): SolicitudRetiro =>
  ({
    id: 7,
    usuarioCiudadanoId: '00000000-0000-4000-8000-000000000001',
    residuoCatalogoId: 1,
    estado: EstadoSolicitudRetiro.EN_REVISION,
    estadoPago: EstadoPagoSolicitud.NO_APLICA,
    monto: null,
    fechaRevision: null,
    revisadoPorId: null,
    fechaCierre: null,
    razonRechazo: null,
    residuoCatalogo: { id: 1, precio: 15000 },
    ...cambios,
  }) as SolicitudRetiro;

/**
 * Repositorio en memoria con una sola fila: `findOne` devuelve una copia y
 * `save` la reemplaza, así el service no puede depender de mutar el objeto
 * leído.
 */
function montar(fila: SolicitudRetiro) {
  let guardada = { ...fila };

  const repositorio = {
    findOne: jest.fn(() => Promise.resolve({ ...guardada })),
    save: jest.fn((s: SolicitudRetiro) => {
      guardada = { ...s };
      return Promise.resolve({ ...s });
    }),
  };
  const auditoria = { registrar: jest.fn(() => Promise.resolve()) };

  const funcionarios = {
    findOne: jest.fn(() =>
      Promise.resolve({ id: 'x', nombre: 'Camila', apellido: 'Operadora' }),
    ),
  };

  const service = new SolicitudesAdminService(
    repositorio as unknown as Repository<SolicitudRetiro>,
    funcionarios as unknown as Repository<UsuarioAdministrador>,
    auditoria as unknown as AuditoriaService,
  );

  return { service, repositorio, auditoria, guardada: () => guardada };
}

describe('SolicitudesAdminService.update', () => {
  it('derivar una aprobada sin cobro guarda y audita el cambio', async () => {
    const { service, auditoria, guardada } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.APROBADA }),
    );

    await service.update(
      7,
      { estado: EstadoSolicitudRetiro.DERIVADA },
      FUNCIONARIO,
    );

    expect(guardada().estado).toBe(EstadoSolicitudRetiro.DERIVADA);
    expect(auditoria.registrar).toHaveBeenCalledTimes(1);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: AccionAuditoria.UPDATE,
        entidadId: 7,
        datosAnteriores: { estado: EstadoSolicitudRetiro.APROBADA },
        datosNuevos: { estado: EstadoSolicitudRetiro.DERIVADA },
      }),
    );
  });

  it('una decisión de revisión por PATCH responde 400 (va por POST /revision)', async () => {
    const { service, repositorio } = montar(filaBase());

    await expect(
      service.update(7, { estado: EstadoSolicitudRetiro.APROBADA }, ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repositorio.save).not.toHaveBeenCalled();
  });

  it('una transición que no existe responde 400 y no guarda', async () => {
    const { service, repositorio, auditoria } = montar(filaBase());

    await expect(
      service.update(7, { estado: EstadoSolicitudRetiro.RETIRADA }, ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repositorio.save).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('un funcionario no puede reabrir una rechazada (403)', async () => {
    const { service } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.RECHAZADA }),
    );

    await expect(
      service.update(
        7,
        { estado: EstadoSolicitudRetiro.EN_REVISION },
        FUNCIONARIO,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('un admin sí puede reabrir una rechazada', async () => {
    const { service, guardada } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.RECHAZADA }),
    );

    await service.update(
      7,
      { estado: EstadoSolicitudRetiro.EN_REVISION },
      ADMIN,
    );

    expect(guardada().estado).toBe(EstadoSolicitudRetiro.EN_REVISION);
  });

  it('derivar con pago pendiente responde 400', async () => {
    const { service } = montar(
      filaBase({
        estado: EstadoSolicitudRetiro.APROBADA,
        estadoPago: EstadoPagoSolicitud.PENDIENTE,
      }),
    );

    await expect(
      service.update(
        7,
        { estado: EstadoSolicitudRetiro.DERIVADA },
        FUNCIONARIO,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SolicitudesAdminService.detalle', () => {
  it('lista blanca: sin datos del vecino ni ids internos', async () => {
    const { service } = montar(
      filaBase({
        descripcion: 'Sillón',
        direccionRetiro: 'Pasaje Real 742',
        direccionAnonimizada: 'Calle X',
        revisadoPorId: '00000000-0000-4000-8000-0000000000A9',
        tomadaPorId: '00000000-0000-4000-8000-0000000000A8',
        tomadaHasta: new Date(Date.now() + 60_000),
        latitudCapturada: '-33.63000000',
        loteDerivacionId: 4,
        usuarioCiudadano: {
          id: '00000000-0000-4000-8000-000000000001',
          claveUnicaId: 'clave-unica-secreta',
          ipPrimeraLogin: '10.9.8.7',
        } as unknown as UsuarioCiudadano,
      }),
    );

    const detalle = await service.detalle(7, FUNCIONARIO);

    expect(Object.keys(detalle).sort()).toEqual(
      [
        'id',
        'usuarioCiudadanoId',
        'residuoCatalogoId',
        'residuoCatalogo',
        'estado',
        'estadoPago',
        'monto',
        'descripcion',
        'direccionRetiro',
        'direccionAnonimizada',
        'fechaSolicitud',
        'fechaRevision',
        'fechaCierre',
        'razonRechazo',
        'updatedAt',
        'revisadoPor',
        'tomadaPor',
        'transicionesDisponibles',
        'fotoUrl',
      ].sort(),
    );
    const json = JSON.stringify(detalle);
    for (const prohibido of [
      'clave-unica-secreta',
      '10.9.8.7',
      'claveUnicaId',
      'ipPrimeraLogin',
      '0000000000A9',
      '0000000000A8',
      '-33.63',
    ]) {
      expect(json).not.toContain(prohibido);
    }
    expect(detalle.direccionRetiro).toBe('Pasaje Real 742');
    expect(detalle.usuarioCiudadanoId).toBe(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(detalle.tomadaPor).toEqual({
      id: 'x',
      nombre: 'Camila',
      apellido: 'Operadora',
    });
  });

  it('no carga la relación usuarioCiudadano', async () => {
    const { service, repositorio } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.APROBADA }),
    );

    await service.detalle(7, FUNCIONARIO);
    await service.update(
      7,
      { estado: EstadoSolicitudRetiro.DERIVADA },
      FUNCIONARIO,
    );

    expect(repositorio.findOne).toHaveBeenCalled();
    for (const [opciones] of repositorio.findOne.mock.calls as unknown as [
      { relations?: object },
    ][]) {
      expect(opciones.relations ?? {}).not.toHaveProperty('usuarioCiudadano');
    }
  });

  it('en revisión no ofrece transiciones por PATCH: se decide con /revision', async () => {
    const { service } = montar(filaBase());

    const detalle = await service.detalle(7, FUNCIONARIO);

    expect(detalle.transicionesDisponibles).toEqual([]);
    expect(detalle.tomadaPor).toBeNull();
  });

  it('con foto: devuelve el endpoint protegido y no las filas de foto_retiro', async () => {
    const { service, repositorio } = montar(
      filaBase({
        fotos: [
          {
            tipoFoto: TipoFotoRetiro.ANTES,
            rutaArchivo: 'solicitudes/7/interna.jpg',
            hashIntegridad: 'abc',
          },
        ] as FotoRetiro[],
      }),
    );

    const detalle = await service.detalle(7, FUNCIONARIO);

    expect(detalle.fotoUrl).toBe('/api/solicitudes-retiro/7/foto');
    expect(detalle).not.toHaveProperty('fotos');
    expect(JSON.stringify(detalle)).not.toContain('interna.jpg');
    expect(repositorio.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: expect.objectContaining({ fotos: true }) as unknown,
      }),
    );
  });

  it('sin foto: fotoUrl null', async () => {
    const { service } = montar(filaBase({ fotos: [] }));

    expect((await service.detalle(7, FUNCIONARIO)).fotoUrl).toBeNull();
  });

  it('aprobada sin cobro ofrece derivar', async () => {
    const { service } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.APROBADA }),
    );

    expect(
      (await service.detalle(7, FUNCIONARIO)).transicionesDisponibles,
    ).toEqual([EstadoSolicitudRetiro.DERIVADA]);
  });

  it('rechazada: nada para el funcionario, reabrir para el admin', async () => {
    const { service } = montar(
      filaBase({ estado: EstadoSolicitudRetiro.RECHAZADA }),
    );

    expect(
      (await service.detalle(7, FUNCIONARIO)).transicionesDisponibles,
    ).toEqual([]);
    expect((await service.detalle(7, ADMIN)).transicionesDisponibles).toEqual([
      EstadoSolicitudRetiro.EN_REVISION,
    ]);
  });
});
