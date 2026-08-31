import { Module } from '@nestjs/common';
import { ClaveUnicaController } from './clave-unica.controller';
import { ClaveUnicaService } from './clave-unica.service';

@Module({
  controllers: [ClaveUnicaController],
  providers: [ClaveUnicaService],
  exports: [ClaveUnicaService],
})
export class AuthModule {}
