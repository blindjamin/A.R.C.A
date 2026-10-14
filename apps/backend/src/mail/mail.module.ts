import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SesionCiudadano } from '../core/entities/sesion-ciudadano.entity';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([SesionCiudadano])],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
