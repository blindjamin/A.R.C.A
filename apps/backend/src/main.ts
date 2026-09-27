import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configurarProxyConfiable, verificarLoginDev } from './core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Antes que nada: un ALLOW_DEV_LOGIN=true copiado de un .env de desarrollo
  // no debe pasar inadvertido en producción (SPEC-sesion-unica §2.5).
  verificarLoginDev(process.env);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // IP real del cliente tras el proxy de cPanel, para el rate limiting.
  configurarProxyConfiable(app);
  const allowedOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({
    origin: allowedOrigins,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Un campo desconocido responde 400 en vez de ignorarse en silencio: un
      // cliente que todavía mande `operadorAsignadoId` se entera de que ya no
      // existe, en lugar de recibir 200 sin que se haya guardado nada.
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
