import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  cabecerasDeSeguridad,
  configurarProxyConfiable,
  origenesPermitidos,
  verificarLoginDev,
  verificarOrigen,
} from './core';
import { AppModule } from './app.module';
import { verificarWebpayEnv } from './pagos/verificar-webpay-env';

async function bootstrap() {
  // Antes que nada: un ALLOW_DEV_LOGIN=true copiado de un .env de desarrollo
  // no debe pasar inadvertido en producción (SPEC-sesion-unica §2.5).
  verificarLoginDev(process.env);
  // En producción WEBPAY_ENV tiene que estar declarado: sin eso se cobraría
  // con las credenciales públicas de prueba.
  verificarWebpayEnv(process.env);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // IP real del cliente tras el proxy de cPanel, para el rate limiting.
  configurarProxyConfiable(app);
  const allowedOrigins = origenesPermitidos();
  app.enableCors({
    origin: allowedOrigins,
  });
  // Antes de las rutas: cabeceras en toda respuesta y CSRF por Origin.
  // Nest ya registra urlencoded para formularios (vuelta POST de Webpay).
  app.use(cabecerasDeSeguridad());
  app.use(verificarOrigen(allowedOrigins));
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
