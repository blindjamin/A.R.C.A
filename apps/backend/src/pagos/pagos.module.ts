import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditoriaModule,
  AuthModule,
  PagoWebpay,
  SolicitudRetiro,
} from '../core';
import { CreditosModule } from '../creditos/creditos.module';
import { CLIENTE_WEBPAY } from './cliente-webpay';
import { ClienteWebpayTransbank } from './cliente-webpay-transbank';
import { ConciliacionPagosService } from './conciliacion-pagos.service';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SolicitudRetiro, PagoWebpay]),
    AuthModule,
    AuditoriaModule,
    CreditosModule,
  ],
  controllers: [PagosController],
  providers: [
    PagosService,
    ConciliacionPagosService,
    { provide: CLIENTE_WEBPAY, useClass: ClienteWebpayTransbank },
  ],
})
export class PagosModule {}
