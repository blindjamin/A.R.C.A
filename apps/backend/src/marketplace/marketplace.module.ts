import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivosModule } from '../archivos/archivos.module';
import { ArticuloMarketplace, Calificacion } from '../core';
import { ResiduosModule } from '../residuos/residuos.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { UbicacionMarketplaceModule } from './ubicacion/ubicacion-marketplace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArticuloMarketplace, Calificacion]),
    ResiduosModule,
    ArchivosModule,
    UbicacionMarketplaceModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}
