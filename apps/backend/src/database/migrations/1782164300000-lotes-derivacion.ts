import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Derivación de solicitudes a la empresa operadora (spec `derivacion-excel`).
 *
 * - `lotes_derivacion`: cada vez que el panel genera el Excel.
 * - `solicitudes_retiro.lote_derivacion_id`: último lote en que salió la
 *   solicitud.
 *
 * El `down` borra los lotes; las solicitudes quedan en el estado que tengan.
 */
export class LotesDerivacion1782164300000 implements MigrationInterface {
  name = 'LotesDerivacion1782164300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE lotes_derivacion (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        generado_por_id VARCHAR(36) NOT NULL,
        cantidad INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_lotes_generado_por
          FOREIGN KEY (generado_por_id)
          REFERENCES usuarios_administradores(id)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        ADD COLUMN lote_derivacion_id INT NULL AFTER tomada_hasta,
        ADD INDEX idx_solicitudes_lote (lote_derivacion_id),
        ADD CONSTRAINT fk_solicitudes_lote
          FOREIGN KEY (lote_derivacion_id)
          REFERENCES lotes_derivacion(id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro DROP FOREIGN KEY fk_solicitudes_lote
    `);
    await queryRunner.query(`
      ALTER TABLE solicitudes_retiro
        DROP INDEX idx_solicitudes_lote,
        DROP COLUMN lote_derivacion_id
    `);
    await queryRunner.query(`DROP TABLE lotes_derivacion`);
  }
}
