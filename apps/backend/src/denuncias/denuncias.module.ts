import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ArticuloMarketplace,
  AuditoriaModule,
  AuthModule,
  Denuncia,
  InteresadoMarketplace,
  MensajeMarketplace,
} from '../core';
import { DenunciasController } from './denuncias.controller';
import { DenunciasService } from './denuncias.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Denuncia,
      ArticuloMarketplace,
      InteresadoMarketplace,
      MensajeMarketplace,
    ]),
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [DenunciasController],
  providers: [DenunciasService],
})
export class DenunciasModule {}
