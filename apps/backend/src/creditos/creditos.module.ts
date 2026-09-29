import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransaccionCircularCredits } from '../core';
import { CreditosController } from './creditos.controller';
import { CreditosService } from './creditos.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransaccionCircularCredits])],
  controllers: [CreditosController],
  providers: [CreditosService],
  exports: [CreditosService],
})
export class CreditosModule {}
