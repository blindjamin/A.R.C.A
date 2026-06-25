import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SesionAdministrador,
  SesionCiudadano,
  UsuarioAdministrador,
  UsuarioCiudadano,
} from './entities';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

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
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
