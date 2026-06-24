import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResiduosModule } from '../residuos/residuos.module';
import { UsuarioAdministrador } from '../users/entities/usuario-administrador.entity';
import { UsuarioCiudadano } from '../users/entities/usuario-ciudadano.entity';
import { SolicitudRetiro } from './entities/solicitud-retiro.entity';
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
  ],
  controllers: [SolicitudesRetiroController],
  providers: [SolicitudesRetiroService],
})
export class SolicitudesRetiroModule {}
