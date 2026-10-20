import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaModule, AuthModule, ContactoCiudadano } from '../core';
import { MailModule } from '../mail/mail.module';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactoCiudadano]),
    AuthModule,
    AuditoriaModule,
    MailModule,
  ],
  controllers: [PerfilController],
  providers: [PerfilService],
})
export class PerfilModule {}
