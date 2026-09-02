import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResiduosModule } from '../residuos/residuos.module';
import {
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
  ],
  controllers: [SolicitudesRetiroController],
  providers: [SolicitudesRetiroService],
})
export class SolicitudesRetiroModule {}
