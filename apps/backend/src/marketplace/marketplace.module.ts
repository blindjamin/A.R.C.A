import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivosModule } from '../archivos/archivos.module';
import { ArticuloMarketplace, Calificacion, MensajeMarketplace } from '../core';
import { CreditosModule } from '../creditos/creditos.module';
import { ResiduosModule } from '../residuos/residuos.module';
import { MarketplaceChatController } from './chat/marketplace-chat.controller';
import { MarketplaceChatService } from './chat/marketplace-chat.service';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { UbicacionMarketplaceModule } from './ubicacion/ubicacion-marketplace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ArticuloMarketplace,
      Calificacion,
      MensajeMarketplace,
    ]),
    ResiduosModule,
    ArchivosModule,
    UbicacionMarketplaceModule,
    CreditosModule,
  ],
  controllers: [MarketplaceController, MarketplaceChatController],
  providers: [MarketplaceService, MarketplaceChatService],
})
export class MarketplaceModule {}
