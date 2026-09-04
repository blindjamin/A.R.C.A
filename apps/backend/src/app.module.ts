import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule, HealthModule } from '@arca/core';
import { OperadoresModule } from './operadores/operadores.module';
import { ResiduosModule } from './residuos/residuos.module';
import { SolicitudesRetiroModule } from './solicitudes-retiro/solicitudes-retiro.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.local',
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      autoLoadEntities: true,
      synchronize: false,
    }),
    AuthModule,
    HealthModule,
    UsersModule,
    ResiduosModule,
    SolicitudesRetiroModule,
    OperadoresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
