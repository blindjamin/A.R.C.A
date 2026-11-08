import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { generarHtmlCambioEstado } from './mail-templates';
import { MailService, TOPE_CODIGOS_POR_HORA } from './mail.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ContactoCiudadano } from '../core/entities/contacto-ciudadano.entity';

describe('MailService', () => {
  let service: MailService;
  let configService: Partial<ConfigService>;
  let contactos: Repository<ContactoCiudadano>;
  const correos = new Map<string, string>();

  const repoContactos = (): Repository<ContactoCiudadano> =>
    ({
      findOne: jest.fn((opts: { where: { usuarioCiudadanoId: string } }) => {
        const id = opts.where.usuarioCiudadanoId;
        const email = correos.get(id);
        return Promise.resolve(
          email
            ? {
                usuarioCiudadanoId: id,
                email,
                telefono: null,
                direccion: null,
              }
            : null,
        );
      }),
      create: jest.fn((fila: Partial<ContactoCiudadano>) => fila),
      save: jest.fn((fila: ContactoCiudadano) => {
        if (fila.email) correos.set(fila.usuarioCiudadanoId, fila.email);
        else correos.delete(fila.usuarioCiudadanoId);
        return Promise.resolve(fila);
      }),
    }) as unknown as Repository<ContactoCiudadano>;

  beforeEach(() => {
    correos.clear();
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MAIL_USER') return 'soporte.arcaa@gmail.com';
        return undefined;
      }),
    };
    contactos = repoContactos();

    service = new MailService(configService as ConfigService, contactos);
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
      '00000000-0000-4000-8000-000000000001',
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

  it('solo guarda el correo del ciudadano tras verificarlo', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const { codigoDev } = await service.enviarCodigo(
      'vecino@santodomingo.cl',
      id,
    );
    expect(await service.obtenerCorreoCiudadano(id)).toBeNull();

    await service.verificarCodigo('vecino@santodomingo.cl', codigoDev!, id);
    expect(await service.obtenerCorreoCiudadano(id)).toBe(
      'vecino@santodomingo.cl',
    );
  });

  it('el código de una cuenta no sirve para otra', async () => {
    const { codigoDev } = await service.enviarCodigo('a@b.cl', 'cuenta-a');

    const res = await service.verificarCodigo('a@b.cl', codigoDev!, 'cuenta-b');
    expect(res.verificado).toBe(false);
    expect(await service.obtenerCorreoCiudadano('cuenta-b')).toBeNull();
  });

  it('pone un tope de códigos por cuenta y hora', async () => {
    for (let i = 0; i < TOPE_CODIGOS_POR_HORA; i++) {
      await service.enviarCodigo(`v${i}@b.cl`, 'cuenta-a');
    }
    await expect(
      service.enviarCodigo('otro@b.cl', 'cuenta-a'),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      service.enviarCodigo('otro@b.cl', 'cuenta-b'),
    ).resolves.toMatchObject({ ok: true });
  });

  describe('en producción', () => {
    const montarProduccion = (pass?: string) => {
      const config = {
        get: jest.fn((k: string) =>
          k === 'NODE_ENV'
            ? 'production'
            : k === 'MAIL_PASS'
              ? pass
              : undefined,
        ),
      };
      return new MailService(config as unknown as ConfigService, contactos);
    };

    it('sin credenciales responde 503 y no entrega el código', async () => {
      await expect(
        montarProduccion().enviarCodigo('a@b.cl', 'cuenta-a'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('si falla el envío responde 503 y no entrega el código', async () => {
      const prod = montarProduccion('clave');
      const interno = prod as unknown as {
        transporter: { sendMail: jest.Mock };
      };
      interno.transporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('smtp caído')),
      };

      await expect(
        prod.enviarCodigo('a@b.cl', 'cuenta-a'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('si se envía no devuelve el código', async () => {
      const prod = montarProduccion('clave');
      const interno = prod as unknown as {
        transporter: { sendMail: jest.Mock };
      };
      interno.transporter = { sendMail: jest.fn().mockResolvedValue({}) };

      const res = await prod.enviarCodigo('a@b.cl', 'cuenta-a');
      expect(res).toEqual({ ok: true, mensaje: 'Código enviado a tu correo' });
    });
  });

  it('el correo muestra como texto lo que escribieron vecinos y funcionarios', () => {
    const html = generarHtmlCambioEstado(
      {
        id: 1,
        residuoNombre: '<a href="https://malo.test">Pincha aquí</a>',
        direccion: '<img src=x>',
      },
      'aprobada',
      '<script>alert(1)</script>',
    );
    expect(html).not.toContain('<a href="https://malo.test"');
    expect(html).not.toContain('<img src=x>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
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
