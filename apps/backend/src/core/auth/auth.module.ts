import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { ClaveUnicaController } from './clave-unica.controller';
import { ClaveUnicaService } from './clave-unica.service';
import { AuthGuard, RolesGuard } from './guards/auth.guard';
import { SesionController } from './sesion.controller';
import { SesionService } from './sesion.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { SesionCiudadano } from '../entities/sesion-ciudadano.entity';
import { UsuarioCiudadano } from '../entities/usuario-ciudadano.entity';

// AuthService depende de PERFIL_ACCESO_RESOLVER (ver
// interfaces/perfil-acceso-resolver.interface.ts), no de un servicio concreto:
// AuthModule vive en src/core y no puede importar el UsersModule de una app
// específica. Quien importe AuthModule (hoy, apps/backend) debe proveer ese
// token en algún módulo global de su propio árbol — ver users.module.ts.
@Module({
  imports: [
    TypeOrmModule.forFeature([SesionCiudadano, UsuarioCiudadano]),
    AuditoriaModule,
  ],
  controllers: [ClaveUnicaController, SesionController],
  providers: [
    ClaveUnicaService,
    AuthService,
    SesionService,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [ClaveUnicaService, AuthService, SesionService, RolesGuard],
})
export class AuthModule {}
