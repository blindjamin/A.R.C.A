import { BadRequestException, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import {
  AccionAuditoria,
  type AuditoriaService,
  type AuthUser,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  LoteDerivacion,
  RolAdministrador,
  type SolicitudRetiro,
} from '@arca/core';
import { DerivacionesAdminService } from './derivaciones-admin.service';

const FUNCIONARIO: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000002',
  esAdministrador: true,
  administradorId: '00000000-0000-4000-8000-0000000000A2',
  rol: RolAdministrador.FUNCIONARIO,
};

const VECINO_ID = '11111111-2222-4333-8444-555555555555';

const aprobada = (
  id: number,
  cambios: Partial<SolicitudRetiro> = {},
): SolicitudRetiro =>
  ({
    id,
    usuarioCiudadanoId: VECINO_ID,
    residuoCatalogoId: 1,
    estado: EstadoSolicitudRetiro.APROBADA,
    estadoPago: EstadoPagoSolicitud.NO_APLICA,
    monto: 0,
    descripcion: `Solicitud ${id}`,
    direccionAnonimizada: 'Calle Uno, Santo Domingo',
    latitudCapturada: '-33.63000000',
    longitudCapturada: '-71.63000000',
    fechaSolicitud: new Date('2026-09-01T10:00:00Z'),
    fechaRevision: new Date('2026-09-02T10:00:00Z'),
    revisadoPorId: FUNCIONARIO.administradorId,
    fechaCierre: null,
    loteDerivacionId: null,
    residuoCatalogo: {
      id: 1,
      nombre: 'Sillón 3 cuerpos',
      categoria: 'Muebles',
      instruccionesRecogida: 'Dejar en la vereda',
    },
    ...cambios,
  }) as SolicitudRetiro;

function montar(listas: SolicitudRetiro[]) {
  const guardadas: SolicitudRetiro[] = [];
  const manager = {
    find: jest.fn(() => Promise.resolve(listas.map((s) => ({ ...s })))),
    save: jest.fn((destino: unknown, datos: unknown) => {
      if (destino === LoteDerivacion) {
        return Promise.resolve({
          id: 5,
          createdAt: new Date('2026-09-17T12:00:00Z'),
          ...(datos as object),
        });
      }
      guardadas.push(...(datos as SolicitudRetiro[]));
      return Promise.resolve(datos);
    }),
  };
  const solicitudes = {
    count: jest.fn(() => Promise.resolve(0)),
    find: jest.fn(() => Promise.resolve(guardadas)),
    manager: {
      transaction: jest.fn((fn: (m: typeof manager) => Promise<unknown>) =>
        fn(manager),
      ),
    },
  };
  const lotes = {
    findOne: jest.fn(({ where }: { where: { id: number } }) =>
      Promise.resolve(
        where.id === 5
          ? { id: 5, cantidad: guardadas.length, createdAt: new Date() }
          : null,
      ),
    ),
    find: jest.fn(() => Promise.resolve([])),
  };
  const auditoria = { registrar: jest.fn(() => Promise.resolve()) };

  const service = new DerivacionesAdminService(
    solicitudes as never,
    lotes as never,
    auditoria as unknown as AuditoriaService,
  );

  return { service, manager, guardadas, auditoria };
}

describe('DerivacionesAdminService.crearLote', () => {
  it('deriva las solicitudes listas y las asocia al lote', async () => {
    const { service, manager, guardadas } = montar([aprobada(1), aprobada(2)]);

    const lote = await service.crearLote(FUNCIONARIO);

    expect(lote).toMatchObject({ id: 5, cantidad: 2 });
    expect(guardadas).toHaveLength(2);
    for (const s of guardadas) {
      expect(s.estado).toBe(EstadoSolicitudRetiro.DERIVADA);
      expect(s.loteDerivacionId).toBe(5);
    }
    // Bloquea las filas para que dos lotes simultáneos no se repartan lo mismo.
    expect(manager.find).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });

  it('sin solicitudes listas responde 400 y no crea el lote', async () => {
    const { service, manager } = montar([]);

    await expect(service.crearLote(FUNCIONARIO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('una solicitud con pago pendiente hace fallar el lote completo', async () => {
    const { service, manager } = montar([
      aprobada(1),
      aprobada(2, { estadoPago: EstadoPagoSolicitud.PENDIENTE }),
    ]);

    await expect(service.crearLote(FUNCIONARIO)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('audita el lote y cada cambio de estado', async () => {
    const { service, auditoria } = montar([aprobada(1), aprobada(2)]);

    await service.crearLote(FUNCIONARIO);

    expect(auditoria.registrar).toHaveBeenCalledTimes(3);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'lotes_derivacion',
        accion: AccionAuditoria.CREATE,
        datosNuevos: { cantidad: 2 },
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'solicitudes_retiro',
        entidadId: 1,
        datosNuevos: expect.objectContaining({
          estado: EstadoSolicitudRetiro.DERIVADA,
          loteDerivacionId: 5,
        }) as unknown,
      }),
    );
  });
});

describe('DerivacionesAdminService.excel', () => {
  it('arma una fila por solicitud, sin el id del vecino, y audita la descarga', async () => {
    const { service, auditoria } = montar([aprobada(1), aprobada(2)]);
    await service.crearLote(FUNCIONARIO);
    auditoria.registrar.mockClear();

    const archivo = await service.excel(5, FUNCIONARIO);

    expect(archivo.nombre).toMatch(/^arca-lote-5-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(archivo.contenido as unknown as ArrayBuffer);
    const hoja = libro.worksheets[0];
    const encabezados = (hoja.getRow(1).values as unknown[]).filter(Boolean);

    expect(encabezados).toContain('Solicitud');
    expect(encabezados).toContain('Dirección');
    expect(hoja.rowCount).toBe(3);
    expect(hoja.getRow(2).getCell(5).value).toBe('Sillón 3 cuerpos');

    const todo = JSON.stringify(
      hoja.getSheetValues().map((fila) => fila ?? null),
    );
    expect(todo).not.toContain(VECINO_ID);

    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'lotes_derivacion',
        entidadId: 5,
        accion: AccionAuditoria.ACCESO,
        datosNuevos: { filas: 2 },
      }),
    );
  });

  it('un lote inexistente responde 404', async () => {
    const { service } = montar([]);

    await expect(service.excel(99, FUNCIONARIO)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
