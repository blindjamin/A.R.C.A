import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PERFIL_ACCESO_RESOLVER } from './interfaces/perfil-acceso-resolver.interface';
import { RolAdministrador } from '../entities/rol-administrador.enum';

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
        { provide: PERFIL_ACCESO_RESOLVER, useValue: usersServiceMock },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  it('ya no resuelve identidad desde el header Authorization (SU-4)', () => {
    expect('resolveFromAuthorizationHeader' in authService).toBe(false);
  });

  it('resuelve el AuthUser de un ciudadano con ficha de funcionario', async () => {
    const ciudadanoId = '00000000-0000-4000-8000-000000000002';

    usersServiceMock.getPerfilAcceso.mockResolvedValue({
      usuarioCiudadanoId: ciudadanoId,
      esAdministrador: true,
      administrador: {
        id: '00000000-0000-4000-8000-0000000000A2',
        nombre: 'Camila',
        apellido: 'Operadora',
        rol: RolAdministrador.FUNCIONARIO,
      },
    });

    const user = await authService.resolveCiudadanoId(ciudadanoId);

    expect(user).toEqual({
      ciudadanoId,
      esAdministrador: true,
      administradorId: '00000000-0000-4000-8000-0000000000A2',
      rol: RolAdministrador.FUNCIONARIO,
    });
  });

  describe('resolverNombreAdministrador', () => {
    it('devuelve el nombre de usuarios_administradores si tiene ficha', async () => {
      usersServiceMock.getPerfilAcceso.mockResolvedValue({
        usuarioCiudadanoId: '00000000-0000-4000-8000-000000000002',
        esAdministrador: true,
        administrador: {
          id: '00000000-0000-4000-8000-0000000000A2',
          nombre: 'Camila',
          apellido: 'Operadora',
          rol: RolAdministrador.FUNCIONARIO,
        },
      });

      await expect(
        authService.resolverNombreAdministrador(
          '00000000-0000-4000-8000-000000000002',
        ),
      ).resolves.toBe('Camila');
    });

    it('devuelve null si el ciudadano no tiene ficha de administrador', async () => {
      usersServiceMock.getPerfilAcceso.mockResolvedValue({
        usuarioCiudadanoId: '00000000-0000-4000-8000-000000000001',
        esAdministrador: false,
        administrador: null,
      });

      await expect(
        authService.resolverNombreAdministrador(
          '00000000-0000-4000-8000-000000000001',
        ),
      ).resolves.toBeNull();
    });
  });
});
