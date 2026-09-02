import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResiduoCatalogo } from '@arca/core';
import { ResiduosController } from './residuos.controller';
import { ResiduosService } from './residuos.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResiduoCatalogo])],
  controllers: [ResiduosController],
  providers: [ResiduosService],
  exports: [ResiduosService],
})
export class ResiduosModule {}
