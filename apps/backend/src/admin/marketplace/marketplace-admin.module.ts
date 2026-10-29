import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticuloMarketplace, AuditoriaModule, AuthModule } from '../../core';
import { NotificacionesModule } from '../../notificaciones/notificaciones.module';
import { MarketplaceAdminController } from './marketplace-admin.controller';
import { MarketplaceAdminService } from './marketplace-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArticuloMarketplace]),
    AuthModule,
    AuditoriaModule,
    NotificacionesModule,
  ],
  controllers: [MarketplaceAdminController],
  providers: [MarketplaceAdminService],
  exports: [MarketplaceAdminService],
})
export class MarketplaceAdminModule {}
