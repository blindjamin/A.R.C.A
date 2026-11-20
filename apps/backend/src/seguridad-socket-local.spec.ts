import { Controller, Get, INestApplication, Req } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import http from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  LIMITE_LOGIN,
  LimiteLogin,
  Public,
  SeguridadModule,
  configurarProxyConfiable,
} from './core';

// Reproduce el despliegue en cPanel: Passenger conecta con la app por un
// socket local (unix en Linux, named pipe en Windows), sin dirección de
// origen. Sin el arreglo, req.ip queda vacío y el rate limiting mete a todos
// los vecinos en un solo contador.

@Public()
@Controller()
class IpController {
  @Get('ip')
  ip(@Req() req: Request) {
    return { ip: req.ip ?? null };
  }

  @LimiteLogin()
  @Get('login')
  login() {
    return { ok: true };
  }
}

// Un nombre por test: en Windows el pipe anterior tarda en liberarse al cerrar.
let siguienteSocket = 0;
const rutaSocket = () => {
  const nombre = `arca-test-${process.pid}-${siguienteSocket++}`;
  return process.platform === 'win32'
    ? '\\\\.\\pipe\\' + nombre
    : join(tmpdir(), `${nombre}.sock`);
};

function pedir(
  socketPath: string,
  ruta: string,
  ip: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(
        { socketPath, path: ruta, headers: { 'X-Forwarded-For': ip } },
        (res) => {
          let body = '';
          res.on('data', (d: Buffer) => (body += d.toString()));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
        },
      )
      .on('error', reject);
  });
}

describe('IP real con la app detrás de un socket local (Passenger)', () => {
  let app: INestApplication;
  let socket: string;

  const levantar = async (trustProxy: string | boolean) => {
    const moduleRef = await Test.createTestingModule({
      imports: [SeguridadModule],
      controllers: [IpController],
    }).compile();
    const expressApp =
      moduleRef.createNestApplication<NestExpressApplication>();
    configurarProxyConfiable(expressApp, trustProxy);
    app = expressApp;
    socket = rutaSocket();
    await app.listen(socket);
  };

  afterEach(async () => {
    await app.close();
  });

  it('toma la IP de X-Forwarded-For cuando la conexión llega por el socket', async () => {
    await levantar('loopback');
    const res = await pedir(socket, '/ip', '203.0.113.10');
    expect(JSON.parse(res.body)).toEqual({ ip: '203.0.113.10' });
  });

  it('cada vecino tiene su propio contador del límite', async () => {
    await levantar('loopback');
    for (let i = 0; i < LIMITE_LOGIN; i++) {
      expect((await pedir(socket, '/login', '203.0.113.10')).status).toBe(200);
    }
    expect((await pedir(socket, '/login', '203.0.113.10')).status).toBe(429);
    // Otro vecino no queda bloqueado por el primero.
    expect((await pedir(socket, '/login', '198.51.100.7')).status).toBe(200);
  });

  it('con TRUST_PROXY=false no confía ni en el socket local', async () => {
    await levantar(false);
    const res = await pedir(socket, '/ip', '203.0.113.10');
    expect(JSON.parse(res.body)).toEqual({ ip: null });
  });

  // Visitante → Cloudflare → Apache/Passenger → API. X-Forwarded-For llega
  // como "visitante, nodo de Cloudflare". Con los rangos de Cloudflare en
  // TRUST_PROXY se salta el nodo y queda la IP del visitante.
  it('detrás de Cloudflare, con sus rangos en TRUST_PROXY, ve al visitante', async () => {
    await levantar('loopback, 173.245.48.0/20, 104.16.0.0/13');
    const res = await pedir(socket, '/ip', '203.0.113.10, 104.16.5.9');
    expect(JSON.parse(res.body)).toEqual({ ip: '203.0.113.10' });
  });

  it('sin los rangos de Cloudflare, vería al nodo de Cloudflare', async () => {
    await levantar('loopback');
    const res = await pedir(socket, '/ip', '203.0.113.10, 104.16.5.9');
    expect(JSON.parse(res.body)).toEqual({ ip: '104.16.5.9' });
  });

  it('un visitante no puede inventar su IP anteponiendo una falsa', async () => {
    await levantar('loopback, 173.245.48.0/20, 104.16.0.0/13');
    // El visitante manda "X-Forwarded-For: 10.9.9.9"; Cloudflare agrega la
    // real y su nodo. Solo se saltan los proxies de confianza (de derecha a
    // izquierda), así que la falsa nunca se toma.
    const res = await pedir(
      socket,
      '/ip',
      '10.9.9.9, 203.0.113.10, 104.16.5.9',
    );
    expect(JSON.parse(res.body)).toEqual({ ip: '203.0.113.10' });
  });
});
