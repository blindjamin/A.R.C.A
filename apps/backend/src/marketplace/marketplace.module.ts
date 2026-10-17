import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivosModule } from '../archivos/archivos.module';
import {
  ArticuloMarketplace,
  AuthModule,
  Calificacion,
  MensajeMarketplace,
} from '../core';
import { CreditosModule } from '../creditos/creditos.module';
import { PushModule } from '../push/push.module';
import { ResiduosModule } from '../residuos/residuos.module';
import { MarketplaceChatController } from './chat/marketplace-chat.controller';
import { MarketplaceChatGateway } from './chat/marketplace-chat.gateway';
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
    AuthModule,
    PushModule,
    ResiduosModule,
    ArchivosModule,
    UbicacionMarketplaceModule,
    CreditosModule,
  ],
  controllers: [MarketplaceController, MarketplaceChatController],
  providers: [
    MarketplaceService,
    MarketplaceChatService,
    MarketplaceChatGateway,
  ],
})
export class MarketplaceModule {}
