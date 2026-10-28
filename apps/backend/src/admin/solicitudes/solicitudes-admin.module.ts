import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ArticuloMarketplace,
  AuditoriaModule,
  AuthModule,
  NotaSolicitud,
  ResiduoCatalogo,
  RevisionSolicitud,
  SolicitudRetiro,
  UsuarioAdministrador,
} from '../../core';
import { MailModule } from '../../mail/mail.module';
import { NotificacionesModule } from '../../notificaciones/notificaciones.module';
import { RevisionAdminController } from './revision-admin.controller';
import { RevisionAdminService } from './revision-admin.service';
import { SolicitudesAdminController } from './solicitudes-admin.controller';
import { SolicitudesAdminService } from './solicitudes-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolicitudRetiro,
      UsuarioAdministrador,
      ResiduoCatalogo,
      RevisionSolicitud,
      NotaSolicitud,
      ArticuloMarketplace,
    ]),
    AuthModule,
    AuditoriaModule,
    MailModule,
    NotificacionesModule,
  ],
  controllers: [SolicitudesAdminController, RevisionAdminController],
  providers: [SolicitudesAdminService, RevisionAdminService],
})
export class SolicitudesAdminModule {}
