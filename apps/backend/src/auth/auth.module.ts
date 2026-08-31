import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthGuard, RolesGuard } from './guards/auth.guard';

@Module({
  imports: [UsersModule],
  providers: [
    AuthService,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
