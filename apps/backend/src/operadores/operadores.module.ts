import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule, UsuarioAdministrador } from '@arca/core';
import { OperadoresController } from './operadores.controller';
import { OperadoresService } from './operadores.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioAdministrador]), AuthModule],
  controllers: [OperadoresController],
  providers: [OperadoresService],
})
export class OperadoresModule {}
