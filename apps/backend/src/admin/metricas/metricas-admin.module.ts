import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuthModule,
  LoteDerivacion,
  RevisionSolicitud,
  SolicitudRetiro,
} from '@arca/core';
import { MetricasAdminController } from './metricas-admin.controller';
import { MetricasAdminService } from './metricas-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolicitudRetiro,
      RevisionSolicitud,
      LoteDerivacion,
    ]),
    AuthModule,
  ],
  controllers: [MetricasAdminController],
  providers: [MetricasAdminService],
})
export class MetricasAdminModule {}
