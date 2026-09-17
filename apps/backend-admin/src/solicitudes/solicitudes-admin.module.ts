import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule, AuthModule, SolicitudRetiro } from '@arca/core';
import { SolicitudesAdminController } from './solicitudes-admin.controller';
import { SolicitudesAdminService } from './solicitudes-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudRetiro]),
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [SolicitudesAdminController],
  providers: [SolicitudesAdminService],
})
export class SolicitudesAdminModule {}
