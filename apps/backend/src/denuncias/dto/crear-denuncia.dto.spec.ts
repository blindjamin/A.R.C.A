import { ValidationPipe } from '@nestjs/common';
import { MotivoDenuncia, OrigenDenuncia } from '../../core';
import { CrearDenunciaDto } from './crear-denuncia.dto';

// Misma configuración que `main.ts`: un campo desconocido responde 400.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const probar = (extra: Record<string, unknown>) =>
  pipe.transform(
    {
      articuloId: 10,
      origen: OrigenDenuncia.ARTICULO,
      motivo: MotivoDenuncia.OTRO,
      ...extra,
    },
    { type: 'body', metatype: CrearDenunciaDto },
  ) as Promise<CrearDenunciaDto>;

describe('CrearDenunciaDto', () => {
  it('acepta una denuncia válida y recorta la descripción', async () => {
    const dto = await probar({ descripcion: '  no llegó  ' });
    expect(dto.descripcion).toBe('no llegó');
  });

  it('rechaza un motivo fuera de la lista', async () => {
    await expect(probar({ motivo: 'me_cae_mal' })).rejects.toThrow();
  });

  it('rechaza una descripción de más de 500 caracteres', async () => {
    await expect(probar({ descripcion: 'a'.repeat(501) })).rejects.toThrow();
  });

  it('rechaza que el cliente mande el id del denunciado', async () => {
    await expect(
      probar({ usuarioDenunciadoId: '00000000-0000-4000-8000-000000000003' }),
    ).rejects.toThrow();
  });

  it('rechaza más de 5 mensajes adjuntos', async () => {
    await expect(probar({ mensajes: [1, 2, 3, 4, 5, 6] })).rejects.toThrow();
  });
});
