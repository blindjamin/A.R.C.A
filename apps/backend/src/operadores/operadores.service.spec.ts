import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolAdministrador, UsuarioAdministrador } from '@arca/core';
import { OperadoresService } from './operadores.service';

describe('OperadoresService', () => {
  let service: OperadoresService;
  const find = jest.fn();

  beforeEach(async () => {
    find.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperadoresService,
        {
          provide: getRepositoryToken(UsuarioAdministrador),
          useValue: { find },
        },
      ],
    }).compile();

    service = module.get(OperadoresService);
  });

  it('lista solo activos y arma el nombre completo', async () => {
    find.mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-0000000000A4',
        nombre: 'Carlos',
        apellido: 'Rojas',
        rol: RolAdministrador.OPERADOR,
        cargo: 'Demo',
        activo: true,
      },
      {
        id: '00000000-0000-4000-8000-0000000000A5',
        nombre: 'María',
        apellido: 'Silva',
        rol: RolAdministrador.OPERADOR,
        cargo: null,
        activo: true,
      },
    ]);

    const resultado = await service.findActivos();

    expect(find).toHaveBeenCalledWith({
      where: { activo: true },
      order: { nombre: 'ASC', apellido: 'ASC' },
    });
    expect(resultado).toEqual([
      {
        id: '00000000-0000-4000-8000-0000000000A4',
        nombre: 'Carlos Rojas',
        rol: RolAdministrador.OPERADOR,
        cargo: 'Demo',
      },
      {
        id: '00000000-0000-4000-8000-0000000000A5',
        nombre: 'María Silva',
        rol: RolAdministrador.OPERADOR,
        cargo: null,
      },
    ]);
  });

  it('devuelve lista vacía si no hay administradores activos', async () => {
    find.mockResolvedValue([]);
    await expect(service.findActivos()).resolves.toEqual([]);
  });
});
