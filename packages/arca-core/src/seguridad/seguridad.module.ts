import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LIMITE_GENERAL, MENSAJE_LIMITE, VENTANA_MS } from './limites';

// Rate limiting de ambas APIs. Cada app lo importa en su AppModule ANTES que
// AuthModule: los guards globales corren en el orden en que se registran, y
// el límite debe cortar el tráfico abusivo antes de que llegue a resolver la
// sesión contra la base de datos.
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: VENTANA_MS, limit: LIMITE_GENERAL }],
      errorMessage: MENSAJE_LIMITE,
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class SeguridadModule {}
