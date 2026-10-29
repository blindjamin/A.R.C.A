import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

describe('PagosController retorno', () => {
  let app: INestApplication;
  const procesarRetorno = jest.fn();

  beforeEach(async () => {
    procesarRetorno.mockReset();
    procesarRetorno.mockResolvedValue(
      'http://localhost:5173/pago/7?resultado=aprobado',
    );

    const modulo = await Test.createTestingModule({
      controllers: [PagosController],
      providers: [{ provide: PagosService, useValue: { procesarRetorno } }],
    }).compile();

    app = modulo.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/pagos/retorno llega al handler', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/api/pagos/retorno')
      .query({ token_ws: 'token-1' })
      .expect(302)
      .expect('Location', 'http://localhost:5173/pago/7?resultado=aprobado');

    expect(procesarRetorno).toHaveBeenCalledWith(
      expect.objectContaining({ token_ws: 'token-1' }),
    );
  });

  it('POST /api/pagos/retorno llega al handler', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/pagos/retorno')
      .type('form')
      .send({ token_ws: 'token-1' })
      .expect(302)
      .expect('Location', 'http://localhost:5173/pago/7?resultado=aprobado');

    expect(procesarRetorno).toHaveBeenCalledWith(
      expect.objectContaining({ token_ws: 'token-1' }),
    );
  });
});
