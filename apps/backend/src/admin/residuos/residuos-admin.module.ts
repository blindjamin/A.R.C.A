import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResiduoCatalogo } from '../../core';
import { ResiduosAdminController } from './residuos-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResiduoCatalogo])],
  controllers: [ResiduosAdminController],
})
export class ResiduosAdminModule {}
