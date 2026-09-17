import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditoriaModule,
  AuthModule,
  NotaSolicitud,
  ResiduoCatalogo,
  RevisionSolicitud,
  SolicitudRetiro,
  UsuarioAdministrador,
} from '@arca/core';
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
    ]),
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [SolicitudesAdminController, RevisionAdminController],
  providers: [SolicitudesAdminService, RevisionAdminService],
})
export class SolicitudesAdminModule {}
