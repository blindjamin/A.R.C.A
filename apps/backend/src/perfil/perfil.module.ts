import { Module } from '@nestjs/common';
import { AuthModule } from '../core';
import { MailModule } from '../mail/mail.module';
import { PerfilController } from './perfil.controller';
import { PerfilService } from './perfil.service';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [PerfilController],
  providers: [PerfilService],
})
export class PerfilModule {}
