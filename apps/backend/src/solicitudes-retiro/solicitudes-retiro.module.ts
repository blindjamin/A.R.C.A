import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResiduosModule } from '../residuos/residuos.module';
import {
  AuditoriaModule,
  AuthModule,
  RevisionSolicitud,
  SolicitudRetiro,
  UsuarioCiudadano,
} from '../core';
import { SolicitudesRetiroController } from './solicitudes-retiro.controller';
import { SolicitudesRetiroService } from './solicitudes-retiro.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolicitudRetiro,
      UsuarioCiudadano,
      RevisionSolicitud,
    ]),
    ResiduosModule,
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [SolicitudesRetiroController],
  providers: [SolicitudesRetiroService],
})
export class SolicitudesRetiroModule {}
