import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PERFIL_ACCESO_RESOLVER,
  SesionAdministrador,
  SesionCiudadano,
  UsuarioAdministrador,
  UsuarioCiudadano,
} from '@arca/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// @Global(): AuthModule (en @arca/core) inyecta PERFIL_ACCESO_RESOLVER sin
// importar este módulo directamente — un paquete compartido no puede depender
// de un módulo de una app específica. Alcanza con que UsersModule se importe
// una vez en el árbol (ver app.module.ts) para que el binding quede visible
// en toda la aplicación. Ver auth/interfaces/perfil-acceso-resolver.interface.ts.
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsuarioCiudadano,
      SesionCiudadano,
      UsuarioAdministrador,
      SesionAdministrador,
    ]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: PERFIL_ACCESO_RESOLVER, useExisting: UsersService },
  ],
  exports: [UsersService, PERFIL_ACCESO_RESOLVER, TypeOrmModule],
})
export class UsersModule {}
