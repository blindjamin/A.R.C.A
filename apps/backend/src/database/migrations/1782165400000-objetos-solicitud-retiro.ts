import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Varios objetos por solicitud de retiro (HU-01).
 *
 * Cada solicitud existente pasa a tener un objeto: el que ya guardaba en
 * `residuo_catalogo_id` o `nombre_residuo_otro`, con cantidad 1. Esas dos
 * columnas se quedan con el primer objeto, porque otras partes del sistema
 * todavía las leen.
 */
export class ObjetosSolicitudRetiro1782165400000 implements MigrationInterface {
  name = 'ObjetosSolicitudRetiro1782165400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE objetos_solicitud_retiro (
        id INT NOT NULL AUTO_INCREMENT,
        solicitud_retiro_id INT NOT NULL,
        residuo_catalogo_id INT NULL,
        nombre_otro VARCHAR(150) NULL,
        cantidad TINYINT UNSIGNED NOT NULL DEFAULT 1,
        orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        KEY idx_objetos_solicitud (solicitud_retiro_id, orden),
        CONSTRAINT fk_objetos_solicitud
          FOREIGN KEY (solicitud_retiro_id)
          REFERENCES solicitudes_retiro(id) ON DELETE CASCADE,
        CONSTRAINT fk_objetos_residuo
          FOREIGN KEY (residuo_catalogo_id)
          REFERENCES residuos_catalogo(id)
      )
    `);

    await queryRunner.query(`
      INSERT INTO objetos_solicitud_retiro
        (solicitud_retiro_id, residuo_catalogo_id, nombre_otro, cantidad, orden)
      SELECT id, residuo_catalogo_id, nombre_residuo_otro, 1, 0
      FROM solicitudes_retiro
      WHERE residuo_catalogo_id IS NOT NULL OR nombre_residuo_otro IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE objetos_solicitud_retiro`);
  }
}
