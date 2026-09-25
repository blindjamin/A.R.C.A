import { Module } from '@nestjs/common';
import { LimiteOrigenesService } from './limite-origenes.service';

// Protección de la ubicación en el Marketplace. El módulo del Marketplace
// (endpoints de artículos) lo importa y calcula cada banda con
// LimiteOrigenesService.bandaPara(), nunca con calcularBanda() directo, para
// que el límite de orígenes por vecino se aplique siempre.
@Module({
  providers: [LimiteOrigenesService],
  exports: [LimiteOrigenesService],
})
export class UbicacionMarketplaceModule {}
