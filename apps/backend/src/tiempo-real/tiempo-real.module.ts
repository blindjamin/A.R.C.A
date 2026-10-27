import { Module } from '@nestjs/common';
import { AuthModule } from '../core';
import { TiempoRealGateway } from './tiempo-real.gateway';

/** Socket.io compartido por el chat y los avisos: ninguno depende del otro. */
@Module({
  imports: [AuthModule],
  providers: [TiempoRealGateway],
  exports: [TiempoRealGateway],
})
export class TiempoRealModule {}
