import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule, ENTIDADES, HealthModule } from '@arca/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityModule } from './identity/identity.module';
import { SolicitudesAdminModule } from './solicitudes/solicitudes-admin.module';
import { AuditoriaAdminModule } from './auditoria/auditoria-admin.module';
import { MapaCalorModule } from './mapa-calor/mapa-calor.module';

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
      // Entidades explícitas, no autoLoadEntities: con autoLoadEntities, TypeORM
      // solo conoce las entidades que algún módulo registra vía forFeature(), y
      // acá no todas se registran (backend-admin no toca sesiones). Sin la
      // entidad relacionada completa, construir los metadatos de las relaciones
      // (p. ej. UsuarioCiudadano.sesiones) revienta al arrancar.
      entities: ENTIDADES,
      // El admin nunca corre migraciones — apps/backend/src/database/migrations/
      // sigue siendo el único dueño del esquema (regla A.7, área Base de datos).
      synchronize: false,
    }),
    IdentityModule,
    AuthModule,
    HealthModule,
    SolicitudesAdminModule,
    AuditoriaAdminModule,
    MapaCalorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
