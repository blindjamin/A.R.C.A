import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import {
  ArticuloMarketplace,
  type AuditoriaService,
  type AuthUser,
  ContactoCiudadano,
  ESPERA_VUELTA_MS,
  EstadoPagoSolicitud,
  EstadoSolicitudRetiro,
  SesionCiudadano,
  SolicitudRetiro,
  SuscripcionPush,
  UsuarioCiudadano,
} from '../core';
import { BajaService } from './baja.service';

const VECINO = '00000000-0000-4000-8000-000000000001';
const AHORA = new Date('2026-10-28T12:00:00Z');

const usuario = (esAdministrador = false) =>
  ({ ciudadanoId: VECINO, esAdministrador }) as AuthUser;

const solicitud = (
  id: number,
  estado: EstadoSolicitudRetiro,
  estadoPago = EstadoPagoSolicitud.PENDIENTE,
) =>
  ({
    id,
    estado,
    estadoPago,
    usuarioCiudadanoId: VECINO,
    razonRechazo: null,
    direccionRetiro: 'Calle Falsa 123',
    direccionAnonimizada: 'Calle Falsa 123',
  }) as unknown as SolicitudRetiro;

function montar({
  abiertas = [] as SolicitudRetiro[],
  reservados = [] as Partial<ArticuloMarketplace>[],
} = {}) {
  const em = {
    find: jest.fn((entidad: unknown, opciones: { where: unknown }) => {
      if (entidad === ArticuloMarketplace) return Promise.resolve(reservados);
      // Primera llamada: la revisión; segunda: las que se cancelan, por id.
      const where = opciones.where as { id?: { value: number[] } };
      if (where.id) {
        return Promise.resolve(
          abiertas.filter((s) => where.id!.value.includes(s.id)),
        );
      }
      return Promise.resolve(abiertas);
    }),
    save: jest.fn((_entidad: unknown, filas: unknown) =>
      Promise.resolve(filas),
    ),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const dataSource = {
    manager: em,
    transaction: jest.fn((fn: (m: typeof em) => unknown) => fn(em)),
  };
  const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
  const service = new BajaService(
    dataSource as unknown as DataSource,
    auditoria as unknown as AuditoriaService,
  );
  service.ahora = () => AHORA;
  return { service, em, auditoria };
}

describe('BajaService.estado', () => {
  it('sin solicitudes ni reservas: puede darse de baja', async () => {
    const { service } = montar();

    await expect(service.estado(usuario())).resolves.toEqual({
      puedeDarseDeBaja: true,
      solicitudesQueBloquean: [],
      articulosQueBloquean: [],
      solicitudesQueSeCancelan: [],
      horasParaVolver: 48,
    });
  });

  it('separa las que se cancelan de las pagadas o en retiro, que bloquean', async () => {
    const { service } = montar({
      abiertas: [
        solicitud(1, EstadoSolicitudRetiro.EN_REVISION),
        solicitud(2, EstadoSolicitudRetiro.APROBADA),
        solicitud(
          3,
          EstadoSolicitudRetiro.APROBADA,
          EstadoPagoSolicitud.PAGADO,
        ),
        solicitud(
          4,
          EstadoSolicitudRetiro.DERIVADA,
          EstadoPagoSolicitud.PAGADO,
        ),
        solicitud(5, EstadoSolicitudRetiro.REQUIERE_MODIFICACION),
      ],
    });

    const estado = await service.estado(usuario());

    expect(estado.solicitudesQueSeCancelan).toEqual([1, 2, 5]);
    expect(estado.solicitudesQueBloquean).toEqual([3, 4]);
    expect(estado.puedeDarseDeBaja).toBe(false);
  });

  it('un intercambio reservado bloquea la baja', async () => {
    const { service } = montar({ reservados: [{ id: 7 }] });

    const estado = await service.estado(usuario());

    expect(estado.articulosQueBloquean).toEqual([7]);
    expect(estado.puedeDarseDeBaja).toBe(false);
  });
});

describe('BajaService.darseDeBaja', () => {
  it('desactiva con fecha, borra contacto y push, revoca sesiones y audita', async () => {
    const { service, em, auditoria } = montar();

    const baja = await service.darseDeBaja(usuario(), { ip: '10.0.0.1' });

    expect(em.update).toHaveBeenCalledWith(
      UsuarioCiudadano,
      { id: VECINO },
      { activo: false, fechaBaja: AHORA },
    );
    expect(em.delete).toHaveBeenCalledWith(ContactoCiudadano, {
      usuarioCiudadanoId: VECINO,
    });
    expect(em.delete).toHaveBeenCalledWith(SuscripcionPush, {
      usuarioCiudadanoId: VECINO,
    });
    expect(em.update).toHaveBeenCalledWith(
      SesionCiudadano,
      { usuarioCiudadanoId: VECINO, activa: true },
      { activa: false },
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'usuarios_ciudadanos',
        datosNuevos: { activo: false, motivo: 'baja_voluntaria' },
      }),
    );
    expect(baja.puedeVolverDesde).toBe(
      new Date(AHORA.getTime() + ESPERA_VUELTA_MS).toISOString(),
    );
  });

  it('cancela las solicitudes abiertas sin pagar y borra su dirección (decisión 016)', async () => {
    const abierta = solicitud(1, EstadoSolicitudRetiro.EN_REVISION);
    const { service, em, auditoria } = montar({ abiertas: [abierta] });

    const baja = await service.darseDeBaja(usuario());

    expect(baja.solicitudesCanceladas).toEqual([1]);
    expect(abierta.estado).toBe(EstadoSolicitudRetiro.CANCELADA);
    expect(abierta.direccionRetiro).toBeNull();
    expect(abierta.direccionAnonimizada).toBeNull();
    expect(abierta.razonRechazo).toBe('Cancelada al darse de baja');
    expect(em.save).toHaveBeenCalledWith(SolicitudRetiro, [abierta]);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        entidad: 'solicitudes_retiro',
        entidadId: 1,
        datosNuevos: {
          estado: EstadoSolicitudRetiro.CANCELADA,
          motivo: 'baja',
        },
      }),
    );
  });

  it('con una solicitud pagada responde 409 y no toca nada', async () => {
    const { service, em, auditoria } = montar({
      abiertas: [
        solicitud(
          3,
          EstadoSolicitudRetiro.APROBADA,
          EstadoPagoSolicitud.PAGADO,
        ),
      ],
    });

    await expect(service.darseDeBaja(usuario())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(em.update).not.toHaveBeenCalled();
    expect(em.delete).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('con un intercambio reservado responde 409', async () => {
    const { service, em } = montar({ reservados: [{ id: 7 }] });

    await expect(service.darseDeBaja(usuario())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(em.update).not.toHaveBeenCalled();
  });

  it('un funcionario no se da de baja desde la app', async () => {
    const { service, em } = montar();

    await expect(service.darseDeBaja(usuario(true))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(em.update).not.toHaveBeenCalled();
  });

  it('la auditoría no lleva el contacto ni la dirección', async () => {
    const { service, auditoria } = montar({
      abiertas: [solicitud(1, EstadoSolicitudRetiro.EN_REVISION)],
    });

    await service.darseDeBaja(usuario());

    const texto = JSON.stringify(auditoria.registrar.mock.calls);
    expect(texto).not.toContain('Calle Falsa');
  });
});
