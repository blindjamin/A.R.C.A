import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria, AuditoriaModule } from '@arca/core';
import { AuditoriaAdminController } from './auditoria-admin.controller';
import { AuditoriaAdminService } from './auditoria-admin.service';

// AuditoriaModule (de @arca/core) aporta el servicio de escritura, que este
// controlador usa para dejar registro de quién consultó la auditoría.
// AuditoriaAdminService es la lectura, y vive acá porque es del panel: la API
// ciudadana escribe auditoría pero no debe poder leerla.
@Module({
  imports: [TypeOrmModule.forFeature([Auditoria]), AuditoriaModule],
  controllers: [AuditoriaAdminController],
  providers: [AuditoriaAdminService],
})
export class AuditoriaAdminModule {}
