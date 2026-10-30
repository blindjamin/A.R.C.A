import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { FindManyOptions, FindOperator } from 'typeorm';
import { EstadoSolicitudRetiro, type SolicitudRetiro } from '../../core';
import { LIMITE_EXPORTACION } from '../comun/exportar-tabla';
import { ExportarPagadasDto } from './dto/filtro-pagadas.dto';
import { PagadasAdminService } from './pagadas-admin.service';

function montar(filas: Partial<SolicitudRetiro>[] = []) {
  const repo = {
    find: jest.fn((o: FindManyOptions<SolicitudRetiro>) => {
      void o;
      return Promise.resolve(filas as SolicitudRetiro[]);
    }),
  };
  const servicio = new PagadasAdminService(repo as never);
  const ultimaConsulta = () => repo.find.mock.calls.at(-1)![0];
  return { servicio, ultimaConsulta };
}

const fila = (
  cambios: Partial<SolicitudRetiro> = {},
): Partial<SolicitudRetiro> => ({
  id: 1,
  estado: EstadoSolicitudRetiro.APROBADA,
  fechaSolicitud: new Date('2026-10-16T15:00:00Z'),
  fechaRevision: null,
  direccionAnonimizada: null,
  latitudCapturada: null,
  longitudCapturada: null,
  monto: 15000,
  residuoCatalogoId: 4,
  residuoCatalogo: { nombre: 'Sofá', categoria: 'Muebles' } as never,
  ...cambios,
});

const fechaWhere = (o: FindManyOptions<SolicitudRetiro>) =>
  (o.where as { fechaSolicitud: FindOperator<Date> }).fechaSolicitud;

describe('PagadasAdminService', () => {
  it('sin filtros trae solo pagadas, de la más nueva a la más antigua', async () => {
    const { servicio, ultimaConsulta } = montar();
    await servicio.findAll();

    expect(ultimaConsulta().where).toEqual({ estadoPago: 'pagado' });
    expect(ultimaConsulta().order).toEqual({
      fechaSolicitud: 'DESC',
      id: 'DESC',
      objetos: { orden: 'ASC' },
    });
    expect(ultimaConsulta().take).toBe(1000);
    expect(ultimaConsulta().relations).toEqual({
      residuoCatalogo: true,
      objetos: { residuoCatalogo: true },
    });
  });

  it('filtra por estado del ciclo y mantiene el estado de pago', async () => {
    const { servicio, ultimaConsulta } = montar();
    await servicio.findAll({ estado: EstadoSolicitudRetiro.DERIVADA });

    expect(ultimaConsulta().where).toEqual({
      estadoPago: 'pagado',
      estado: 'derivada',
    });
  });

  it('filtra por rango sobre la fecha de solicitud', async () => {
    const { servicio, ultimaConsulta } = montar();
    await servicio.findAll({
      desde: '2026-10-01T03:00:00.000Z',
      hasta: '2026-10-02T02:59:59.999Z',
    });
    const entre = fechaWhere(ultimaConsulta());
    expect(entre.type).toBe('between');
    expect(entre.value).toEqual([
      new Date('2026-10-01T03:00:00.000Z'),
      new Date('2026-10-02T02:59:59.999Z'),
    ]);

    await servicio.findAll({ desde: '2026-10-01T03:00:00.000Z' });
    expect(fechaWhere(ultimaConsulta()).type).toBe('moreThanOrEqual');
  });

  it('rechaza un rango invertido o de más de un año', async () => {
    const { servicio } = montar();
    await expect(
      servicio.findAll({
        desde: '2026-10-02T00:00:00.000Z',
        hasta: '2026-10-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      servicio.findAll({
        desde: '2025-01-01T00:00:00.000Z',
        hasta: '2026-10-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filtra por sector en memoria, con tope de exportación', async () => {
    const { servicio, ultimaConsulta } = montar([
      fila({
        id: 1,
        latitudCapturada: '-33.65340000',
        longitudCapturada: '-71.59050000',
      }),
      fila({
        id: 2,
        latitudCapturada: '-33.62750000',
        longitudCapturada: '-71.63000000',
      }),
      fila({ id: 3 }),
    ]);

    const enrique = await servicio.findAll({ sector: 'San Enrique' });
    expect(enrique.map((s) => s.id)).toEqual([1]);
    expect(ultimaConsulta().take).toBe(LIMITE_EXPORTACION);

    const sin = await servicio.findAll({ sector: 'Sin ubicación' });
    expect(sin.map((s) => s.id)).toEqual([3]);
  });

  it('mapea solo la lista blanca de campos', async () => {
    const { servicio } = montar([
      fila({
        usuarioCiudadanoId: 'uuid-vecino',
        descripcion: 'Dato del vecino',
      }),
      fila({ id: 2, direccionAnonimizada: 'Calle X' }),
    ]);

    const [a, b] = await servicio.findAll();
    expect(a).toEqual({
      id: 1,
      fechaSolicitud: '2026-10-16T15:00:00.000Z',
      fechaRevision: null,
      estado: 'aprobada',
      residuo: 'Sofá',
      categoria: 'Muebles',
      sector: 'Sin ubicación',
      direccion: '',
      monto: 15000,
    });
    expect(b.direccion).toBe('Calle X');
  });

  it('exportar usa los mismos filtros con el tope de la exportación', async () => {
    const { servicio, ultimaConsulta } = montar();
    await servicio.exportar({ estado: EstadoSolicitudRetiro.DERIVADA });

    expect(ultimaConsulta().where).toEqual({
      estadoPago: 'pagado',
      estado: 'derivada',
    });
    expect(ultimaConsulta().take).toBe(LIMITE_EXPORTACION);
  });

  it('sectores devuelve los 7 sectores más «Sin ubicación»', () => {
    const { servicio } = montar();
    const sectores = servicio.sectores();
    expect(sectores).toHaveLength(8);
    expect(sectores.at(-1)).toBe('Sin ubicación');
  });
});

describe('ExportarPagadasDto', () => {
  const errores = (q: object) =>
    validate(plainToInstance(ExportarPagadasDto, q), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it.each([
    { sector: 'Marte' },
    { estado: 'pagada' },
    { desde: '2026-13-01' },
    { formato: 'pdf' },
    { limite: 5 },
  ])('rechaza %j', async (q) => {
    expect((await errores(q)).length).toBeGreaterThan(0);
  });

  it('acepta filtros válidos', async () => {
    expect(
      await errores({ sector: 'Bahía', estado: 'retirada', formato: 'xlsx' }),
    ).toHaveLength(0);
  });
});
