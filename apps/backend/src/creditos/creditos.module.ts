import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransaccionCircularCredits } from '../core';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { CreditosController } from './creditos.controller';
import { CreditosService } from './creditos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransaccionCircularCredits]),
    NotificacionesModule,
  ],
  controllers: [CreditosController],
  providers: [CreditosService],
  exports: [CreditosService],
})
export class CreditosModule {}
