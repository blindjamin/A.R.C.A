import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule, AuthModule, Denuncia } from '../../core';
import { DenunciasAdminController } from './denuncias-admin.controller';
import { DenunciasAdminService } from './denuncias-admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Denuncia]), AuthModule, AuditoriaModule],
  controllers: [DenunciasAdminController],
  providers: [DenunciasAdminService],
})
export class DenunciasAdminModule {}
