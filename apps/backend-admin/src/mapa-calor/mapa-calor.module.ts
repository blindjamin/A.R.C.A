import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudRetiro } from '@arca/core';
import { MapaCalorController } from './mapa-calor.controller';
import { MapaCalorService } from './mapa-calor.service';

@Module({
  imports: [TypeOrmModule.forFeature([SolicitudRetiro])],
  controllers: [MapaCalorController],
  providers: [MapaCalorService],
})
export class MapaCalorModule {}
