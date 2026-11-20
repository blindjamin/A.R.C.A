import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule, SolicitudRetiro } from '../../core';
import { PagadasAdminController } from './pagadas-admin.controller';
import { PagadasAdminService } from './pagadas-admin.service';

// AuditoriaModule aporta el servicio de escritura con que se deja registro de
// cada descarga.
@Module({
  imports: [TypeOrmModule.forFeature([SolicitudRetiro]), AuditoriaModule],
  controllers: [PagadasAdminController],
  providers: [PagadasAdminService],
})
export class PagadasAdminModule {}
