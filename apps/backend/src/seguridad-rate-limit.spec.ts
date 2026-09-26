import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  Module,
  UnauthorizedException,
} from '@nestjs/common';
import type { Server } from 'http';
import { APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  LIMITE_GENERAL,
  LIMITE_LOGIN,
  LimiteLogin,
  SeguridadModule,
  configurarProxyConfiable,
} from '@arca/core';

// Integración del rate limiting con la autenticación, armada igual que
// AppModule: SeguridadModule registrado ANTES que el guard de sesión.

/** Simula AuthGuard: rechaza todo salvo /abierta y /login. */
@Injectable()
class SesionFalsaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const url = context.switchToHttp().getRequest<{ url: string }>().url;
    if (url.startsWith('/abierta') || url.startsWith('/login')) return true;
    throw new UnauthorizedException();
  }
}

@Module({ providers: [{ provide: APP_GUARD, useClass: SesionFalsaGuard }] })
class SesionFalsaModule {}

@Controller()
class PruebaController {
  @Get('protegida')
  protegida() {
    return { ok: true };
  }

  @Get('abierta')
  abierta() {
    return { ok: true };
  }
}

@LimiteLogin()
@Controller('login')
class LoginPruebaController {
  @Get()
  login() {
    return { ok: true };
  }
}

describe('Rate limiting (SeguridadModule)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SeguridadModule, SesionFalsaModule],
      controllers: [PruebaController, LoginPruebaController],
    }).compile();

    const expressApp =
      moduleRef.createNestApplication<NestExpressApplication>();
    configurarProxyConfiable(expressApp);
    app = expressApp;
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const pedir = (ruta: string, ip = '203.0.113.10') =>
    request(app.getHttpServer() as Server)
      .get(ruta)
      .set('X-Forwarded-For', ip);

  it('corta con 429 antes que la autenticación (las peticiones sin sesión también cuentan)', async () => {
    for (let i = 0; i < LIMITE_GENERAL; i++) {
      await pedir('/protegida').expect(401);
    }
    await pedir('/protegida').expect(429);
  });

  it('el login con ClaveÚnica tiene un límite más estricto', async () => {
    for (let i = 0; i < LIMITE_LOGIN; i++) {
      await pedir('/login').expect(200);
    }
    const res = await pedir('/login').expect(429);
    expect((res.body as { message: string }).message).toContain(
      'Demasiadas solicitudes',
    );
  });

  it('cuenta por IP real tras el proxy local: otra IP tiene su propio cupo', async () => {
    for (let i = 0; i < LIMITE_LOGIN; i++) {
      await pedir('/login', '203.0.113.10').expect(200);
    }
    await pedir('/login', '203.0.113.10').expect(429);
    await pedir('/login', '198.51.100.7').expect(200);
  });
});
