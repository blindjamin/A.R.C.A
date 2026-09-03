import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResiduosModule } from '../residuos/residuos.module';
import {
  AuditoriaModule,
  AuthModule,
  SolicitudRetiro,
  UsuarioAdministrador,
  UsuarioCiudadano,
} from '@arca/core';
import { SolicitudesRetiroController } from './solicitudes-retiro.controller';
import { SolicitudesRetiroService } from './solicitudes-retiro.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolicitudRetiro,
      UsuarioCiudadano,
      UsuarioAdministrador,
    ]),
    ResiduosModule,
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [SolicitudesRetiroController],
  providers: [SolicitudesRetiroService],
})
export class SolicitudesRetiroModule {}
