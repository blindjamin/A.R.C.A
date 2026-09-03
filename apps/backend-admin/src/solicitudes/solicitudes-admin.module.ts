import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditoriaModule,
  AuthModule,
  SolicitudRetiro,
  UsuarioAdministrador,
} from '@arca/core';
import { SolicitudesAdminController } from './solicitudes-admin.controller';
import { SolicitudesAdminService } from './solicitudes-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudRetiro, UsuarioAdministrador]),
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [SolicitudesAdminController],
  providers: [SolicitudesAdminService],
})
export class SolicitudesAdminModule {}
