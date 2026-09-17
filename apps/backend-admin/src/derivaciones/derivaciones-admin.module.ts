import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditoriaModule,
  AuthModule,
  LoteDerivacion,
  SolicitudRetiro,
} from '@arca/core';
import { DerivacionesAdminController } from './derivaciones-admin.controller';
import { DerivacionesAdminService } from './derivaciones-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudRetiro, LoteDerivacion]),
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [DerivacionesAdminController],
  providers: [DerivacionesAdminService],
})
export class DerivacionesAdminModule {}
