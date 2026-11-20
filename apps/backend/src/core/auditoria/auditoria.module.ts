import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria } from '../entities/auditoria.entity';
import { AuditoriaService } from './auditoria.service';

/**
 * Registro auditable (HU-14), compartido por los dos backends.
 *
 * Solo expone el servicio de escritura. La consulta de los registros es del
 * panel municipal y vive en apps/backend-admin: la API ciudadana escribe
 * auditoría pero no tiene por qué poder leerla.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Auditoria])],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
