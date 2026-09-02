import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PERFIL_ACCESO_RESOLVER,
  UsuarioAdministrador,
  UsuarioCiudadano,
} from '@arca/core';
import { IdentityService } from './identity.service';

// @Global(): igual que UsersModule en apps/backend, para que AuthModule (de
// @arca/core) pueda inyectar PERFIL_ACCESO_RESOLVER sin importar este módulo
// directamente.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UsuarioCiudadano, UsuarioAdministrador])],
  providers: [
    IdentityService,
    { provide: PERFIL_ACCESO_RESOLVER, useExisting: IdentityService },
  ],
  exports: [PERFIL_ACCESO_RESOLVER],
})
export class IdentityModule {}
