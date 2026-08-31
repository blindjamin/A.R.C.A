import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { ClaveUnicaController } from './clave-unica.controller';
import { ClaveUnicaService } from './clave-unica.service';
import { AuthGuard, RolesGuard } from './guards/auth.guard';

@Module({
  imports: [UsersModule],
  controllers: [ClaveUnicaController],
  providers: [
    ClaveUnicaService,
    AuthService,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [ClaveUnicaService, AuthService, RolesGuard],
})
export class AuthModule {}
