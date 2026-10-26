import type { Repository } from 'typeorm';
import {
  AccionAuditoria,
  type AuditoriaService,
  type AuthUser,
  type ContactoCiudadano,
  type SesionService,
  TipoActorAuditoria,
} from '../core';
import type { MailService } from '../mail/mail.service';
import { PerfilService } from './perfil.service';

const VECINO: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000001',
  esAdministrador: false,
  administradorId: null,
  rol: null,
};

type Contacto = Pick<
  ContactoCiudadano,
  'usuarioCiudadanoId' | 'telefono' | 'direccion'
>;

describe('PerfilService', () => {
  let guardado: Contacto | null;

  const contactos = {
    findOne: jest.fn(() => Promise.resolve(guardado ? { ...guardado } : null)),
    create: jest.fn((c: Contacto) => ({ ...c })),
    save: jest.fn((c: Contacto) => {
      guardado = { ...c };
      return Promise.resolve(c);
    }),
    delete: jest.fn(() => {
      guardado = null;
      return Promise.resolve();
    }),
  };
  const sesionService = {
    nombreSesionActiva: jest.fn(() => Promise.resolve('Ana')),
  };
  const mailService = {
    obtenerCorreoCiudadano: jest.fn(() => Promise.resolve('ana@ejemplo.cl')),
    notificarPerfilActualizado: jest.fn(() => Promise.resolve(true)),
  };
  const auditoriaService = {
    registrar: jest.fn(() => Promise.resolve()),
  };

  const service = new PerfilService(
    contactos as unknown as Repository<ContactoCiudadano>,
    sesionService as unknown as SesionService,
    mailService as unknown as MailService,
    auditoriaService as unknown as AuditoriaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    guardado = null;
  });

  it('GET sin contacto guardado devuelve teléfono y dirección vacíos', async () => {
    await expect(service.obtener(VECINO)).resolves.toEqual({
      nombre: 'Ana',
      email: 'ana@ejemplo.cl',
      telefono: null,
      direccion: null,
    });
  });

  it('PATCH crea el contacto y audita qué campos cambiaron, sin los valores', async () => {
    const perfil = await service.actualizar(
      VECINO,
      { telefono: ' +56911111111 ', direccion: ' Calle 1 ' },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(guardado).toEqual({
      usuarioCiudadanoId: VECINO.ciudadanoId,
      telefono: '+56911111111',
      direccion: 'Calle 1',
    });
    expect(auditoriaService.registrar).toHaveBeenCalledWith({
      tipoActor: TipoActorAuditoria.CIUDADANO,
      actor: VECINO,
      entidad: 'contacto_ciudadano',
      accion: AccionAuditoria.UPDATE,
      datosNuevos: { camposCambiados: ['telefono', 'direccion'] },
      origen: { ip: '127.0.0.1', userAgent: 'jest' },
    });
    expect(JSON.stringify(auditoriaService.registrar.mock.calls)).not.toContain(
      '56911111111',
    );
    expect(mailService.notificarPerfilActualizado).toHaveBeenCalledWith(
      'ana@ejemplo.cl',
      ['telefono', 'direccion'],
    );
    expect(
      JSON.stringify(mailService.notificarPerfilActualizado.mock.calls),
    ).not.toContain('56911111111');
    expect(perfil).toMatchObject({
      nombre: 'Ana',
      telefono: '+56911111111',
      direccion: 'Calle 1',
    });
  });

  it('si el vecino borra todo, no queda una fila vacía', async () => {
    guardado = {
      usuarioCiudadanoId: VECINO.ciudadanoId,
      telefono: '+56911111111',
      direccion: null,
    };

    await service.actualizar(VECINO, { telefono: '   ' });

    expect(contactos.delete).toHaveBeenCalledWith({
      usuarioCiudadanoId: VECINO.ciudadanoId,
    });
    expect(guardado).toBeNull();
  });

  it('si nada cambia, no guarda ni audita', async () => {
    guardado = {
      usuarioCiudadanoId: VECINO.ciudadanoId,
      telefono: '+56911111111',
      direccion: null,
    };

    await service.actualizar(VECINO, { telefono: '+56911111111' });

    expect(contactos.save).not.toHaveBeenCalled();
    expect(auditoriaService.registrar).not.toHaveBeenCalled();
    expect(mailService.notificarPerfilActualizado).not.toHaveBeenCalled();
  });

  it('si no hay correo verificado, el cambio igual queda guardado', async () => {
    mailService.obtenerCorreoCiudadano.mockResolvedValueOnce(null);

    await service.actualizar(VECINO, { telefono: '+56911111111' });

    expect(contactos.save).toHaveBeenCalled();
    expect(mailService.notificarPerfilActualizado).not.toHaveBeenCalled();
  });
});
