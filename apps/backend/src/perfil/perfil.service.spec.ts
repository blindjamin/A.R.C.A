import type { AuthUser, SesionService } from '../core';
import type { MailService } from '../mail/mail.service';
import { PerfilService } from './perfil.service';

const VECINO: AuthUser = {
  ciudadanoId: '00000000-0000-4000-8000-000000000001',
  esAdministrador: false,
  administradorId: null,
  rol: null,
};

describe('PerfilService', () => {
  const sesionService = {
    contactoSesionActiva: jest.fn(),
    actualizarContactoSesion: jest.fn(() => Promise.resolve()),
  };

  const mailService = {
    obtenerCorreoCiudadano: jest.fn(),
  };

  const service = new PerfilService(
    sesionService as unknown as SesionService,
    mailService as unknown as MailService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    sesionService.contactoSesionActiva.mockResolvedValue({
      nombre: 'Ana',
      email: 'ana@ejemplo.cl',
      telefono: null,
      direccion: null,
    });
    mailService.obtenerCorreoCiudadano.mockResolvedValue('ana@ejemplo.cl');
  });

  it('GET combina sesión y correo del MailService', async () => {
    const perfil = await service.obtener(VECINO);

    expect(perfil).toEqual({
      nombre: 'Ana',
      email: 'ana@ejemplo.cl',
      telefono: null,
      direccion: null,
    });
  });

  it('PATCH actualiza teléfono y dirección y no toca el nombre', async () => {
    sesionService.contactoSesionActiva.mockResolvedValue({
      nombre: 'Ana',
      email: 'ana@ejemplo.cl',
      telefono: '+56911111111',
      direccion: 'Calle 1',
    });

    const perfil = await service.actualizar(VECINO, {
      telefono: ' +56911111111 ',
      direccion: ' Calle 1 ',
    });

    expect(sesionService.actualizarContactoSesion).toHaveBeenCalledWith(
      VECINO.ciudadanoId,
      { telefono: '+56911111111', direccion: 'Calle 1' },
    );
    expect(perfil.nombre).toBe('Ana');
    expect(perfil.telefono).toBe('+56911111111');
    expect(perfil.direccion).toBe('Calle 1');
  });
});
