import { Module } from '@nestjs/common';
import { AuditoriaModule, AuthModule } from '../core';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import {
  BloqueosAdminController,
  MiBloqueoController,
} from './bloqueos.controller';
import { BloqueosService } from './bloqueos.service';
import { NoBloqueadoGuard } from './no-bloqueado.guard';

@Module({
  imports: [AuthModule, AuditoriaModule, NotificacionesModule],
  controllers: [BloqueosAdminController, MiBloqueoController],
  providers: [BloqueosService, NoBloqueadoGuard],
  exports: [BloqueosService, NoBloqueadoGuard],
})
export class BloqueosModule {}
