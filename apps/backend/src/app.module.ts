import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule, ENTIDADES, HealthModule, SeguridadModule } from './core';
import { ResiduosModule } from './residuos/residuos.module';
import { SolicitudesRetiroModule } from './solicitudes-retiro/solicitudes-retiro.module';
import { UsersModule } from './users/users.module';
import { SolicitudesAdminModule } from './admin/solicitudes/solicitudes-admin.module';
import { MapaCalorModule } from './admin/mapa-calor/mapa-calor.module';
import { AuditoriaAdminModule } from './admin/auditoria/auditoria-admin.module';
import { ResiduosAdminModule } from './admin/residuos/residuos-admin.module';
import { DerivacionesAdminModule } from './admin/derivaciones/derivaciones-admin.module';
import { MetricasAdminModule } from './admin/metricas/metricas-admin.module';

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
      // acá no todas se registran (el panel no toca sesiones). Sin la entidad
      // relacionada completa, construir los metadatos de las relaciones
      // (p. ej. UsuarioCiudadano.sesiones) revienta al arrancar.
      entities: ENTIDADES,
      synchronize: false,
    }),
    // Antes que AuthModule: el rate limiting corta el abuso antes de resolver
    // la sesión (los guards globales corren en orden de registro).
    SeguridadModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ResiduosModule,
    SolicitudesRetiroModule,
    SolicitudesAdminModule,
    MapaCalorModule,
    AuditoriaAdminModule,
    ResiduosAdminModule,
    DerivacionesAdminModule,
    MetricasAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
