import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dirección real de retiro + fotos del vecino al solicitar (Sprint 4).
 *
 * - `direccion_retiro`: texto que usa la empresa y el formulario del vecino.
 * - `foto_retiro`: una foto por tipo; el vecino guarda `antes` vía ArchivosService.
 *   La columna es `ruta_archivo` (relativa a uploads), no cifrada.
 */
export class SolicitudDireccionFotos1782164500000 implements MigrationInterface {
  name = 'SolicitudDireccionFotos1782164500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN direccion_retiro TEXT NULL AFTER descripcion
    `);

    await queryRunner.query(`
      CREATE TABLE foto_retiro (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        solicitud_retiro_id INT NOT NULL,
        ruta_archivo VARCHAR(500) NOT NULL,
        tipo_foto ENUM('antes', 'durante', 'despues') NOT NULL,
        hash_integridad VARCHAR(255) NULL,
        fecha_captura TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_foto_retiro_solicitud (solicitud_retiro_id),
        CONSTRAINT fk_foto_retiro_solicitud
          FOREIGN KEY (solicitud_retiro_id)
          REFERENCES solicitudes_retiro(id)
          ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS foto_retiro`);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro DROP COLUMN direccion_retiro
    `);
  }
}
