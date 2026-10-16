import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivosModule } from '../archivos/archivos.module';
import { ResiduosModule } from '../residuos/residuos.module';
import {
  AuditoriaModule,
  AuthModule,
  FotoRetiro,
  RevisionSolicitud,
  SolicitudRetiro,
  UsuarioCiudadano,
} from '../core';
import { MailModule } from '../mail/mail.module';
import { SolicitudesRetiroController } from './solicitudes-retiro.controller';
import { SolicitudesRetiroService } from './solicitudes-retiro.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolicitudRetiro,
      UsuarioCiudadano,
      RevisionSolicitud,
      FotoRetiro,
    ]),
    ResiduosModule,
    AuthModule,
    AuditoriaModule,
    ArchivosModule,
    MailModule,
  ],
  controllers: [SolicitudesRetiroController],
  providers: [SolicitudesRetiroService],
})
export class SolicitudesRetiroModule {}
