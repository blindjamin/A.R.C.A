import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EnviarMensajeDto } from './enviar-mensaje.dto';

const probar = (contenido: unknown) =>
  plainToInstance(EnviarMensajeDto, { contenido });

describe('EnviarMensajeDto', () => {
  it('rechaza un mensaje en blanco', async () => {
    expect(await validate(probar('   '))).not.toHaveLength(0);
  });

  it('rechaza más de 1000 caracteres', async () => {
    expect(await validate(probar('a'.repeat(1001)))).not.toHaveLength(0);
  });

  it('recorta los espacios de los extremos', async () => {
    const dto = probar('  hola  ');
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.contenido).toBe('hola');
  });
});
