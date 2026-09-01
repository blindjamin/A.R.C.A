import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { ClaveUnicaController } from './clave-unica.controller';
import { ClaveUnicaService } from './clave-unica.service';
import { AuthGuard, RolesGuard } from './guards/auth.guard';

// AuthService depende de PERFIL_ACCESO_RESOLVER (ver
// interfaces/perfil-acceso-resolver.interface.ts), no de un servicio concreto:
// AuthModule vive en @arca/core y no puede importar el UsersModule de una app
// específica. Quien importe AuthModule (hoy, apps/backend) debe proveer ese
// token en algún módulo global de su propio árbol — ver users.module.ts.
@Module({
  controllers: [ClaveUnicaController],
  providers: [
    ClaveUnicaService,
    AuthService,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [ClaveUnicaService, AuthService, RolesGuard],
})
export class AuthModule {}
