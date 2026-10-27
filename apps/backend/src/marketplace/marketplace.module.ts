import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivosModule } from '../archivos/archivos.module';
import {
  ArticuloMarketplace,
  AuditoriaModule,
  AuthModule,
  Calificacion,
  InteresadoMarketplace,
  MensajeMarketplace,
} from '../core';
import { CreditosModule } from '../creditos/creditos.module';
import { PushModule } from '../push/push.module';
import { TiempoRealModule } from '../tiempo-real/tiempo-real.module';
import { ResiduosModule } from '../residuos/residuos.module';
import { ConservacionChatService } from './chat/conservacion-chat.service';
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
      InteresadoMarketplace,
      MensajeMarketplace,
    ]),
    AuthModule,
    AuditoriaModule,
    PushModule,
    TiempoRealModule,
    ResiduosModule,
    ArchivosModule,
    UbicacionMarketplaceModule,
    CreditosModule,
  ],
  controllers: [MarketplaceController, MarketplaceChatController],
  providers: [
    MarketplaceService,
    MarketplaceChatService,
    ConservacionChatService,
  ],
})
export class MarketplaceModule {}
