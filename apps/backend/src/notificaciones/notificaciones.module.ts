import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule, Notificacion } from '../core';
import { PushModule } from '../push/push.module';
import { TiempoRealModule } from '../tiempo-real/tiempo-real.module';
import { ConservacionAvisosService } from './conservacion-avisos.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacion]),
    TiempoRealModule,
    PushModule,
    AuditoriaModule,
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, ConservacionAvisosService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
