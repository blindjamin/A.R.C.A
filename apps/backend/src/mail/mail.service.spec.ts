import { MailService } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SesionCiudadano } from '../core/entities/sesion-ciudadano.entity';

describe('MailService', () => {
  let service: MailService;
  let configService: Partial<ConfigService>;
  let sesionRepo: Partial<Repository<SesionCiudadano>>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MAIL_USER') return 'soporte.arcaa@gmail.com';
        return undefined;
      }),
    };

    sesionRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      }),
    };

    service = new MailService(
      configService as ConfigService,
      sesionRepo as Repository<SesionCiudadano>,
    );
  });

  it('debe generar y verificar un código OTP exitosamente', async () => {
    const resEnvio = await service.enviarCodigo(
      'vecino@santodomingo.cl',
      '00000000-0000-4000-8000-000000000001',
    );
    expect(resEnvio.ok).toBe(true);
    expect(resEnvio.codigoDev).toBeDefined();

    const codigo = resEnvio.codigoDev!;

    // Código inválido
    const resInvalido = await service.verificarCodigo(
      'vecino@santodomingo.cl',
      '000000',
    );
    expect(resInvalido.verificado).toBe(false);

    // Código válido
    const resValido = await service.verificarCodigo(
      'vecino@santodomingo.cl',
      codigo,
      '00000000-0000-4000-8000-000000000001',
    );
    expect(resValido.verificado).toBe(true);
  });

  it('debe registrar y obtener el correo de un ciudadano', async () => {
    await service.registrarCorreoCiudadano(
      '00000000-0000-4000-8000-000000000001',
      'vecino@santodomingo.cl',
    );

    const correo = await service.obtenerCorreoCiudadano(
      '00000000-0000-4000-8000-000000000001',
    );
    expect(correo).toBe('vecino@santodomingo.cl');
  });

  it('debe ejecutar notificarCambioEstado sin lanzar errores en modo simulación', async () => {
    const ok = await service.notificarCambioEstado(
      'vecino@santodomingo.cl',
      {
        id: 12,
        residuoNombre: 'Refrigerador',
        categoria: 'Línea Blanca',
        direccion: 'Calle Las Torcazas 420',
      },
      'aprobada',
      'Todo en orden para retiro',
    );
    expect(ok).toBe(true);
  });
});
