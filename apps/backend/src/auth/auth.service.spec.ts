import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RolAdministrador } from '../users/entities/rol-administrador.enum';

describe('AuthService', () => {
  let authService: AuthService;

  const usersServiceMock = {
    getPerfilAcceso: jest.fn(),
  };

  beforeEach(async () => {
    usersServiceMock.getPerfilAcceso.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    authService = module.get(AuthService);
    process.env.NODE_ENV = 'development';
  });

  it('rechaza peticiones sin header Authorization', async () => {
    await expect(
      authService.resolveFromAuthorizationHeader(undefined),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('resuelve AuthUser desde Bearer UUID en desarrollo', async () => {
    const ciudadanoId = '00000000-0000-4000-8000-000000000002';

    usersServiceMock.getPerfilAcceso.mockResolvedValue({
      usuarioCiudadanoId: ciudadanoId,
      esAdministrador: true,
      administrador: {
        id: '00000000-0000-4000-8000-0000000000A2',
        nombre: 'Camila',
        apellido: 'Operadora',
        rol: RolAdministrador.OPERADOR,
      },
    });

    const user = await authService.resolveFromAuthorizationHeader(
      `Bearer ${ciudadanoId}`,
    );

    expect(user.ciudadanoId).toBe(ciudadanoId);
    expect(user.rol).toBe(RolAdministrador.OPERADOR);
    expect(user.esAdministrador).toBe(true);
  });

  it('rechaza Bearer que no sea UUID en desarrollo', async () => {
    await expect(
      authService.resolveFromAuthorizationHeader('Bearer token-jwt-falso'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
