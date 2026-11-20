import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditoriaModule,
  AuthModule,
  LoteDerivacion,
  SolicitudRetiro,
} from '../../core';
import { NotificacionesModule } from '../../notificaciones/notificaciones.module';
import { DerivacionesAdminController } from './derivaciones-admin.controller';
import { DerivacionesAdminService } from './derivaciones-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudRetiro, LoteDerivacion]),
    AuthModule,
    AuditoriaModule,
    NotificacionesModule,
  ],
  controllers: [DerivacionesAdminController],
  providers: [DerivacionesAdminService],
})
export class DerivacionesAdminModule {}
