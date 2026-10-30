import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import {
  type AuditoriaService,
  type AuthUser,
  type Denuncia,
  EstadoDenuncia,
  MotivoDenuncia,
  OrigenDenuncia,
  type SesionService,
} from '../../core';
import { DenunciasAdminService } from './denuncias-admin.service';

const DENUNCIANTE = '00000000-0000-4000-8000-000000000001';
const DENUNCIADO = '00000000-0000-4000-8000-000000000002';
const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const AHORA = new Date('2026-10-30T12:00:00Z');

const funcionario = {
  ciudadanoId: '00000000-0000-4000-8000-000000000009',
  administradorId: ADMIN,
} as AuthUser;

const denuncia = (extra: Partial<Denuncia> = {}) =>
  ({
    id: 5,
    usuarioDenuncianteId: DENUNCIANTE,
    usuarioDenunciadoId: DENUNCIADO,
    articuloId: 10,
    articulo: { titulo: 'Silla de madera' },
    motivo: MotivoDenuncia.NO_SE_PRESENTO,
    descripcion: 'No llegó',
    origen: OrigenDenuncia.CHAT,
    mensajesAdjuntos: [
      { deQuien: 'denunciado', contenido: 'ahí estoy', fecha: '2026-10-28' },
    ],
    estado: EstadoDenuncia.ABIERTA,
    resolucion: null,
    revisadoPorAdministradorId: null,
    fechaDenuncia: new Date('2026-10-29T10:00:00Z'),
    fechaResolucion: null,
    ...extra,
  }) as Denuncia;

function montar(fila: Denuncia | null = denuncia()) {
  const tx = {
    findOne: jest.fn().mockResolvedValue(fila),
    save: jest.fn((d: Denuncia) => Promise.resolve(d)),
  };
  const denunciaRepo = {
    find: jest.fn(({ select }: { select?: unknown }) =>
      // Con `select` es la consulta de conteo: dos denuncias contra el denunciado.
      Promise.resolve(
        select
          ? [
              { usuarioDenunciadoId: DENUNCIADO },
              { usuarioDenunciadoId: DENUNCIADO },
            ]
          : fila
            ? [fila]
            : [],
      ),
    ),
    findOne: jest.fn().mockResolvedValue(fila),
    manager: {
      transaction: jest.fn((fn: (m: typeof tx) => unknown) => fn(tx)),
    },
  };
  const sesiones = {
    nombreSesionActiva: jest.fn((id: string) =>
      Promise.resolve(id === DENUNCIANTE ? 'Carolina Pérez' : 'Pedro Soto'),
    ),
  };
  const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
  const service = new DenunciasAdminService(
    denunciaRepo as unknown as Repository<Denuncia>,
    sesiones as unknown as SesionService,
    auditoria as unknown as AuditoriaService,
  );
  service.ahora = () => AHORA;
  return { service, tx, denunciaRepo, auditoria };
}

describe('DenunciasAdminService.listar', () => {
  it('muestra nombres de pila y cuántas denuncias acumula el denunciado', async () => {
    const { service } = montar();

    await expect(service.listar('abierta')).resolves.toEqual([
      expect.objectContaining({
        id: 5,
        denuncianteNombre: 'Carolina',
        denunciadoNombre: 'Pedro',
        articuloTitulo: 'Silla de madera',
        denunciasDelDenunciado: 2,
      }),
    ]);
  });

  it('acepta varios estados separados por coma', async () => {
    const { service, denunciaRepo } = montar();

    await service.listar('resuelta,rechazada');
    expect(denunciaRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          estado: expect.objectContaining({
            value: [EstadoDenuncia.RESUELTA, EstadoDenuncia.RECHAZADA],
          }) as unknown,
        },
      }),
    );
  });

  it('rechaza un estado desconocido', async () => {
    const { service } = montar();

    await expect(service.listar('borrada')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('DenunciasAdminService.detalle', () => {
  it('trae solo los mensajes adjuntos, la descripción y la resolución', async () => {
    const { service } = montar();

    const d = await service.detalle(5);
    expect(d.mensajes).toEqual([
      { deQuien: 'denunciado', contenido: 'ahí estoy', fecha: '2026-10-28' },
    ]);
    expect(d.descripcion).toBe('No llegó');
    expect(d).not.toHaveProperty('usuarioDenunciadoId');
  });

  it('404 si no existe', async () => {
    const { service } = montar(null);

    await expect(service.detalle(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DenunciasAdminService.cambiarEstado', () => {
  it('pasa a investigación sin resolución y bloquea la fila', async () => {
    const { service, tx } = montar();

    await service.cambiarEstado(
      5,
      { estado: EstadoDenuncia.INVESTIGACION },
      funcionario,
    );
    expect(tx.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { id: 5 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(tx.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: EstadoDenuncia.INVESTIGACION,
        revisadoPorAdministradorId: ADMIN,
        fechaResolucion: null,
      }),
    );
  });

  it('resolver exige la resolución', async () => {
    const { service, tx } = montar();

    await expect(
      service.cambiarEstado(
        5,
        { estado: EstadoDenuncia.RESUELTA },
        funcionario,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.save).not.toHaveBeenCalled();
  });

  it('cierra con resolución y fecha, y audita sin el texto', async () => {
    const { service, tx, auditoria } = montar(
      denuncia({ estado: EstadoDenuncia.INVESTIGACION }),
    );

    await service.cambiarEstado(
      5,
      { estado: EstadoDenuncia.RECHAZADA, resolucion: 'Sin pruebas' },
      funcionario,
    );
    expect(tx.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: EstadoDenuncia.RECHAZADA,
        resolucion: 'Sin pruebas',
        fechaResolucion: AHORA,
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'denuncias',
        entidadId: 5,
        datosAnteriores: { estado: EstadoDenuncia.INVESTIGACION },
        datosNuevos: {
          estado: EstadoDenuncia.RECHAZADA,
          revisadoPorAdministradorId: ADMIN,
        },
      }),
    );
  });

  it('una cerrada no se reabre', async () => {
    const { service } = montar(denuncia({ estado: EstadoDenuncia.RESUELTA }));

    await expect(
      service.cambiarEstado(
        5,
        { estado: EstadoDenuncia.INVESTIGACION },
        funcionario,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no repite el estado actual', async () => {
    const { service } = montar(
      denuncia({ estado: EstadoDenuncia.INVESTIGACION }),
    );

    await expect(
      service.cambiarEstado(
        5,
        { estado: EstadoDenuncia.INVESTIGACION },
        funcionario,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
